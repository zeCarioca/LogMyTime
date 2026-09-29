import urllib.request
import json
import urllib.error
from models import get_db, User
from routers.auth_router import create_access_token
from datetime import timedelta

db = next(get_db())
user = db.query(User).first()
token = create_access_token(data={"sub": str(user.id)}, expires_delta=timedelta(days=1))

req = urllib.request.Request('http://localhost:8000/analytics/per-commit', headers={'Authorization': f'Bearer {token}'})
try:
    res = urllib.request.urlopen(req)
    print(f'STATUS: {res.status}')
    print(f'BODY: {res.read().decode()}')
except urllib.error.HTTPError as e:
    print(f'HTTP ERROR: {e.code} - {e.read().decode()}')
except Exception as e:
    print(f'ERROR: {e}')

# Wait, the auth system uses JWT.
# Let's bypass auth locally or generate a valid JWT if needed. 
