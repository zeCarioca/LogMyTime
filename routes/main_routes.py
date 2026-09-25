import os
from datetime import datetime
from urllib.parse import urlencode
from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
import requests

from models import db, User, GithubRepository, TimeEntry
from services.github_service import GitHubService

main_bp = Blueprint('main', __name__)

GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'


def get_current_user():
    """Helper to retrieve authenticated user from session or fallback dev user."""
    user_id = session.get('user_id')
    if user_id:
        return User.query.get(user_id)
    # Check if there is an existing user in DB
    user = User.query.first()
    return user


# -----------------
# Authentication
# -----------------
@main_bp.route('/login')
def login():
    client_id = os.getenv('GITHUB_CLIENT_ID', '').strip()
    if not client_id or client_id == 'your_github_client_id_here':
        flash('GitHub Client ID is not configured. Please add GITHUB_CLIENT_ID to your .env file.', 'warning')
        return redirect(url_for('main.index'))

    params = {
        'client_id': client_id,
        'scope': 'repo user:email',
        'redirect_uri': url_for('main.callback', _external=True)
    }
    return redirect(f"{GITHUB_AUTH_URL}?{urlencode(params)}")


@main_bp.route('/callback')
def callback():
    code = request.args.get('code')
    if not code:
        flash('Authentication failed: Missing code parameter.', 'danger')
        return redirect(url_for('main.index'))

    client_id = os.getenv('GITHUB_CLIENT_ID', '').strip()
    client_secret = os.getenv('GITHUB_CLIENT_SECRET', '').strip()

    # Exchange code for access token
    headers = {'Accept': 'application/json'}
    data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code
    }
    res = requests.post(GITHUB_TOKEN_URL, headers=headers, json=data, timeout=10)
    token_json = res.json()
    access_token = token_json.get('access_token')

    if not access_token:
        error_desc = token_json.get('error_description', 'Failed to retrieve access token.')
        flash(f'GitHub OAuth Error: {error_desc}', 'danger')
        return redirect(url_for('main.index'))

    # Fetch user info with the token
    gh = GitHubService(access_token)
    user_info = gh.get_authenticated_user()
    if not user_info:
        flash('Could not fetch user profile from GitHub.', 'danger')
        return redirect(url_for('main.index'))

    gh_user_id = str(user_info['id'])
    gh_username = user_info.get('login', 'unknown')
    avatar_url = user_info.get('avatar_url')

    user = User.query.filter_by(github_user_id=gh_user_id).first()
    if not user:
        user = User(
            github_user_id=gh_user_id,
            github_username=gh_username,
            access_token=access_token,
            avatar_url=avatar_url
        )
        db.session.add(user)
    else:
        user.access_token = access_token
        user.github_username = gh_username
        user.avatar_url = avatar_url

    db.session.commit()
    session['user_id'] = user.id
    flash(f'Welcome back, @{user.github_username}!', 'success')

    # Automatically refresh repositories
    refresh_user_repos(user)
    return redirect(url_for('main.index'))


@main_bp.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('You have logged out.', 'info')
    return redirect(url_for('main.index'))


# -----------------
# Dashboard
# -----------------
@main_bp.route('/')
def index():
    user = get_current_user()
    repositories = []
    recent_entries = []

    if user:
        repositories = GithubRepository.query.filter_by(user_id=user.id).order_by(GithubRepository.full_name.asc()).all()
        # Fetch recent logs across repositories
        recent_entries = (
            TimeEntry.query.join(GithubRepository)
            .filter(GithubRepository.user_id == user.id)
            .order_by(TimeEntry.created_at.desc())
            .limit(25)
            .all()
        )

    # Check OAuth configuration status
    client_id = os.getenv('GITHUB_CLIENT_ID', '').strip()
    is_oauth_configured = bool(client_id and client_id != 'your_github_client_id_here')

    return render_template(
        'index.html',
        user=user,
        repositories=repositories,
        recent_entries=recent_entries,
        is_oauth_configured=is_oauth_configured
    )


# -----------------
# Repositories
# -----------------
def refresh_user_repos(user):
    """Fetch repos from GitHub and synchronize with GithubRepository records."""
    gh = GitHubService(user.access_token)
    gh_repos = gh.get_user_repositories()
    existing_map = {r.full_name: r for r in user.repositories}

    for repo_data in gh_repos:
        full_name = repo_data.get('full_name')
        default_branch = repo_data.get('default_branch', 'main')
        if full_name not in existing_map:
            new_repo = GithubRepository(
                user_id=user.id,
                full_name=full_name,
                default_branch=default_branch
            )
            db.session.add(new_repo)
    db.session.commit()


@main_bp.route('/repos/refresh', methods=['POST'])
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


