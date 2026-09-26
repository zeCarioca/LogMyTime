from datetime import datetime
from sqlalchemy.orm import Session
from models import TimeEntry, CommitLink, CommitStatus, GithubRepository, User
from services.github_service import GitHubService
from services.git_service import GitService

class PairingService:
    @staticmethod
    async def poll_and_pair(db: Session, user: User) -> list[CommitLink]:
        # Automatic pairing by recent commits removed per specification
        return []


