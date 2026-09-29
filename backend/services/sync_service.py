from datetime import datetime

from sqlalchemy.orm import Session

from models import CommitLink, CommitStatus, GithubRepository, TimeEntry, User
from services.github_service import GitHubService


class SyncService:
    @staticmethod
    async def sync_on_confirm(db: Session, commit_link: CommitLink, user: User) -> dict:
        if commit_link.status != CommitStatus.pending:
            return {'success': False, 'error': f'Commit link status is already {commit_link.status}'}

        time_entry = db.query(TimeEntry).filter(TimeEntry.id == commit_link.time_entry_id).first()
        repo = db.query(GithubRepository).filter(GithubRepository.id == commit_link.repo_id).first()

        if not time_entry or not repo:
            return {'success': False, 'error': 'Time entry or repository not found'}

        gh = GitHubService(user.access_token)
        sync_res = await gh.sync_timesheet(
            repo_full_name=repo.full_name,
            pending_entries=[time_entry],
            branch='timelogs',
            base_branch=repo.default_branch
        )

        if sync_res.get('success'):
            now = datetime.utcnow()
            time_entry.is_synced = True
            time_entry.synced_at = now
            commit_link.status = CommitStatus.confirmed
            db.commit()
            SyncService.update_local_timelogs_json(db, user)
            return {'success': True, 'commit_link_id': commit_link.id}
        else:
            return {'success': False, 'error': sync_res.get('error', 'GitHub API push failed')}

    @staticmethod
    def update_local_timelogs_json(db: Session, user: User) -> str:
        import json
        from pathlib import Path

        entries = db.query(TimeEntry).join(TimeEntry.repository).filter(
            TimeEntry.repository.has(user_id=user.id)
        ).order_by(TimeEntry.created_at.desc()).all()

        total_seconds = sum(e.total_seconds for e in entries)
        now_iso = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

        payload = {
            'user': user.github_username,
            'last_updated_at': now_iso,
            'total_logged_seconds': total_seconds,
            'total_logged_minutes': round(total_seconds / 60.0, 1),
            'total_entries': len(entries),
            'entries': [
                {
                    'id': e.id,
                    'task_description': e.task_description,
                    'duration_seconds': e.total_seconds,
                    'duration_minutes': e.duration_minutes or round(e.total_seconds / 60.0, 2),
                    'commit_sha': e.commit_sha,
                    'repo_name': e.repository.full_name if e.repository else None,
                    'is_synced': e.is_synced,
                    'synced_at': e.synced_at.strftime('%Y-%m-%dT%H:%M:%SZ') if e.synced_at else None,
                    'created_at': e.created_at.strftime('%Y-%m-%dT%H:%M:%SZ') if e.created_at else None
                }
                for e in entries
            ]
        }

        # Save to backend/instance/timelogs.json
        instance_dir = Path(__file__).resolve().parent.parent / 'instance'
        instance_dir.mkdir(parents=True, exist_ok=True)
        local_json_path = instance_dir / 'timelogs.json'

        with open(local_json_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2)

        # Also save to user.local_repo_path / 'timelogs.json' if directory exists
        if user.local_repo_path and Path(user.local_repo_path).is_dir():
            repo_json_path = Path(user.local_repo_path) / 'timelogs.json'
            try:
                with open(repo_json_path, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, indent=2)
            except Exception:
                pass

        return str(local_json_path)

