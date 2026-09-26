from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import get_db, User, CommitLink, CommitStatus
from schemas import CommitLinkOut
from routers.auth_router import get_current_user
from services import GitService, PairingService, SyncService

router = APIRouter(tags=["Commit Pairing"])

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
