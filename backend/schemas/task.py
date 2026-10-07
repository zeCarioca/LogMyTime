from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TaskBase(BaseModel):
    title: str
    repo_id: Optional[int] = None
    status: str = 'todo'


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    repo_id: Optional[int] = None
    status: Optional[str] = None
    completed_at: Optional[datetime] = None


class TaskResponse(TaskBase):
    id: int
    user_id: int
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
