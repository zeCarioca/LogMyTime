from pydantic import BaseModel, ConfigDict
from datetime import datetime

class TimeEntryCreate(BaseModel):
    repo_id: int
    task_description: str
    duration_seconds: int = 0
    duration_minutes: int = 0
    commit: str | None = None
    commit_sha: str | None = None
    commit_message: str | None = None

class TimeEntryOut(BaseModel):
    id: int
    repo_id: int
    project: str | None = None
    commit: str | None = None
    task_description: str
    duration_seconds: int
    duration_minutes: int
    is_synced: bool
    synced_at: datetime | None = None
    created_at: datetime
    formatted_duration: str
    commit_sha: str | None = None
    commit_message: str | None = None
    repo_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


