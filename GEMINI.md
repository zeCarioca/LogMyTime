# LogMyTime — Context, Architecture & Development Rules

State, architecture, conventions, rules for **LogMyTime** project.

---

## 📌 Project Overview & Purpose

**LogMyTime**: local-first web app to track dev time + **pair time entries with GitHub commits**.

Capabilities:
- Track time vs local Git & GitHub repos via circular timer + manual controls.
- Detect new commits (GitHub API poll every N min) + show **confirm/reject UI** to link commit to timelog.
- Sync confirmed pairings to GitHub on every commit (syncs linked timelog immediately).
- Read local git state (branch, last commit, staged files) via server `git` CLI subprocess.
- Single-user, local-first SQLite DB via SQLAlchemy ORM.

---

## 🔄 Session Status

| Item | State |
|---|---|
| v2 migration (Flask → FastAPI + React/Vite/TS) | ✅ Complete |
| `backend/` scaffold (models, routers, schemas, services) | ✅ Built & live on port 8000 |
| `frontend/` scaffold (hooks, api/, components, pages, styles) | ✅ Built; Vite dev on port 5173 |
| `instance/database.db` schema migration (CommitLink + new User cols + BranchCommit) | ✅ Applied |
| Backend endpoints verified live (`/auth/me`, `/repos/`, `/commits/branches-with-commits`) | ✅ Verified |
| End-to-end OAuth → Timer → CommitPairing → Sync flow | ✅ Verified |
| Frontend Repository Unarchiving & Theme Persistence | ✅ Built & Verified |
| `instance/local-git-log-commits.db` local git log database | ✅ Created & Populated |
| Frontend `pairing-panel right-panel` local commit integration | ✅ Integrated & Verified |
| Codebase Linting (Ruff for Python & `tsc --noEmit` for TypeScript) | ✅ Cleaned & Verified |
| Legacy Flask root files (`app.py`, `models.py`, `routes/`, `services/`, `src/`) | ⚠️ Safe to delete after review |


### Key Decisions

| Decision | Reason |
|---|---|
| FastAPI over Flask | `async def` + `httpx.AsyncClient` for non-blocking GitHub polling; auto OpenAPI at `/docs` |
| JWT (Bearer) over server sessions | Token in `localStorage`, attached via Axios interceptor in `api/client.ts` |
| `httpx` over `requests` | Async required for `async def` route handlers |
| Oklch CSS variables | Runtime palette swapping without JS |
| SQLite kept | Local-first design; zero infra; existing `instance/database.db` migrated in-place |
| No Auto-Pairing by Recent Commits | Timelogs default `commit = None`, routing sends `project` + `commit` to frontend |
| Local Git Log DB (`instance/local-git-log-commits.db`) | Scrapes `git log` CLI to store local commit history for manual pairing panel |
| Ruff Linter Integration | Fast Python linting, import formatting, static analysis |
| Branch Commit Storage (`branch_commits` table) | Query GitHub branches API + store branch-labeled commits in SQLite |

---

## 🏗️ Architecture — Decoupled Monorepo

