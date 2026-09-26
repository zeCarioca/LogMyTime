import csv
import io
from datetime import datetime
from flask import Blueprint, jsonify, Response, request
from models import db, GithubRepository, TimeEntry
from services.github_service import GitHubService
from services.preference_service import get_selected_repository, set_selected_repository
from routes.auth_routes import get_current_user

data_bp = Blueprint('data', __name__)


@data_bp.route('/data/hierarchy', methods=['GET'])
def get_hierarchy():
    """
    Returns structured hierarchy:
    Repository -> UserList (defaults to current user) -> Commits -> Time -> Date
    """
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    repo_id_filter = request.args.get('repo_id', type=int)
    repo_name_filter = request.args.get('repo', type=str)
    
    repos_query = GithubRepository.query.filter_by(user_id=user.id)
    if repo_id_filter:
        repos_query = repos_query.filter_by(id=repo_id_filter)
    elif repo_name_filter:
        repos_query = repos_query.filter_by(full_name=repo_name_filter.strip())
    repos = repos_query.order_by(GithubRepository.full_name.asc()).all()

    gh = GitHubService(user.access_token)
    hierarchy = []

    for repo in repos:
        # Fetch recent commits for the repository
        raw_commits = []
        try:
            raw_commits = gh.get_commits(repo.full_name, branch=repo.default_branch, per_page=15, author=user.github_username)
        except Exception:
            raw_commits = []

        # Map commits
        commits_data = []
        for c in raw_commits:
            commit_info = c.get('commit', {})
            author_info = commit_info.get('author', {})
            commits_data.append({
                'sha': c.get('sha', '')[:7],
                'full_sha': c.get('sha', ''),
                'message': commit_info.get('message', '').split('\n')[0],
                'date': author_info.get('date', ''),
                'url': c.get('html_url', '')
            })

        # Fetch time entries associated with this repo
        time_entries = (
            TimeEntry.query.filter_by(repo_id=repo.id)
            .order_by(TimeEntry.created_at.desc())
            .all()
        )

        entries_data = []
        for entry in time_entries:
            entries_data.append({
                'id': entry.id,
                'task_description': entry.task_description,
                'duration_seconds': entry.total_seconds,
                'duration_minutes': round(entry.total_seconds / 60.0, 2),
                'formatted_duration': entry.formatted_duration,
                'is_synced': entry.is_synced,
                'date': entry.created_at.strftime('%Y-%m-%d'),
                'timestamp': entry.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'synced_at': entry.synced_at.strftime('%Y-%m-%d %H:%M:%S') if entry.synced_at else None
            })

        repo_node = {
            'repository_id': repo.id,
            'repository': repo.full_name,
            'default_branch': repo.default_branch,
            'is_active': repo.is_active,
            'user_list': [
                {
                    'username': user.github_username,
                    'is_current_user': True,
                    'avatar_url': user.avatar_url,
                    'commits': commits_data,
                    'time_records': entries_data,
                    'summary': {
                        'total_seconds': sum(e['duration_seconds'] for e in entries_data),
                        'total_minutes': round(sum(e['duration_seconds'] for e in entries_data) / 60.0, 2),
                        'total_entries': len(entries_data),
                        'total_commits': len(commits_data)
                    }
                }
            ]
        }
        hierarchy.append(repo_node)

    return jsonify({
        'current_user': user.github_username,
        'selected_repository': get_selected_repository(),
        'repositories_count': len(hierarchy),
        'hierarchy': hierarchy
    })


@data_bp.route('/data/preference/selected-repo', methods=['POST'])
def update_selected_repo_preference():
    """Save selected repository into user preferences."""
    user = get_current_user()
    if not user:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

    payload = request.get_json(silent=True) or {}
    repo_full_name = payload.get('repository', '').strip()

    set_selected_repository(repo_full_name)
    return jsonify({
        'status': 'success',
        'selected_repository': repo_full_name,
        'message': f'Preference updated to {repo_full_name or "all repositories"}'
    })


@data_bp.route('/data/export/csv', methods=['GET'])
def export_csv():
    """
    Exports a clean CSV containing:
    repository, user, commit_sha, commit_message, task_description, duration_seconds, duration_minutes, is_synced, date, timestamp
    Suitable for pandas / python data analysis.
    """
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    repo_id_filter = request.args.get('repo_id', type=int)
    repo_name_filter = request.args.get('repo', type=str)
    repos_query = GithubRepository.query.filter_by(user_id=user.id)
    if repo_id_filter:
        repos_query = repos_query.filter_by(id=repo_id_filter)
    elif repo_name_filter:
        repos_query = repos_query.filter_by(full_name=repo_name_filter.strip())
    repos = repos_query.order_by(GithubRepository.full_name.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header for Python / Pandas data analysis
    writer.writerow([
        'repository',
        'user',
        'entry_id',
        'task_description',
        'duration_seconds',
        'duration_minutes',
        'is_synced',
        'synced_at',
        'date',
        'timestamp'
    ])

    for repo in repos:
        entries = (
            TimeEntry.query.filter_by(repo_id=repo.id)
            .order_by(TimeEntry.created_at.asc())
            .all()
        )
        for e in entries:
            writer.writerow([
                repo.full_name,
                user.github_username,
                e.id,
                e.task_description,
                e.total_seconds,
                round(e.total_seconds / 60.0, 2),
                e.is_synced,
                e.synced_at.strftime('%Y-%m-%d %H:%M:%S') if e.synced_at else '',
                e.created_at.strftime('%Y-%m-%d'),
                e.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])

    output.seek(0)
    filename = f"logmytime_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )
