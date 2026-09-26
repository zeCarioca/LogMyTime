import os
from datetime import datetime, timedelta
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import httpx

from models import get_db, User
from schemas import UserOut
from services import GitHubService

router = APIRouter(tags=["Auth"])

GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        # Fallback to default user for development/demo
        first_user = db.query(User).first()
        if first_user:
            return first_user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = int(payload.get("sub"))
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

@router.get("/login")
async def login():
    client_id = os.getenv('GITHUB_CLIENT_ID', '').strip()
    if not client_id or client_id == 'your_github_client_id_here':
        raise HTTPException(status_code=400, detail="GITHUB_CLIENT_ID not configured")

    params = {
        'client_id': client_id,
        'scope': 'repo user:email',
        'redirect_uri': 'http://127.0.0.1:8000/auth/callback'
    }
    return RedirectResponse(f"{GITHUB_AUTH_URL}?{urlencode(params)}")

@router.get("/callback")
async def callback(code: str, db: Session = Depends(get_db)):
    client_id = os.getenv('GITHUB_CLIENT_ID', '').strip()
    client_secret = os.getenv('GITHUB_CLIENT_SECRET', '').strip()

    async with httpx.AsyncClient() as client:
        res = await client.post(
            GITHUB_TOKEN_URL,
            headers={'Accept': 'application/json'},
            json={'client_id': client_id, 'client_secret': client_secret, 'code': code},
            timeout=10
        )
        token_json = res.json()
        access_token = token_json.get('access_token')

    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to retrieve GitHub access token")

    gh = GitHubService(access_token)
    user_info = await gh.get_authenticated_user()
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to fetch user info from GitHub")

    gh_user_id = str(user_info['id'])
    gh_username = user_info.get('login', 'unknown')
    avatar_url = user_info.get('avatar_url')

    user = db.query(User).filter(User.github_user_id == gh_user_id).first()
    if not user:
        user = User(
            github_user_id=gh_user_id,
            github_username=gh_username,
            access_token=access_token,
            avatar_url=avatar_url
        )
        db.add(user)
    else:
        user.access_token = access_token
        user.github_username = gh_username
        user.avatar_url = avatar_url

    db.commit()
    db.refresh(user)

    jwt_token = create_access_token({"sub": str(user.id)})
    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    return RedirectResponse(f"{frontend_origin}?token={jwt_token}")

@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user
