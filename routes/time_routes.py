from datetime import datetime
from flask import Blueprint, request, redirect, url_for, flash, jsonify
from models import db, GithubRepository, TimeEntry
from services.github_service import GitHubService
from routes.auth_routes import get_current_user

time_bp = Blueprint('time', __name__)


@time_bp.route('/log-time', methods=['POST'])
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
                branch='timelogs',
                base_branch=repo.default_branch
            )

            if sync_result.get('success'):
                now = datetime.utcnow()
                for entry in unsynced_entries:
                    entry.is_synced = True
                    entry.synced_at = now
                db.session.commit()
                flash(
                    f'🎉 60-Minute threshold reached ({total_unsynced_minutes} min)! Automatically synced to {repo.full_name} on branch `timelogs` (TimeLogs/timesheet.json).',
                    'success'
                )
            else:
                status_code = sync_result.get('status_code')
                if status_code == 401:
                    flash('GitHub token has expired or is invalid. Please sign out and sign in with GitHub again.', 'danger')
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


@time_bp.route('/api/sync-manual/<int:repo_id>', methods=['POST'])
def manual_sync(repo_id):
    """Trigger GitHub sync manually on demand."""
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
            branch='timelogs',
            base_branch=repo.default_branch
        )
        if sync_result.get('success'):
            now = datetime.utcnow()
            for entry in unsynced_entries:
                entry.is_synced = True
                entry.synced_at = now
            db.session.commit()
            return jsonify({
                'status': 'success',
                'message': f'Synced {len(unsynced_entries)} entries to {repo.full_name} on branch `timelogs` (TimeLogs/timesheet.json)'
            })
        else:
            status_code = sync_result.get('status_code', 500)
            if status_code == 401:
                return jsonify({
                    'status': 'error',
                    'message': 'GitHub token has expired or is invalid. Please sign out and sign in with GitHub again.'
                }), 401
            return jsonify({'status': 'error', 'message': sync_result.get('error')}), status_code
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@time_bp.route('/delete-entry/<int:entry_id>')
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