# -----------------
# Time Logging & Sync Logic
# -----------------
@main_bp.route('/log-time', methods=['POST'])
def log_time():
    user = get_current_user()
    if not user:
        flash('Please login to log time.', 'warning')
        return redirect(url_for('main.index'))

    repo_id = request.form.get('repo_id', type=int)
    task_description = request.form.get('task_description', '').strip()
    duration_seconds = request.form.get('duration_seconds', type=int)
    duration_minutes = request.form.get('duration_minutes', type=int)

    if not duration_seconds or duration_seconds <= 0:
        if duration_minutes and duration_minutes > 0:
            duration_seconds = duration_minutes * 60
        else:
            duration_seconds = 0

    if duration_seconds > 0 and (not duration_minutes or duration_minutes == 0):
        duration_minutes = max(1, round(duration_seconds / 60.0))

    if not repo_id or not task_description or duration_seconds <= 0:
        flash('Please select a repository, enter a task description, and provide time.', 'danger')
        return redirect(url_for('main.index'))

    repo = GithubRepository.query.filter_by(id=repo_id, user_id=user.id).first()
    if not repo:
        flash('Selected repository was not found.', 'danger')
        return redirect(url_for('main.index'))

    # 1. Save entry locally with is_synced = False
    new_entry = TimeEntry(
        repo_id=repo.id,
        task_description=task_description,
        duration_seconds=duration_seconds,
        duration_minutes=duration_minutes,
        is_synced=False
    )
    db.session.add(new_entry)
    db.session.commit()

    # 2. Check total unsynced duration in seconds (60 mins = 3600 seconds)
    unsynced_entries = TimeEntry.query.filter_by(repo_id=repo.id, is_synced=False).all()
    total_unsynced_seconds = sum(e.total_seconds for e in unsynced_entries)
    total_unsynced_minutes = round(total_unsynced_seconds / 60.0, 1)

    # 3. Conditional sync threshold: >= 60 minutes (3600 seconds)
    if total_unsynced_seconds >= 3600:
        gh = GitHubService(user.access_token)
        try:
            sync_result = gh.sync_timesheet(
                repo_full_name=repo.full_name,
                pending_entries=unsynced_entries,
                branch=repo.default_branch
            )

            if sync_result.get('success'):
                now = datetime.utcnow()
                # Safe database transaction
                for entry in unsynced_entries:
                    entry.is_synced = True
                    entry.synced_at = now
                db.session.commit()
                flash(
                    f'🎉 60-Minute threshold reached ({total_unsynced_minutes} min)! Automatically synced to {repo.full_name}/timesheet.json via GitHub API.',
                    'success'
                )
            else:
                error_msg = sync_result.get('error', 'GitHub API error')
                flash(
                    f'Threshold reached ({total_unsynced_minutes} min), but GitHub sync encountered an issue: {error_msg}. Time remains saved locally.',
                    'warning'
                )
        except Exception as e:
            flash(
                f'Threshold reached ({total_unsynced_minutes} min), but an error occurred during sync: {str(e)}.',
                'warning'
            )
    else:
        remaining = 60 - total_unsynced_minutes
        flash(
            f'Logged {duration_minutes} min for {repo.full_name}. ({total_unsynced_minutes}/60 min logged — syncs automatically at 60 min, {remaining} min remaining).',
            'info'
        )

    return redirect(url_for('main.index'))


@main_bp.route('/api/sync-manual/<int:repo_id>', methods=['POST'])
def manual_sync(repo_id):
    """Optional route to trigger GitHub sync manually on demand."""
    user = get_current_user()
    if not user:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

    repo = GithubRepository.query.filter_by(id=repo_id, user_id=user.id).first()
    if not repo:
        return jsonify({'status': 'error', 'message': 'Repo not found'}), 404

    unsynced_entries = TimeEntry.query.filter_by(repo_id=repo.id, is_synced=False).all()
    if not unsynced_entries:
        return jsonify({'status': 'info', 'message': 'No unsynced entries for this repository.'})

    gh = GitHubService(user.access_token)
    try:
        sync_result = gh.sync_timesheet(
            repo_full_name=repo.full_name,
            pending_entries=unsynced_entries,
            branch=repo.default_branch
        )
        if sync_result.get('success'):
            now = datetime.utcnow()
            for entry in unsynced_entries:
                entry.is_synced = True
                entry.synced_at = now
            db.session.commit()
            return jsonify({
                'status': 'success',
                'message': f'Synced {len(unsynced_entries)} entries to {repo.full_name}/timesheet.json'
            })
        else:
            return jsonify({'status': 'error', 'message': sync_result.get('error')}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@main_bp.route('/delete-entry/<int:entry_id>')
def delete_entry(entry_id):
    user = get_current_user()
    if not user:
        flash('Unauthorized', 'danger')
        return redirect(url_for('main.index'))

    entry = TimeEntry.query.join(GithubRepository).filter(
        TimeEntry.id == entry_id,
        GithubRepository.user_id == user.id
    ).first_or_404()

    db.session.delete(entry)
    db.session.commit()
    flash('Time entry deleted.', 'info')
    return redirect(url_for('main.index'))
