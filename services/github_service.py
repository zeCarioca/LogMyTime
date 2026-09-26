import base64
import json
from datetime import datetime
import requests

GITHUB_API_BASE = 'https://api.github.com'

class GitHubService:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'LogMyTime-Tracker'
        }

    def get_authenticated_user(self):
        """Fetch the authenticated user's profile from GitHub."""
        res = requests.get(f'{GITHUB_API_BASE}/user', headers=self.headers, timeout=10)
        if res.status_code == 200:
            return res.json()
        return None

    def get_user_repositories(self):
        """Fetch available repositories (owned and collaborator/shared)."""
        params = {'affiliation': 'owner,collaborator,organization_member', 'sort': 'updated', 'per_page': 100}
        res = requests.get(f'{GITHUB_API_BASE}/user/repos', headers=self.headers, params=params, timeout=10)
        if res.status_code == 200:
            return res.json()
        if res.status_code == 401:
            raise PermissionError("GitHub token has expired or is invalid. Please sign in again.")
        return []

    def get_branch(self, repo_full_name: str, branch: str):
        """Fetch branch details including commit SHA."""
        url = f'{GITHUB_API_BASE}/repos/{repo_full_name}/branches/{branch}'
        res = requests.get(url, headers=self.headers, timeout=10)
        if res.status_code == 200:
            return res.json()
        return None

    def get_commits(self, repo_full_name: str, branch: str = None, per_page: int = 30, author: str = None):
        """Fetch commits from a repository with optional branch and author filters."""
        url = f'{GITHUB_API_BASE}/repos/{repo_full_name}/commits'
        params = {'per_page': per_page}
        if branch:
            params['sha'] = branch
        if author:
            params['author'] = author
        res = requests.get(url, headers=self.headers, params=params, timeout=10)
        if res.status_code == 200:
            return res.json()
        return []

    def ensure_branch(self, repo_full_name: str, branch: str = 'timelogs', base_branch: str = 'main'):
        """
        Ensure that the specified branch exists. If not, creates it from base_branch.
        Returns: True if branch exists or was created, False otherwise.
        """
        # Check if target branch already exists
        existing = self.get_branch(repo_full_name, branch)
        if existing:
            return True

        # Fetch base branch commit SHA
        base_data = self.get_branch(repo_full_name, base_branch)
        if not base_data or 'commit' not in base_data:
            # Try fetching repo default branch info
            repo_res = requests.get(f'{GITHUB_API_BASE}/repos/{repo_full_name}', headers=self.headers, timeout=10)
            if repo_res.status_code == 200:
                default_b = repo_res.json().get('default_branch', 'main')
                if default_b != base_branch:
                    base_data = self.get_branch(repo_full_name, default_b)

        if not base_data or 'commit' not in base_data:
            return False

        base_sha = base_data['commit']['sha']

        # Create ref: refs/heads/<branch>
        create_ref_url = f'{GITHUB_API_BASE}/repos/{repo_full_name}/git/refs'
        payload = {
            'ref': f'refs/heads/{branch}',
            'sha': base_sha
        }
        res = requests.post(create_ref_url, headers=self.headers, json=payload, timeout=10)
        return res.status_code in (200, 201)

    def get_file_content(self, repo_full_name: str, path: str = 'TimeLogs/timesheet.json', ref: str = 'timelogs'):
        """
        Fetch file metadata and decoded JSON content from the repository.
        Returns: (parsed_content, sha) or (None, None) if file does not exist.
        """
        url = f'{GITHUB_API_BASE}/repos/{repo_full_name}/contents/{path}'
        res = requests.get(url, headers=self.headers, params={'ref': ref}, timeout=10)

        if res.status_code == 200:
            data = res.json()
            sha = data.get('sha')
            raw_content = data.get('content', '')
            try:
                decoded_bytes = base64.b64decode(raw_content)
                parsed_json = json.loads(decoded_bytes.decode('utf-8'))
                return parsed_json, sha
            except Exception:
                return [], sha
        elif res.status_code == 404:
            return None, None
        else:
            res.raise_for_status()

    def sync_timesheet(self, repo_full_name: str, pending_entries, branch: str = 'timelogs', base_branch: str = 'main'):
        """
        Appends pending time entries into TimeLogs/timesheet.json on branch (default: 'timelogs')
        and commits via GitHub API. Automatically creates the 'timelogs' branch if missing.
        
        Args:
            repo_full_name: 'owner/repo-name'
            pending_entries: iterable of TimeEntry objects
            branch: target branch (defaults to 'timelogs')
            base_branch: base branch to branch off of if target doesn't exist (e.g. 'main')

        Returns:
            dict with success status and commit info or error
        """
        # Ensure target branch exists (creates from base_branch if needed)
        self.ensure_branch(repo_full_name, branch=branch, base_branch=base_branch)

        path = 'TimeLogs/timesheet.json'
        existing_data, sha = self.get_file_content(repo_full_name, path=path, ref=branch)

        # Standard timesheet JSON structure
        if existing_data is None or not isinstance(existing_data, dict):
            timesheet_data = {
                'repository': repo_full_name,
                'last_synced_at': None,
                'total_logged_minutes': 0,
                'entries': []
            }
        else:
            timesheet_data = existing_data
            if 'entries' not in timesheet_data or not isinstance(timesheet_data['entries'], list):
                timesheet_data['entries'] = []

        total_synced_minutes = 0
        now_iso = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

        for entry in pending_entries:
            timesheet_data['entries'].append({
                'id': entry.id,
                'task_description': entry.task_description,
                'duration_seconds': entry.total_seconds,
                'duration_minutes': entry.duration_minutes or round(entry.total_seconds / 60.0, 2),
                'logged_at': entry.created_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'synced_at': now_iso
            })
            total_synced_minutes += (entry.total_seconds / 60.0)

        timesheet_data['total_logged_seconds'] = sum(
            e.get('duration_seconds', e.get('duration_minutes', 0) * 60) for e in timesheet_data['entries']
        )
        timesheet_data['total_logged_minutes'] = round(timesheet_data['total_logged_seconds'] / 60.0, 1)
        timesheet_data['last_synced_at'] = now_iso

        # Encode JSON to UTF-8 Base64
        json_str = json.dumps(timesheet_data, indent=2)
        encoded_content = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')

        commit_message = f'chore: sync logged time (+{total_synced_minutes} mins) [LogMyTime]'

        payload = {
            'message': commit_message,
            'content': encoded_content,
            'branch': branch
        }
        if sha:
            payload['sha'] = sha

        url = f'{GITHUB_API_BASE}/repos/{repo_full_name}/contents/{path}'
        put_res = requests.put(url, headers=self.headers, json=payload, timeout=15)

        if put_res.status_code in (200, 201):
            return {
                'success': True,
                'synced_minutes': total_synced_minutes,
                'commit': put_res.json().get('commit')
            }
        else:
            return {
                'success': False,
                'error': put_res.text,
                'status_code': put_res.status_code
            }
