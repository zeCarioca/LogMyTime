import datetime
from sqlalchemy.orm import Session
from models import User
from models.database import SessionLocal
from services.analytics_service import AnalyticsService

db = SessionLocal()
user = db.query(User).first()
if user:
    res = AnalyticsService.get_heatmap(db, user, "week", None, None)
    print(f"Total points: {len(res.data)}")
    nonzero = [p for p in res.data if p.total_duration_seconds > 0]
    print(f"Non-zero points: {len(nonzero)}")
    if nonzero:
        print("Sample data:", nonzero[0])
    
    res_month = AnalyticsService.get_heatmap(db, user, "month", None, None)
    nonzero_month = [p for p in res_month.data if p.total_duration_seconds > 0]
    print(f"Month nonzero points: {len(nonzero_month)}")
else:
    print("No user")
