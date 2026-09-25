from flask import Blueprint, request, redirect, url_for, flash, jsonify
from models import db, GithubRepository
from services.github_service import GitHubService
from services.preference_service import load_archive_preferences, save_archive_preference
from routes.auth_routes import get_current_user

repo_bp = Blueprint('repos', __name__)


def refresh_user_repos(user):
    """Fetch repos from GitHub and synchronize with GithubRepository records."""
    gh = GitHubService(user.access_token)
    gh_repos = gh.get_user_repositories()
    existing_map = {r.full_name: r for r in user.repositories}
    archived_names = load_archive_preferences()

    for repo_data in gh_repos:
        full_name = repo_data.get('full_name')
        default_branch = repo_data.get('default_branch', 'main')
        if full_name not in existing_map:
            is_active = full_name not in archived_names
            new_repo = GithubRepository(
                user_id=user.id,
                full_name=full_name,
                default_branch=default_branch,
                is_active=is_active
            )
            db.session.add(new_repo)
    db.session.commit()


@repo_bp.route('/repos/refresh', methods=['POST'])
def refresh_repositories():
    user = get_current_user()
    if not user:
        flash('Please login with GitHub first.', 'warning')
        return redirect(url_for('main.index'))

    try:
        refresh_user_repos(user)
        flash('Repositories refreshed successfully from GitHub!', 'success')
    except Exception as e:
        flash(f'Failed to refresh repositories: {str(e)}', 'danger')

    return redirect(url_for('main.index'))


@repo_bp.route('/repos/<int:repo_id>/toggle-visibility', methods=['POST'])
def toggle_repo_visibility(repo_id):
    """Toggle between active and hidden (archived) status for a repository."""
    user = get_current_user()
    if not user:
        if request.is_json:
            return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401
        flash('Unauthorized', 'danger')
        return redirect(url_for('main.index'))

    repo = GithubRepository.query.filter_by(id=repo_id, user_id=user.id).first()
    if not repo:
        if request.is_json:
            return jsonify({'status': 'error', 'message': 'Repository not found'}), 404
        flash('Repository not found', 'danger')
        return redirect(url_for('main.index'))

    # Toggle state
    repo.is_active = not repo.is_active
    db.session.commit()

    # Persist preference to local JSON file
    save_archive_preference(repo.full_name, is_archived=(not repo.is_active))

    action_label = 'unhidden' if repo.is_active else 'hidden and moved to Archive'
    if request.is_json:
        return jsonify({
            'status': 'success',
            'is_active': repo.is_active,
            'message': f'{repo.full_name} has been {action_label}.'
        })

    flash(f'{repo.full_name} has been {action_label}.', 'info')
    return redirect(url_for('main.index'))
