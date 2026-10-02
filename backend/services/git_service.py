import logging
import os
import subprocess

logger = logging.getLogger(__name__)


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
        except Exception as e:
            logger.error(f"Git subprocess error: {e}")
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

    def get_git_graph(self, limit: int = 500) -> list[dict]:
        log = self._run('log', '--all', '--date-order', f'-{limit}', '--format=%H%x1f%p%x1f%d%x1f%s%x1f%an%x1f%ad', '--date=iso')
        if not log:
            return []
        nodes = []
        for line in log.split('\n'):
            if not line.strip():
                continue
            parts = line.split('\x1f', 5)
            if len(parts) >= 6:
                sha = parts[0].strip()
                parents = parts[1].strip().split() if parts[1].strip() else []
                
                # Parse refs: e.g. " (HEAD -> main, origin/main, tag: v1.0)"
                refs_raw = parts[2].strip()
                refs = []
                if refs_raw.startswith('(') and refs_raw.endswith(')'):
                    refs_str = refs_raw[1:-1]
                    for ref in refs_str.split(','):
                        ref = ref.strip()
                        if ref.startswith('tag: '):
                            pass # Ignoring tags for branches tree
                        elif '->' in ref:
                            refs.append(ref.split('->')[1].strip())
                        else:
                            refs.append(ref)
                
                message = parts[3].strip()
                author = parts[4].strip()
                date = parts[5].strip()
                
                nodes.append({
                    'sha': sha,
                    'parents': parents,
                    'refs': refs,
                    'message': message,
                    'author': author,
                    'date': date
                })
        return nodes

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