```
log_my_time/
├── GEMINI.md                     # This file: project context, rules, conventions
├── README.md                     # User-facing feature documentation
├── .env.example                  # Template for sensitive credentials
├── .env                          # Local environment secrets (gitignored)
├── .gitignore
├── backend/                      # FastAPI Python REST API
│   ├── app.py                    # FastAPI factory & server entry point
│   ├── requirements.txt          # Python deps
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py           # SQLAlchemy engine, session, Base
│   │   ├── user.py               # User ORM model
│   │   ├── repository.py         # GithubRepository ORM model
│   │   ├── time_entry.py         # TimeEntry ORM model
│   │   ├── commit_link.py        # CommitLink ORM model
│   │   └── branch_commit.py      # BranchCommit ORM model
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth_router.py        # GitHub OAuth
│   │   ├── repo_router.py        # Repo sync & archive
│   │   ├── time_router.py        # Time logging & summary
│   │   ├── commit_router.py      # Commit polling, pairing, branch-commits endpoint
│   │   └── data_router.py        # Data explorer & CSV export
│   ├── services/
│   │   ├── __init__.py
│   │   ├── github_service.py     # GitHub REST API client
│   │   ├── git_service.py        # Local git CLI subprocess
│   │   ├── sync_service.py       # Commit sync to timelogs branch
│   │   ├── pairing_service.py    # Commit ↔ timelog pairing logic
│   │   ├── branch_commit_service.py # Fetch & store branch commits
│   │   └── preference_service.py # Preference storage
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py               # Pydantic schemas for User
│   │   ├── repository.py         # Pydantic schemas for GithubRepository
│   │   ├── time_entry.py         # Pydantic schemas for TimeEntry
│   │   ├── commit_link.py        # Pydantic schemas for CommitLink
│   │   └── branch_commit.py      # Pydantic schemas for BranchCommit
│   └── migrations/
│       └── migrate_db.py         # Schema sync / migration script
└── frontend/                     # React + Vite + TypeScript SPA
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx              # App entry point
        ├── App.tsx               # Root router & layout
        ├── types/
        │   └── index.ts          # Shared TypeScript interfaces
        ├── api/
        │   ├── client.ts         # Axios client
        │   ├── auth.ts           # Auth API calls
        │   ├── repos.ts          # Repo API calls
        │   ├── time.ts           # Time entry API calls
        │   ├── commits.ts        # Commit API calls
        │   └── data.ts           # Data & export API calls
        ├── hooks/
        │   ├── useAuth.ts        # Auth state
        │   ├── useRepos.ts       # Repo list & archive state
        │   ├── useTimer.ts       # Circular timer engine
        │   ├── useCommitPoller.ts# Commit poller hook
        │   └── useTheme.ts       # Theme palette state
        ├── components/
        │   ├── layout/
        │   ├── timer/
        │   ├── repos/
        │   ├── commits/
        │   │   ├── CommitPairingQueue.tsx # Manual pairing with branch filter
        │   │   ├── CommitCard.tsx
        │   │   └── LocalGitStatus.tsx
        │   ├── data/
        │   ├── activity/
        │   ├── theme/
        │   └── shared/
        ├── pages/
        │   ├── Dashboard.tsx
        │   └── DataPage.tsx
        └── styles/
```

---

## 📊 Core Data Models

### `User`
| Field | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `github_user_id` | String | GitHub user ID |
| `github_username` | String | GitHub handle |
| `access_token` | Text | OAuth token (`repo` scope) |
| `avatar_url` | String | Profile image URL |
| `local_repo_path` | String (nullable) | Absolute path to local clone |
| `commit_poll_interval_minutes` | Integer | Poll interval in min (default: 5) |

### `GithubRepository`
| Field | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `user_id` | FK → User | |
| `full_name` | String | `owner/repo-name` |
| `default_branch` | String | e.g. `main` |
| `is_active` | Boolean | Active vs archived |

### `TimeEntry`
| Field | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `repo_id` | FK → GithubRepository | |
| `task_description` | String | |
| `duration_seconds` | Integer | |
| `duration_minutes` | Integer | |
| `is_synced` | Boolean | False until paired & pushed |
| `synced_at` | DateTime (nullable) | |
| `created_at` | DateTime | |

### `CommitLink`
| Field | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `time_entry_id` | FK → TimeEntry | |
| `repo_id` | FK → GithubRepository | |
| `commit_sha` | String | Full SHA of commit |
| `commit_message` | String | First line of commit message |
| `commit_date` | DateTime | Commit author date |
| `status` | Enum: `pending` / `confirmed` / `rejected` | Pairing status |
| `created_at` | DateTime | When detected |

### `BranchCommit`
| Field | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `repo_id` | FK → GithubRepository | |
| `branch_name` | String | Branch name |
| `commit_sha` | String | Full 40-char SHA |
| `short_sha` | String | 7-char short SHA |
| `message` | String | Commit subject |
| `author` | String | Commit author |
| `commit_date` | DateTime | Author date |
| `fetched_at` | DateTime | DB insertion timestamp |

