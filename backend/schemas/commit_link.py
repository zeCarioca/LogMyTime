from pydantic import BaseModel, ConfigDict
from datetime import datetime
from models.commit_link import CommitStatus
from schemas.time_entry import TimeEntryOut

class CommitLinkOut(BaseModel):
    id: int
    repo_id: int
    commit_sha: str
    commit_message: str
    commit_date: datetime
    status: CommitStatus
    created_at: datetime
    time_entry: TimeEntryOut
    model_config = ConfigDict(from_attributes=True)

class BulkLinkTimelogsRequest(BaseModel):
    commit_sha: str
    timelog_ids: list[int]

class BulkLinkTimelogsResponse(BaseModel):
    status: str
    message: str
    updated_count: int
    commit_sha: str
    updated_timelog_ids: list[int]

