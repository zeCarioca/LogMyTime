from fastapi import APIRouter, Depends, HTTPException
from schemas import (
    BulkLinkTimelogsRequest,
    BulkLinkTimelogsResponse,
    CommitLinkOut,
    TimeEntryOut,
)
from sqlalchemy.orm import Session

from models import CommitLink, CommitStatus, TimeEntry, User, get_db
from routers.auth_router import get_current_user
from services import GitService, PairingService, SyncService

router = APIRouter(tags=["Commit Pairing"])

@router.get("/recent")
async def get_recent_commits(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    commits = await PairingService.fetch_recent_commits(db, user)
    return commits

@router.get("/unassigned-time", response_model=list[TimeEntryOut])
async def get_unassigned_time(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entries = db.query(TimeEntry).join(TimeEntry.repository).filter(
        TimeEntry.repository.has(user_id=user.id),
        TimeEntry.commit_sha == None
    ).order_by(TimeEntry.created_at.desc()).all()

    for e in entries:
        if e.repository:
            e.repo_name = e.repository.full_name
    
    return entries

@router.get("/pending", response_model=list[CommitLinkOut])
async def list_pending_commits(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Run polling check first
    await PairingService.poll_and_pair(db, user)

    links = db.query(CommitLink).filter(
        CommitLink.status == CommitStatus.pending
    ).order_by(CommitLink.created_at.desc()).all()

    return links


@router.post("/{commit_link_id}/confirm")
async def confirm_pairing(commit_link_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    link = db.query(CommitLink).filter(CommitLink.id == commit_link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Commit link not found")

    res = await SyncService.sync_on_confirm(db, link, user)
    if not res.get('success'):
        raise HTTPException(status_code=500, detail=res.get('error', 'Confirmation sync failed'))

    return {"status": "success", "message": "Pairing confirmed and pushed to GitHub"}

@router.post("/{commit_link_id}/reject")
async def reject_pairing(commit_link_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    link = db.query(CommitLink).filter(CommitLink.id == commit_link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Commit link not found")

    link.status = CommitStatus.rejected
    db.commit()
    return {"status": "success", "message": "Pairing rejected"}

@router.get("/git-status")
async def get_local_git_status(user: User = Depends(get_current_user)):
    repo_path = user.local_repo_path or "."
    git_srv = GitService(repo_path)
    return git_srv.get_status()

@router.post("/set-local-path")
async def set_local_repo_path(path: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.local_repo_path = path.strip()
    db.commit()
    return {"status": "success", "local_repo_path": user.local_repo_path}

@router.post("/bulk-link", response_model=BulkLinkTimelogsResponse)
async def bulk_link_timelogs(
    payload: BulkLinkTimelogsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.timelog_ids:
        raise HTTPException(status_code=400, detail="timelog_ids cannot be empty")

    clean_sha = payload.commit_sha.strip()
    if not clean_sha:
        raise HTTPException(status_code=400, detail="commit_sha cannot be empty")

    # Scope search to user owned repositories
    existing_entries = db.query(TimeEntry).join(
        TimeEntry.repository
    ).filter(
        TimeEntry.id.in_(payload.timelog_ids),
        TimeEntry.repository.has(user_id=user.id)
    ).all()

    found_ids = {entry.id for entry in existing_entries}
    missing_ids = set(payload.timelog_ids) - found_ids

    if missing_ids:
        raise HTTPException(
            status_code=442,
            detail=f"The following timelog IDs were not found or do not belong to you: {sorted(missing_ids)}"
        )

    try:
        updated_count = db.query(TimeEntry).filter(
            TimeEntry.id.in_(payload.timelog_ids)
        ).update(
            {TimeEntry.commit_sha: clean_sha},
            synchronize_session=False
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database update failed: {e!s}")

    return BulkLinkTimelogsResponse(
        status="success",
        message=f"Successfully assigned {updated_count} timelog(s) to commit {clean_sha}",
        updated_count=updated_count,
        commit_sha=clean_sha,
        updated_timelog_ids=payload.timelog_ids
    )

