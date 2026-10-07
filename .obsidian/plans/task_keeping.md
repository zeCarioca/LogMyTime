# Task Keeping Feature Plan

## 🎯 Goal
Implement a "Task Keeping" feature on the Timer & Tracker (Dashboard) page to allow users to maintain a list of active and pending tasks. Instead of typing a freeform `task_description` every time, users can create tasks, select them to track time against, and mark them as completed.

## 🏗️ Architecture & Data Model

### 1. New Backend Model: `Task`
Add a new SQLAlchemy model in `backend/models/task.py`:
- `id` (Integer, PK)
- `user_id` (Integer, FK -> `users.id`, nullable=False)
- `repo_id` (Integer, FK -> `github_repositories.id`, nullable=True) - Allows repo-specific or global tasks.
- `title` (String, nullable=False)
- `status` (Enum/String: `todo`, `in_progress`, `done`)
- `created_at` (DateTime)
- `completed_at` (DateTime, nullable=True)

### 2. Backend Routes: `/tasks`
Create a new router `backend/routers/task_router.py`:
- `GET /tasks/` - List tasks for the authenticated user (optionally filtered by `repo_id`).
- `POST /tasks/` - Create a new task.
- `PUT /tasks/{task_id}` - Update a task (e.g., mark as `done`, change title).
- `DELETE /tasks/{task_id}` - Delete a task.

### 3. Frontend API & State Hook
- **API**: Add `api/tasks.ts` with Axios calls matching the new endpoints.
- **Hook**: Add `hooks/useTasks.ts` (using React Query or standard state) to fetch, create, update, and delete tasks.

## ✨ Frontend UI/UX Integration

### 1. The Task List Panel (Dashboard UI)
Add a new `TaskKeeperCard` component to the Dashboard grid (likely in Column 1 below the `TimerDial` or in a new designated column space).
- **View**: A sleek, scrollable list of tasks separated into "Active" and "Completed".
- **Interactions**:
  - **Quick Add**: A small input at the top of the card to quickly add a new task (hitting Enter creates it).
  - **Play Button**: Next to each task, a "Play" button that automatically sets it as the active task in the `LoggingCard` and starts the timer.
  - **Checkbox**: To mark a task as `done` (strikes through the text and moves it to completed).

### 2. `LoggingCard` Integration
- Replace the simple text `<input>` for the task description with a **Combobox / Autocomplete** component.
- When focused, it drops down a list of active tasks.
- The user can select an existing task or just type a new description.
- If they type a new description and start the timer, we can prompt them (or auto-create) a new Task.

### 3. TimeEntry Association
- Update the `TimeEntry` model to optionally include a `task_id` (FK -> `tasks.id`).
- This allows rolling up time tracked per task later on the Data/Analytics page.

## 🛠️ Implementation Phases

### Phase 1: Backend Foundation
1. Create `Task` ORM model.
2. Create Pydantic schemas in `schemas/task.py`.
3. Build the `task_router.py` CRUD endpoints.
4. Run Alembic or `migrate_db.py` to create the new tables.

### Phase 2: Frontend Data Layer
1. Add API definitions in `frontend/src/api/tasks.ts`.
2. Build the `useTasks.ts` hook.

### Phase 3: TaskKeeper UI Construction
1. Build `TaskKeeperCard.tsx` following the Oklch dark-mode glassmorphism theme (`var(--card-bg)`, etc.).
2. Implement inline task creation and completion toggles.
3. Add the card to `pages/Dashboard.tsx`.

### Phase 4: Timer Integration
1. Update `LoggingCard.tsx` task input to serve as a selector for existing tasks.
2. Wire the "Play" button on tasks to dispatch updates to the `useTimer` hook, auto-setting the task description.
