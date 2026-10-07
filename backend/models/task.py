from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from models.database import Base


class Task(Base):
    __tablename__ = 'tasks'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    repo_id = Column(Integer, ForeignKey('github_repositories.id'), nullable=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default='todo', nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)

    user = relationship('User', back_populates='tasks')
    repository = relationship('GithubRepository', back_populates='tasks')
    time_entries = relationship('TimeEntry', back_populates='task')

    def __repr__(self):
        return f'<Task id={self.id} title="{self.title}" status="{self.status}">'
