from pydantic import BaseModel, ConfigDict
from datetime import datetime

class RepositoryBase(BaseModel):
    full_name: str
    default_branch: str = 'main'
    is_active: bool = True

class RepositoryOut(RepositoryBase):
    id: int
    user_id: int
    unsynced_seconds: int = 0
    unsynced_minutes: float = 0.0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
