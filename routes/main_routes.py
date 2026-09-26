import os
from flask import Blueprint, render_template
from models import db, GithubRepository, TimeEntry
from services.preference_service import load_archive_preferences, get_selected_repository
from routes.auth_routes import get_current_user

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    user = get_current_user()
    active_repositories = []
    archived_repositories = []
    recent_entries = []

    if user:
        archived_names = load_archive_preferences()
        all_repos = GithubRepository.query.filter_by(user_id=user.id).order_by(GithubRepository.full_name.asc()).all()

        # Synchronize repository status with local archive_preferences.json
        needs_commit = False
        for r in all_repos:
            expected_active = r.full_name not in archived_names
            if r.is_active != expected_active:
                r.is_active = expected_active
                needs_commit = True
        if needs_commit:
            db.session.commit()

        active_repositories = [r for r in all_repos if r.is_active]
        archived_repositories = [r for r in all_repos if not r.is_active]

        # Fetch recent logs across repositories
        recent_entries = (
            TimeEntry.query.join(GithubRepository)
            .filter(GithubRepository.user_id == user.id)
            .order_by(TimeEntry.created_at.desc())
            .limit(25)
            .all()
        )

    client_id = os.getenv('GITHUB_CLIENT_ID', '').strip()
    is_oauth_configured = bool(client_id and client_id != 'your_github_client_id_here')
    selected_repo = get_selected_repository() if user else ''

    return render_template(
        'index.html',
        user=user,
        repositories=active_repositories,
        active_repositories=active_repositories,
        archived_repositories=archived_repositories,
        recent_entries=recent_entries,
        is_oauth_configured=is_oauth_configured,
        selected_repo=selected_repo
    )
