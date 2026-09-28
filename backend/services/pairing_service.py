from datetime import datetime
from sqlalchemy.orm import Session
from models import TimeEntry, CommitLink, CommitStatus, GithubRepository, User
from services.github_service import GitHubService
from services.git_service import GitService

class PairingService:
    @staticmethod
    async def poll_and_pair(db: Session, user: User) -> list[CommitLink]:
        # Automatic pairing by recent commits removed per specification
        return []

    @staticmethod
    async def fetch_recent_commits(db: Session, user: User) -> list[dict]:
        gh = GitHubService(user.access_token) if user.access_token else None
        all_commits = []

        active_repos = db.query(GithubRepository).filter(
            GithubRepository.user_id == user.id,
            GithubRepository.is_active == True
        ).all()

        for repo in active_repos:
            raw_commits = []
            if gh and user.access_token:
                try:
                    raw_commits = await gh.get_commits(
                        repo_full_name=repo.full_name,
                        branch=repo.default_branch,
                        per_page=50
                    )
                except Exception:
                    raw_commits = []

            if not raw_commits:
                local_path = user.local_repo_path or "."
                git_srv = GitService(local_path)
                if git_srv.is_valid_repo():
                    local_commits = git_srv.get_recent_commits(limit=50)
                    for lc in local_commits:
                        raw_commits.append({
                            'sha': lc['sha'],
                            'commit': {
                                'message': lc['message'],
                                'author': {
                                    'name': lc.get('author', 'Local Git'),
                                    'date': lc.get('date', '').replace(' ', 'T')
                                }
                            }
                        })

            for c in raw_commits:
                sha = c.get('sha', '')
                if not sha:
                    continue
                commit_info = c.get('commit', {})
                msg = commit_info.get('message', '').split('\n')[0]
                author_info = commit_info.get('author', {})
                author = author_info.get('name', 'Developer')
                date_str = author_info.get('date', '')

                all_commits.append({
                    'sha': sha,
                    'short_sha': sha[:7],
                    'message': msg or "Commit",
                    'author': author,
                    'date': date_str,
                    'repo_name': repo.full_name,
                    'repo_id': repo.id
                })

        # Global local repo fallback if no active repo returned commits
        if not all_commits:
            local_path = user.local_repo_path or "."
            git_srv = GitService(local_path)
            if git_srv.is_valid_repo():
                local_commits = git_srv.get_recent_commits(limit=50)
                first_repo = active_repos[0] if active_repos else None
                repo_name = first_repo.full_name if first_repo else "Local Repository"
                repo_id = first_repo.id if first_repo else 1
                for lc in local_commits:
                    all_commits.append({
                        'sha': lc['sha'],
                        'short_sha': lc['short_sha'],
                        'message': lc['message'],
                        'author': lc['author'] or 'Developer',
                        'date': lc['date'],
                        'repo_name': repo_name,
                        'repo_id': repo_id
                    })

        unique_commits = {}
        for c in all_commits:
            if c['sha'] not in unique_commits:
                unique_commits[c['sha']] = c
        return list(unique_commits.values())



