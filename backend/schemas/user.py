from pydantic import BaseModel, ConfigDict
from datetime import datetime

class UserBase(BaseModel):
    github_username: str
    avatar_url: str | None = None
    local_repo_path: str | None = None
    commit_poll_interval_minutes: int = 5

class UserCreate(UserBase):
    github_user_id: str
    access_token: str

class UserOut(UserBase):
    id: int
    github_user_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
