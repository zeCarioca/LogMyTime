import os
import subprocess


class GitService:
    def __init__(self, repo_path: str | None):
        self.repo_path = repo_path

    def is_valid_repo(self) -> bool:
        if not self.repo_path or not os.path.exists(self.repo_path):
            return False
        return os.path.exists(os.path.join(self.repo_path, '.git')) or self._run('rev-parse', '--is-inside-work-tree') == 'true'

    def _run(self, *args) -> str:
        if not self.repo_path or not os.path.exists(self.repo_path):
            return ""
        try:
            res = subprocess.run(
                ['git', *args],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5,
                check=False
            )
            return res.stdout.strip() if res.returncode == 0 else ""
        except Exception:
            return ""

    def get_branch(self) -> str:
        return self._run('rev-parse', '--abbrev-ref', 'HEAD') or "unknown"

    def get_last_commit(self) -> dict:
        log = self._run('log', '-1', '--format=%H%n%s%n%an%n%ad', '--date=iso')
        if not log:
            return {}
        lines = log.split('\n')
        return {
            'sha': lines[0] if len(lines) > 0 else '',
            'short_sha': lines[0][:7] if len(lines) > 0 else '',
            'message': lines[1] if len(lines) > 1 else '',
            'author': lines[2] if len(lines) > 2 else '',
            'date': lines[3] if len(lines) > 3 else ''
        }

    def get_recent_commits(self, limit: int = 50) -> list[dict]:
        log = self._run('log', f'-{limit}', '--format=%H%x1f%s%x1f%an%x1f%ad', '--date=iso')
        if not log:
            return []
        commits = []
        for line in log.split('\n'):
            if not line.strip():
                continue
            parts = line.split('\x1f')
            if len(parts) >= 3:
                commits.append({
                    'sha': parts[0],
                    'short_sha': parts[0][:7],
                    'message': parts[1],
                    'author': parts[2],
                    'date': parts[3] if len(parts) > 3 else ''
                })
        return commits

    def get_staged_files(self) -> list[str]:
        output = self._run('diff', '--cached', '--name-only')
        return [line for line in output.split('\n') if line] if output else []

    def get_modified_files(self) -> list[str]:
        output = self._run('diff', '--name-only')
        return [line for line in output.split('\n') if line] if output else []

    def get_status(self) -> dict:
        valid = self.is_valid_repo()
        if not valid:
            return {'is_valid': False, 'repo_path': self.repo_path}
        return {
            'is_valid': True,
            'repo_path': self.repo_path,
            'branch': self.get_branch(),
            'last_commit': self.get_last_commit(),
            'staged_files': self.get_staged_files(),
            'modified_files': self.get_modified_files()
        }
