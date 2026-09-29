from datetime import datetime
import logging
from sqlalchemy.orm import Session

from models.branch_commit import BranchCommit
from models.repository import GithubRepository
from models.user import User
from services.github_service import GitHubService

logger = logging.getLogger(__name__)


class BranchCommitService:
    @staticmethod
    def _parse_iso_datetime(date_str: str | None) -> datetime | None:
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00')).replace(tzinfo=None)
        except Exception:
            return None

    @staticmethod
    async def sync_branch_commits_for_repo(
        db: Session,
        user: User,
        repo: GithubRepository,
        commits_per_branch: int = 30
    ) -> list[BranchCommit]:
        if not user.access_token:
            return []

        gh = GitHubService(user.access_token)
        try:
            branches = await gh.get_branches(repo.full_name)
        except Exception as e:
            logger.error(f"Error fetching branches for {repo.full_name}: {e}")
            return []

        stored_commits: list[BranchCommit] = []

        for b in branches:
            branch_name = b.get('name')
            if not branch_name:
                continue

            try:
                raw_commits = await gh.get_commits(
                    repo_full_name=repo.full_name,
                    branch=branch_name,
                    per_page=commits_per_branch
                )
            except Exception as e:
                logger.error(f"Error fetching commits for {repo.full_name}@{branch_name}: {e}")
                continue

            for c in raw_commits:
                sha = c.get('sha')
                if not sha:
                    continue

                commit_data = c.get('commit', {})
                msg = commit_data.get('message', '').split('\n')[0]
                author_data = commit_data.get('author', {})
                author = author_data.get('name', 'Developer')
                raw_date = author_data.get('date', '')
                dt = BranchCommitService._parse_iso_datetime(raw_date)

                existing = db.query(BranchCommit).filter(
                    BranchCommit.repo_id == repo.id,
                    BranchCommit.branch_name == branch_name,
                    BranchCommit.commit_sha == sha
                ).first()

                if not existing:
                    new_item = BranchCommit(
                        repo_id=repo.id,
                        branch_name=branch_name,
                        commit_sha=sha,
                        short_sha=sha[:7],
                        message=msg or "Commit",
                        author=author,
                        commit_date=dt,
                        fetched_at=datetime.utcnow()
                    )
                    db.add(new_item)
                    stored_commits.append(new_item)
                else:
                    stored_commits.append(existing)

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error saving branch commits to database: {e}")

        return stored_commits

    @staticmethod
    async def get_branches_with_commits(
        db: Session,
        user: User,
        repo_id: int | None = None,
        refresh: bool = False
    ) -> list[dict]:
        query = db.query(GithubRepository).filter(
            GithubRepository.user_id == user.id,
            GithubRepository.is_active == True
        )
        if repo_id:
            query = query.filter(GithubRepository.id == repo_id)

        active_repos = query.all()
        if not active_repos:
            return []

        if refresh:
            for repo in active_repos:
                await BranchCommitService.sync_branch_commits_for_repo(db, user, repo)

        results = []
        for repo in active_repos:
            branch_names = [
                row[0] for row in db.query(BranchCommit.branch_name)
                .filter(BranchCommit.repo_id == repo.id)
                .distinct()
                .all()
            ]

            # If no cached commits yet, perform initial sync
            if not branch_names and not refresh:
                await BranchCommitService.sync_branch_commits_for_repo(db, user, repo)
                branch_names = [
                    row[0] for row in db.query(BranchCommit.branch_name)
                    .filter(BranchCommit.repo_id == repo.id)
                    .distinct()
                    .all()
                ]

            for b_name in branch_names:
                commits = db.query(BranchCommit).filter(
                    BranchCommit.repo_id == repo.id,
                    BranchCommit.branch_name == b_name
                ).order_by(BranchCommit.commit_date.desc().nullslast()).all()

                commit_items = [
                    {
                        'sha': c.commit_sha,
                        'short_sha': c.short_sha or c.commit_sha[:7],
                        'message': c.message or 'Commit',
                        'author': c.author or 'Developer',
                        'date': c.commit_date.isoformat() if c.commit_date else '',
                        'repo_name': repo.full_name,
                        'repo_id': repo.id,
                        'branch': b_name,
                    }
                    for c in commits
                ]

                results.append({
                    'branch': b_name,
                    'commits': commit_items
                })

        return results
