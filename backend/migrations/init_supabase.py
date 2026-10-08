import os
import sys

# Add the backend directory to sys.path so 'models' can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from models import Base, engine

def init_supabase():
    print(f"Connecting to database: {engine.url}")
    if engine.url.drivername == "sqlite":
        print("Warning: Currently pointing to SQLite. Make sure DATABASE_URL is set to your Supabase connection string.")
        
    print("Creating tables in the database...")
    Base.metadata.create_all(bind=engine)
    print("Migration complete. Tables created.")

if __name__ == "__main__":
    init_supabase()
