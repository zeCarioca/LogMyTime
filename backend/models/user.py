from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from models.database import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    github_user_id = Column(String(100), unique=True, nullable=False)
    github_username = Column(String(100), nullable=False)
    access_token = Column(Text, nullable=False)
    avatar_url = Column(String(255), nullable=True)
    local_repo_path = Column(String(512), nullable=True)
    commit_poll_interval_minutes = Column(Integer, default=5)
    static_api_token = Column(String(255), nullable=True, unique=True)
    
    active_timer_repo_id = Column(Integer, ForeignKey('github_repositories.id'), nullable=True)
    active_timer_start = Column(DateTime, nullable=True)
    active_timer_task_description = Column(String(255), nullable=True)
    active_timer_accumulated_seconds = Column(Integer, default=0)
    active_timer_is_running = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    repositories = relationship('GithubRepository', back_populates='user', cascade='all, delete-orphan', foreign_keys='GithubRepository.user_id')
    analytics_goal = relationship('AnalyticsGoal', back_populates='user', uselist=False, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.github_username}>'