---

## ⚡ Key Business Logic

### Commit Detection & Pairing Flow

1. Auto pairing disabled in `pairing_service.py`.
2. Timelogs default `commit = None` with explicit `project`.
3. Routing endpoints send `project` + `commit` to frontend.
4. On **Confirm**: `CommitLink.status` → `confirmed`, `TimeEntry.is_synced = True`, `sync_service.py` pushes to `timelogs` branch via GitHub Contents API.

### Local Git State
- `git_service.py` runs `git` CLI subprocess in `local_repo_path`.
- Returns branch, last commit SHA/message, staged/modified files.
- `LocalGitStatus.tsx` renders real-time state panel.

### GitHub Sync (on Confirm)
1. Ensure `timelogs` branch exists on remote.
2. Fetch `TimeLogs/timesheet.json` from `timelogs` branch.
3. Append `{commit_sha, task_description, duration_seconds, synced_at}` entry.
4. Commit & push via GitHub Contents API.
5. Set `TimeEntry.is_synced = True`, `synced_at = utcnow()`, `CommitLink.status = confirmed`.

---

## 🎨 UI & Layout

- **Theme**: Dark mode, Oklch palette CSS variables (`--bg-gradient`, `--card-bg`, `--card-border`, `--primary`), glassmorphism.
- **Dashboard Grid**:
  1. **Col 1** — `LoggingCard` + `TimerDial`: repo select, task input, SVG timer, controls, steppers (+15m, +30m, +60m).
  2. **Col 2** — `ReposCard` + `LocalGitStatus` + `CommitPairingQueue`: repos, git status, pairing queue with branch filter.
  3. **Col 3** — `ThemeCard` + `SavedPalettes`: Oklch customizer + profiles.
- **ActivityTable**: chronological entries, sync badges, delete.
- **DataPage**: hierarchy tree, KPI cards, CSV export.

---

## 📜 Development & Engineering Rules

### 1. General Principles
- **Preserve docstrings**: Keep existing comments unless logic changes.
- **Prompt Clarification**: Ask clarifying questions when prompts are ambiguous before execution.
- **Modularity**:
  - Routers handle HTTP concerns only.
  - Business logic in `services/`.
  - Pydantic schemas in `schemas/`.
  - ORM models in `models/` (one model per file).

### 2. Backend Conventions (FastAPI + Python)
- Typed Pydantic response models for all endpoints.
- `async def` for route handlers and I/O services.
- GitHub API via `github_service.py` only.
- Local git subprocess via `git_service.py` only.
- DB session via `Depends(get_db)`.
- Try/except with explicit rollback on DB/GitHub writes.

### 3. Frontend Conventions (React + Vite + TypeScript)
- **Strict TypeScript**: no `any`. Types in `types/index.ts`.
- **Vanilla CSS** in `styles/` — no Tailwind, no CSS-in-JS.
- API calls in `api/` modules only.
- Stateful logic in `hooks/` — presentation-only components.
- Dark-mode glassmorphism aesthetic.

### 4. File Size & Single Responsibility
- **Max 200 lines per file** — refactor when reaching limit.
- Subcomponents in `components/<feature>/` when exceeding 120 lines.
- One router, service, model, hook per file.

### 5. Security & Environment
- Load secrets from `.env` via `python-dotenv` / Vite `import.meta.env`.
- Validate `local_repo_path` server-side before git subprocess execution.

### 6. Feature Documentation
- Every new feature must be documented in `README.md`.

### 7. Markdown Output Routing
- Markdown files (except `GEMINI.md` / `README.md`) belong in `.obsidian/` subfolders. Never place in root.

### 8. Change Logging & Execution Plans
- Log changes in `.obsidian/logs/<what-was-done>-YYYY-MM-DD.md`.
- Use Obsidian links `[[path/to/file]]` when referencing code.
- **Plan Consolidation Rule**: Consolidate multi-step plan updates into a single plan log file in `.obsidian/logs/`.
