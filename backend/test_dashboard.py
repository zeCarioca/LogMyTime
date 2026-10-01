from models.database import SessionLocal
from models.user import User
from services.analytics_service import AnalyticsService

db = SessionLocal()
user = db.query(User).first()
if user:
    try:
        res = AnalyticsService.get_dashboard_summary(db, user, None, None)
        print("Success!")
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print("No user")
