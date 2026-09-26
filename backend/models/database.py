import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

# Point to instance/database.db if present, or database.db in root/instance folder
DEFAULT_DB_PATH = "sqlite:///../instance/database.db"
DATABASE_URL = os.getenv("DATABASE_URI", DEFAULT_DB_PATH)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
