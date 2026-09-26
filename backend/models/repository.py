from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from models.database import Base

class GithubRepository(Base):
    __tablename__ = 'github_repositories'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    full_name = Column(String(200), nullable=False)
    default_branch = Column(String(100), default='main')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='repositories')
    time_entries = relationship('TimeEntry', back_populates='repository', cascade='all, delete-orphan')

    @property
    def unsynced_seconds(self):
        return sum(entry.total_seconds for entry in self.time_entries if not entry.is_synced)

    @property
    def unsynced_minutes(self):
        return round(self.unsynced_seconds / 60.0, 1)

    def __repr__(self):
        return f'<GithubRepository {self.full_name}>'
