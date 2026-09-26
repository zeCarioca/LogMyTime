from datetime import datetime
from sqlalchemy.orm import Session
from models import TimeEntry, CommitLink, CommitStatus, GithubRepository, User
from services.github_service import GitHubService

class PairingService:
    @staticmethod
    async def poll_and_pair(db: Session, user: User) -> list[CommitLink]:
        gh = GitHubService(user.access_token)
        created_links = []

        active_repos = db.query(GithubRepository).filter(
            GithubRepository.user_id == user.id,
            GithubRepository.is_active == True
        ).all()

        for repo in active_repos:
            try:
                raw_commits = await gh.get_commits(
                    repo_full_name=repo.full_name,
                    branch=repo.default_branch,
                    per_page=10,
                    author=user.github_username
                )
            except Exception:
                continue

            for c in raw_commits:
                sha = c.get('sha', '')
                if not sha:
                    continue

                # Check if commit already processed
                existing_link = db.query(CommitLink).filter(CommitLink.commit_sha == sha).first()
                if existing_link:
                    continue

                # Find most recent unsynced TimeEntry for this repo
                matched_entry = db.query(TimeEntry).filter(
                    TimeEntry.repo_id == repo.id,
                    TimeEntry.is_synced == False
                ).order_by(TimeEntry.created_at.desc()).first()

                if not matched_entry:
                    continue

                # Make sure entry isn't already paired in a pending link
                already_paired = db.query(CommitLink).filter(
                    CommitLink.time_entry_id == matched_entry.id,
                    CommitLink.status == CommitStatus.pending
                ).first()

                if already_paired:
                    continue

                commit_info = c.get('commit', {})
                commit_msg = commit_info.get('message', '').split('\n')[0]
                commit_date_str = commit_info.get('author', {}).get('date', '')

                try:
                    commit_date = datetime.strptime(commit_date_str, '%Y-%m-%dT%H:%M:%SZ')
                except Exception:
                    commit_date = datetime.utcnow()

                new_link = CommitLink(
                    time_entry_id=matched_entry.id,
                    repo_id=repo.id,
                    commit_sha=sha,
                    commit_message=commit_msg,
                    commit_date=commit_date,
                    status=CommitStatus.pending
                )
                db.add(new_link)
                db.commit()
                created_links.append(new_link)

        return created_links
