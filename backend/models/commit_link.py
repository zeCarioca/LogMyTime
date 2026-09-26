import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from models.database import Base

class CommitStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    rejected = "rejected"

class CommitLink(Base):
    __tablename__ = 'commit_links'

    id = Column(Integer, primary_key=True)
    time_entry_id = Column(Integer, ForeignKey('time_entries.id'), nullable=False)
    repo_id = Column(Integer, ForeignKey('github_repositories.id'), nullable=False)
    commit_sha = Column(String(40), nullable=False)
    commit_message = Column(String(500), nullable=False)
    commit_date = Column(DateTime, nullable=False)
    status = Column(Enum(CommitStatus), default=CommitStatus.pending, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    time_entry = relationship('TimeEntry')
    repository = relationship('GithubRepository')

    def __repr__(self):
        return f'<CommitLink sha={self.commit_sha[:7]} status={self.status}>'
