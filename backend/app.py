import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers import auth_router, commit_router, data_router, repo_router, time_router, analytics_router, task_router

from models import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="LogMyTime API",
    description="Local-first developer time tracking & commit pairing REST API",
    version="2.0.0",
    lifespan=lifespan
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(repo_router, prefix="/repos")
app.include_router(time_router, prefix="/time")
app.include_router(commit_router, prefix="/commits")
app.include_router(data_router, prefix="/data")
app.include_router(analytics_router, prefix="/analytics")
app.include_router(task_router)

@app.get("/")
async def root():
    return {"status": "online", "message": "LogMyTime FastAPI Backend is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
