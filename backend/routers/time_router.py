from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import get_db, User, GithubRepository, TimeEntry
from schemas import TimeEntryCreate, TimeEntryOut
from routers.auth_router import get_current_user
from services import GitHubService

router = APIRouter(tags=["Time Tracking"])

@router.post("/log", response_model=TimeEntryOut)
async def log_time(payload: TimeEntryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = db.query(GithubRepository).filter(
        GithubRepository.id == payload.repo_id,
        GithubRepository.user_id == user.id
    ).first()

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    sec = payload.duration_seconds
    min_val = payload.duration_minutes

    if sec <= 0 and min_val > 0:
        sec = min_val * 60
    if sec > 0 and min_val <= 0:
        min_val = max(1, round(sec / 60.0))

    if sec <= 0:
        raise HTTPException(status_code=400, detail="Duration must be greater than zero")

    entry = TimeEntry(
        repo_id=repo.id,
        task_description=payload.task_description.strip(),
        duration_seconds=sec,
        duration_minutes=min_val,
        is_synced=False
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@router.delete("/{entry_id}")
async def delete_entry(entry_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(TimeEntry).join(GithubRepository).filter(
        TimeEntry.id == entry_id,
        GithubRepository.user_id == user.id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")

    db.delete(entry)
    db.commit()
    return {"status": "success", "message": "Time entry deleted"}

@router.post("/sync-manual/{repo_id}")
async def manual_sync(repo_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = db.query(GithubRepository).filter(
        GithubRepository.id == repo_id,
        GithubRepository.user_id == user.id
    ).first()

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    unsynced_entries = db.query(TimeEntry).filter(
        TimeEntry.repo_id == repo.id,
        TimeEntry.is_synced == False
    ).all()

    if not unsynced_entries:
        return {"status": "info", "message": "No unsynced entries for this repository"}

    gh = GitHubService(user.access_token)
    try:
        sync_res = await gh.sync_timesheet(
            repo_full_name=repo.full_name,
            pending_entries=unsynced_entries,
            branch='timelogs',
            base_branch=repo.default_branch
        )
        if sync_res.get('success'):
            now = datetime.utcnow()
            for e in unsynced_entries:
                e.is_synced = True
                e.synced_at = now
            db.commit()
            return {"status": "success", "synced_count": len(unsynced_entries)}
        else:
            raise HTTPException(status_code=500, detail=sync_res.get('error', 'Sync failed'))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
