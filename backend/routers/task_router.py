from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db
from models.task import Task
from models.user import User
from routers.auth_router import get_current_user
from schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    repo_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task).filter(Task.user_id == current_user.id)
    if repo_id is not None:
        query = query.filter(Task.repo_id == repo_id)
    tasks = query.order_by(Task.created_at.desc()).all()
    return tasks


@router.post("/", response_model=TaskResponse)
async def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_task = Task(
        user_id=current_user.id,
        repo_id=task_in.repo_id,
        title=task_in.title,
        status=task_in.status,
    )
    if new_task.status == 'done':
        new_task.completed_at = datetime.utcnow()
        
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_in.title is not None:
        task.title = task_in.title
    if task_in.repo_id is not None:
        task.repo_id = task_in.repo_id
    if task_in.status is not None:
        if task_in.status == 'done' and task.status != 'done':
            task.completed_at = task_in.completed_at or datetime.utcnow()
        elif task_in.status != 'done':
            task.completed_at = None
        task.status = task_in.status

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}
