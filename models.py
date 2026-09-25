from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    github_user_id = db.Column(db.String(100), unique=True, nullable=False)
    github_username = db.Column(db.String(100), nullable=False)
    access_token = db.Column(db.Text, nullable=False)
    avatar_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    repositories = db.relationship('GithubRepository', backref='user', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.github_username}>'


class GithubRepository(db.Model):
    __tablename__ = 'github_repositories'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    full_name = db.Column(db.String(200), nullable=False) # e.g. owner/repo-name
    default_branch = db.Column(db.String(100), default='main')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    time_entries = db.relationship('TimeEntry', backref='repository', lazy=True, cascade='all, delete-orphan')

    @property
    def unsynced_seconds(self):
        return sum(entry.total_seconds for entry in self.time_entries if not entry.is_synced)

    @property
    def unsynced_minutes(self):
        # Round up or float equivalent in minutes for threshold checking
        return round(self.unsynced_seconds / 60.0, 1)

    @property
    def sync_progress_percent(self):
        return min(100, int((self.unsynced_seconds / 3600.0) * 100))

    def __repr__(self):
        return f'<GithubRepository {self.full_name}>'


class TimeEntry(db.Model):
    __tablename__ = 'time_entries'

    id = db.Column(db.Integer, primary_key=True)
    repo_id = db.Column(db.Integer, db.ForeignKey('github_repositories.id'), nullable=False)
    task_description = db.Column(db.String(255), nullable=False)
    duration_seconds = db.Column(db.Integer, default=0, nullable=False)
    duration_minutes = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_synced = db.Column(db.Boolean, default=False)
    synced_at = db.Column(db.DateTime, nullable=True)

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
