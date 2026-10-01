from fastapi.testclient import TestClient
from app import app
from models import User
from models.database import SessionLocal

db = SessionLocal()
user = db.query(User).first()

if user:
    def override_get_current_user():
        return user
        
    from routers.auth_router import get_current_user
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    client = TestClient(app)
    response = client.get("/analytics/dashboard-summary")
    if response.status_code == 200:
        print("FastAPI endpoint success!")
    else:
        print(f"Failed with {response.status_code}")
        print(response.json())
else:
    print("No user")
