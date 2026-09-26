import base64
import json
from datetime import datetime
import httpx

GITHUB_API_BASE = 'https://api.github.com'

class GitHubService:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'LogMyTime-Tracker'
        }

    async def get_authenticated_user(self):
        async with httpx.AsyncClient() as client:
            res = await client.get(f'{GITHUB_API_BASE}/user', headers=self.headers, timeout=10)
            if res.status_code == 200:
                return res.json()
            return None

    async def get_user_repositories(self):
        params = {'affiliation': 'owner,collaborator,organization_member', 'sort': 'updated', 'per_page': 100}
        async with httpx.AsyncClient() as client:
            res = await client.get(f'{GITHUB_API_BASE}/user/repos', headers=self.headers, params=params, timeout=10)
            if res.status_code == 200:
                return res.json()
            if res.status_code == 401:
                raise PermissionError("GitHub token has expired or is invalid. Please sign in again.")
            return []

    async def get_branch(self, repo_full_name: str, branch: str):
        url = f'{GITHUB_API_BASE}/repos/{repo_full_name}/branches/{branch}'
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=self.headers, timeout=10)
            if res.status_code == 200:
                return res.json()
            return None

    async def get_commits(self, repo_full_name: str, branch: str = None, per_page: int = 30, author: str = None):
        url = f'{GITHUB_API_BASE}/repos/{repo_full_name}/commits'
        params = {'per_page': per_page}
        if branch:
            params['sha'] = branch
        if author:
            params['author'] = author
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=self.headers, params=params, timeout=10)
            if res.status_code == 200:
                return res.json()
            return []

    async def ensure_branch(self, repo_full_name: str, branch: str = 'timelogs', base_branch: str = 'main'):
        existing = await self.get_branch(repo_full_name, branch)
        if existing:
            return True

        base_data = await self.get_branch(repo_full_name, base_branch)
        if not base_data or 'commit' not in base_data:
            async with httpx.AsyncClient() as client:
                repo_res = await client.get(f'{GITHUB_API_BASE}/repos/{repo_full_name}', headers=self.headers, timeout=10)
                if repo_res.status_code == 200:
                    default_b = repo_res.json().get('default_branch', 'main')
                    if default_b != base_branch:
                        base_data = await self.get_branch(repo_full_name, default_b)

        if not base_data or 'commit' not in base_data:
            return False

        base_sha = base_data['commit']['sha']
        create_ref_url = f'{GITHUB_API_BASE}/repos/{repo_full_name}/git/refs'
        payload = {'ref': f'refs/heads/{branch}', 'sha': base_sha}
        async with httpx.AsyncClient() as client:
            res = await client.post(create_ref_url, headers=self.headers, json=payload, timeout=10)
            return res.status_code in (200, 201)

    async def get_file_content(self, repo_full_name: str, path: str = 'TimeLogs/timesheet.json', ref: str = 'timelogs'):
        url = f'{GITHUB_API_BASE}/repos/{repo_full_name}/contents/{path}'
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=self.headers, params={'ref': ref}, timeout=10)
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
            return None, None

    async def sync_timesheet(self, repo_full_name: str, pending_entries, branch: str = 'timelogs', base_branch: str = 'main'):
        await self.ensure_branch(repo_full_name, branch=branch, base_branch=base_branch)
        path = 'TimeLogs/timesheet.json'
        existing_data, sha = await self.get_file_content(repo_full_name, path=path, ref=branch)

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

        json_str = json.dumps(timesheet_data, indent=2)
        encoded_content = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
        commit_message = f'chore: sync logged time (+{total_synced_minutes} mins) [LogMyTime]'

        payload = {'message': commit_message, 'content': encoded_content, 'branch': branch}
        if sha:
            payload['sha'] = sha

        url = f'{GITHUB_API_BASE}/repos/{repo_full_name}/contents/{path}'
        async with httpx.AsyncClient() as client:
            put_res = await client.put(url, headers=self.headers, json=payload, timeout=15)
            if put_res.status_code in (200, 201):
                return {'success': True, 'synced_minutes': total_synced_minutes, 'commit': put_res.json().get('commit')}
            return {'success': False, 'error': put_res.text, 'status_code': put_res.status_code}
