from sqlalchemy.orm import Session
from models import User

class AnalyticsExport:
    @staticmethod
    def generate_json(db: Session, user: User, date_start: str | None, date_end: str | None, repo_id: int | None):
        return {"data": "Full export here"}

    @staticmethod
    def generate_markdown(db: Session, user: User, date_start: str | None, date_end: str | None, repo_id: int | None):
        return "# LogMyTime Report\n\nMarkdown export here."
