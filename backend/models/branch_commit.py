from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from models.database import Base


class BranchCommit(Base):
    __tablename__ = 'branch_commits'

    id = Column(Integer, primary_key=True)
    repo_id = Column(Integer, ForeignKey('github_repositories.id'), nullable=False)
    branch_name = Column(String(255), nullable=False)
    commit_sha = Column(String(40), nullable=False)
    short_sha = Column(String(7), nullable=True)
    message = Column(String(500), nullable=True)
    author = Column(String(200), nullable=True)
    commit_date = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('repo_id', 'branch_name', 'commit_sha', name='uq_repo_branch_commit'),
    )

    repository = relationship('GithubRepository')

    def __repr__(self):
        return f'<BranchCommit branch={self.branch_name} sha={self.commit_sha[:7]}>'
