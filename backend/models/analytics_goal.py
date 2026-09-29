from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from models.database import Base

class AnalyticsGoal(Base):
    __tablename__ = 'analytics_goals'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    weekly_target_seconds = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship('User', back_populates='analytics_goal')

    def __repr__(self):
        return f'<AnalyticsGoal user={self.user_id} target={self.weekly_target_seconds}s>'
