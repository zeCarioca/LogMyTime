import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from models import get_db, User, GithubRepository, TimeEntry
from routers.auth_router import get_current_user
from services import GitHubService, get_selected_repository, set_selected_repository

router = APIRouter(tags=["Data & Hierarchy"])

@router.get("/hierarchy")
async def get_hierarchy(
    repo_id: int | None = Query(None),
    repo: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    repos_query = db.query(GithubRepository).filter(GithubRepository.user_id == user.id)
    if repo_id:
        repos_query = repos_query.filter(GithubRepository.id == repo_id)
    elif repo:
        repos_query = repos_query.filter(GithubRepository.full_name == repo.strip())
    repos = repos_query.order_by(GithubRepository.full_name.asc()).all()

    gh = GitHubService(user.access_token)
    hierarchy = []

    for r in repos:
        raw_commits = []
        try:
            raw_commits = await gh.get_commits(r.full_name, branch=r.default_branch, per_page=15, author=user.github_username)
        except Exception:
            raw_commits = []

        commits_data = []
        for c in raw_commits:
            commit_info = c.get('commit', {})
            author_info = commit_info.get('author', {})
            commits_data.append({
                'sha': c.get('sha', '')[:7],
                'full_sha': c.get('sha', ''),
                'message': commit_info.get('message', '').split('\n')[0],
                'date': author_info.get('date', ''),
                'url': c.get('html_url', '')
            })

        time_entries = db.query(TimeEntry).filter(TimeEntry.repo_id == r.id).order_by(TimeEntry.created_at.desc()).all()
        entries_data = []
        for entry in time_entries:
            entries_data.append({
                'id': entry.id,
                'project': entry.project or r.full_name,
                'commit': entry.commit,
                'task_description': entry.task_description,
                'duration_seconds': entry.total_seconds,
                'duration_minutes': round(entry.total_seconds / 60.0, 2),
                'formatted_duration': entry.formatted_duration,
                'is_synced': entry.is_synced,
                'date': entry.created_at.strftime('%Y-%m-%d'),
                'timestamp': entry.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'synced_at': entry.synced_at.strftime('%Y-%m-%d %H:%M:%S') if entry.synced_at else None
            })

        hierarchy.append({
            'repository_id': r.id,
            'repository': r.full_name,
            'default_branch': r.default_branch,
            'is_active': r.is_active,
            'user_list': [
                {
                    'username': user.github_username,
                    'is_current_user': True,
                    'avatar_url': user.avatar_url,
                    'commits': commits_data,
                    'time_records': entries_data,
                    'summary': {
                        'total_seconds': sum(e['duration_seconds'] for e in entries_data),
                        'total_minutes': round(sum(e['duration_seconds'] for e in entries_data) / 60.0, 2),
                        'total_entries': len(entries_data),
                        'total_commits': len(commits_data)
                    }
                }
            ]
        })

    return {
        'current_user': user.github_username,
        'selected_repository': get_selected_repository(),
        'repositories_count': len(hierarchy),
        'hierarchy': hierarchy
    }

@router.post("/preference/selected-repo")
async def update_selected_repo_preference(
    payload: dict,
    user: User = Depends(get_current_user)
):
    repo_name = payload.get('repository', '').strip()
    set_selected_repository(repo_name)
    return {'status': 'success', 'selected_repository': repo_name}

@router.get("/export/csv")
async def export_csv(
    repo_id: int | None = Query(None),
    repo: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    repos_query = db.query(GithubRepository).filter(GithubRepository.user_id == user.id)
    if repo_id:
        repos_query = repos_query.filter(GithubRepository.id == repo_id)
    elif repo:
        repos_query = repos_query.filter(GithubRepository.full_name == repo.strip())
    repos = repos_query.order_by(GithubRepository.full_name.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'repository', 'project', 'user', 'entry_id', 'commit', 'task_description',
        'duration_seconds', 'duration_minutes', 'is_synced',
        'synced_at', 'date', 'timestamp'
    ])

    for r in repos:
        entries = db.query(TimeEntry).filter(TimeEntry.repo_id == r.id).order_by(TimeEntry.created_at.asc()).all()
        for e in entries:
            writer.writerow([
                r.full_name, e.project or r.full_name, user.github_username, e.id, e.commit or '', e.task_description,
                e.total_seconds, round(e.total_seconds / 60.0, 2), e.is_synced,
                e.synced_at.strftime('%Y-%m-%d %H:%M:%S') if e.synced_at else '',
                e.created_at.strftime('%Y-%m-%d'), e.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])

    output.seek(0)
    filename = f"logmytime_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )
