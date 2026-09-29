from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BranchCommitOut(BaseModel):
    id: int
    repo_id: int
    branch_name: str
    commit_sha: str
    short_sha: str | None = None
    message: str | None = None
    author: str | None = None
    commit_date: datetime | None = None
    fetched_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BranchCommitItem(BaseModel):
    sha: str
    short_sha: str
    message: str
    author: str
    date: str
    repo_name: str
    repo_id: int
    branch: str


class BranchWithCommitsOut(BaseModel):
    branch: str
    commits: list[BranchCommitItem]
