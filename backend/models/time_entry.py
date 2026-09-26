from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from models.database import Base

class TimeEntry(Base):
    __tablename__ = 'time_entries'

    id = Column(Integer, primary_key=True)
    repo_id = Column(Integer, ForeignKey('github_repositories.id'), nullable=False)
    task_description = Column(String(255), nullable=False)
    duration_seconds = Column(Integer, default=0, nullable=False)
    duration_minutes = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_synced = Column(Boolean, default=False)
    synced_at = Column(DateTime, nullable=True)

    repository = relationship('GithubRepository', back_populates='time_entries')

    @property
    def total_seconds(self):
        if self.duration_seconds and self.duration_seconds > 0:
            return self.duration_seconds
        return (self.duration_minutes or 0) * 60

    @property
    def formatted_duration(self):
        secs = self.total_seconds
        h = secs // 3600
        m = (secs % 3600) // 60
        s = secs % 60
        if h > 0:
            return f"{h}h {m}m {s}s"
        elif m > 0:
            return f"{m}m {s}s"
        else:
            return f"{s}s"

    def __repr__(self):
        return f'<TimeEntry repo={self.repo_id} dur={self.total_seconds}s synced={self.is_synced}>'
