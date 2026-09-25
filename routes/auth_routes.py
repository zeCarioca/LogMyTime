import os
from urllib.parse import urlencode
from flask import Blueprint, redirect, url_for, session, flash, request
import requests

from models import db, User
from services.github_service import GitHubService

auth_bp = Blueprint('auth', __name__)

GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'


def get_current_user():
    """Helper to retrieve authenticated user from session or fallback dev user."""
    user_id = session.get('user_id')
    if user_id:
        return User.query.get(user_id)
    return User.query.first()


@auth_bp.route('/login')
def login():
    client_id = os.getenv('GITHUB_CLIENT_ID', '').strip()
    if not client_id or client_id == 'your_github_client_id_here':
        flash('GitHub Client ID is not configured. Please add GITHUB_CLIENT_ID to your .env file.', 'warning')
        return redirect(url_for('main.index'))

    params = {
        'client_id': client_id,
        'scope': 'repo user:email',
        'redirect_uri': url_for('auth.callback', _external=True)
    }
    return redirect(f"{GITHUB_AUTH_URL}?{urlencode(params)}")


@auth_bp.route('/callback')
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

    # Automatically refresh repositories upon login
    from routes.repo_routes import refresh_user_repos
    refresh_user_repos(user)
    return redirect(url_for('main.index'))


@auth_bp.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('You have logged out.', 'info')
    return redirect(url_for('main.index'))
