from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
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
    created_at = Column(DateTime, default=datetime.utcnow)

    repositories = relationship('GithubRepository', back_populates='user', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.github_username}>'
