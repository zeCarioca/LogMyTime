from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import get_db, User, GithubRepository
from schemas import RepositoryOut
from routers.auth_router import get_current_user
from services import GitHubService, load_archive_preferences, save_archive_preference

router = APIRouter(tags=["Repositories"])

@router.get("/", response_model=list[RepositoryOut])
async def list_repositories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(GithubRepository).filter(GithubRepository.user_id == user.id).all()

@router.post("/refresh", response_model=list[RepositoryOut])
async def refresh_repositories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    gh = GitHubService(user.access_token)
    try:
        gh_repos = await gh.get_user_repositories()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    existing_repos = {r.full_name: r for r in user.repositories}
    archived_names = load_archive_preferences()

    for repo_data in gh_repos:
        full_name = repo_data.get('full_name')
        default_branch = repo_data.get('default_branch', 'main')
        if full_name not in existing_repos:
            is_active = full_name not in archived_names
            new_repo = GithubRepository(
                user_id=user.id,
                full_name=full_name,
                default_branch=default_branch,
                is_active=is_active
            )
            db.add(new_repo)

    db.commit()
    return db.query(GithubRepository).filter(GithubRepository.user_id == user.id).all()

@router.post("/{repo_id}/toggle-visibility")
async def toggle_repo_visibility(repo_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = db.query(GithubRepository).filter(
        GithubRepository.id == repo_id,
        GithubRepository.user_id == user.id
    ).first()

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    repo.is_active = not repo.is_active
    db.commit()
    save_archive_preference(repo.full_name, is_archived=(not repo.is_active))

    return {"status": "success", "is_active": repo.is_active, "repository": repo.full_name}
