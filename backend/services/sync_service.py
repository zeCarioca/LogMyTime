from datetime import datetime
from sqlalchemy.orm import Session
from models import TimeEntry, CommitLink, CommitStatus, User, GithubRepository
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
            return {'success': True, 'commit_link_id': commit_link.id}
        else:
            return {'success': False, 'error': sync_res.get('error', 'GitHub API push failed')}
