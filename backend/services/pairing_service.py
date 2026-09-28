from sqlalchemy.orm import Session

from models import CommitLink, GithubRepository, User
from services.git_service import GitService
from services.github_service import GitHubService


class PairingService:
    @staticmethod
    async def poll_and_pair(db: Session, user: User) -> list[CommitLink]:
        # Automatic pairing by recent commits removed per specification
        return []

    @staticmethod
    async def fetch_recent_commits(db: Session, user: User) -> list[dict]:
        import os
        import sqlite3

        db_paths = [
            os.path.abspath("instance/local-git-log-commits.db"),
            os.path.abspath("instance/local-git-commits.db"),
            os.path.abspath("backend/instance/local-git-log-commits.db"),
            os.path.abspath("backend/instance/local-git-commits.db"),
            os.path.join(os.path.dirname(__file__), "..", "..", "instance", "local-git-log-commits.db"),
            os.path.join(os.path.dirname(__file__), "..", "..", "instance", "local-git-commits.db"),
        ]

        db_file = None
        for p in db_paths:
            if os.path.exists(p):
                db_file = p
                break

        if db_file:
            try:
                conn = sqlite3.connect(db_file)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                rows = cursor.execute(
                    "SELECT commit_sha, short_sha, author_name, commit_date, message FROM git_commits ORDER BY id ASC"
                ).fetchall()
                conn.close()
                if rows:
                    return [
                        {
                            'sha': r['commit_sha'],
                            'short_sha': r['short_sha'] or r['commit_sha'][:7],
                            'message': r['message'] or 'Commit',
                            'author': r['author_name'] or 'Developer',
                            'date': r['commit_date'] or '',
                            'repo_name': 'local-git-commits',
                            'repo_id': 1
                        }
                        for r in rows
                    ]
            except Exception as e:
                print(f"Error reading local git commits DB: {e}")

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



