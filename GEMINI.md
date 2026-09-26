# LogMyTime — Context, Architecture & Development Rules

This document outlines the current state, architecture, conventions, and rules for the **LogMyTime** project.

---

## 📌 Project Overview & Purpose

**LogMyTime** is a local-first web application that enables developers to track development time and **automatically pair time entries with GitHub commits**.

Core capabilities:
- Track time against local Git repositories and GitHub repos via a visual circular timer and manual duration controls.
- Automatically detect new commits (via GitHub API polling every N minutes) and surface a **confirm/reject UI** so the user explicitly links a commit to a timelog.
- Sync confirmed pairings to GitHub on every detected commit (no 60-minute threshold — every commit triggers a sync of its linked timelog).
- Read local git state (current branch, last commit, staged files) via server-side `git` CLI subprocess.
- Maintain a single-user, local-first SQLite database with SQLAlchemy ORM.

---

## 🔄 Session Status

| Item | State |
|---|---|
| v2 migration (Flask → FastAPI + React/Vite/TS) | ✅ Complete |
| `backend/` scaffold (models, routers, schemas, services) | ✅ Built & live on port 8000 |
| `frontend/` scaffold (hooks, api/, components, pages, styles) | ✅ Built; Vite dev on port 5173 |
| `instance/database.db` schema migration (CommitLink + new User cols) | ✅ Applied non-destructively |
| Backend endpoints verified live (`/auth/me`, `/repos/`, `/commits/git-status`) | ✅ Verified |
| End-to-end OAuth → Timer → CommitPairing → Sync flow | ⏳ Needs full e2e test |
| Legacy Flask root files (`app.py`, `models.py`, `routes/`, `services/`, `src/`) | ⚠️ Still present — safe to delete after e2e passes |

### Key Decisions Made

| Decision | Reason |
|---|---|
| FastAPI over Flask | `async def` + `httpx.AsyncClient` for non-blocking GitHub polling; auto OpenAPI docs at `/docs` |
| JWT (Bearer) over server sessions | SPA can't share server-side session cookies; token stored in `localStorage`, attached via Axios interceptor in `api/client.ts` |
| `httpx` over `requests` | Fully async; required for `async def` route handlers |
| Oklch CSS variables | Perceptually uniform; enables runtime palette swapping without JS |
| SQLite kept (not Postgres) | Local-first by design; zero infra; existing `instance/database.db` migrated in-place |

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
│   ├── requirements.txt          # Python deps (fastapi, uvicorn, sqlalchemy, python-dotenv, requests)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py           # SQLAlchemy engine, session, Base
│   │   ├── user.py               # User ORM model
│   │   ├── repository.py         # GithubRepository ORM model
│   │   ├── time_entry.py         # TimeEntry ORM model
│   │   └── commit_link.py        # CommitLink ORM model (timelog ↔ commit pairing)
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth_router.py        # GitHub OAuth (/auth/login, /auth/callback, /auth/logout)
│   │   ├── repo_router.py        # Repository sync, refresh, archive toggle
│   │   ├── time_router.py        # Time logging, deletion, summary
│   │   ├── commit_router.py      # Commit polling, pairing confirm/reject, local git state
│   │   └── data_router.py        # Hierarchy explorer, CSV export, preferences
│   ├── services/
│   │   ├── __init__.py
│   │   ├── github_service.py     # GitHub REST API client (OAuth, user, repos, commits, Contents API)
│   │   ├── git_service.py        # Local git CLI subprocess: branch, status, log, COMMIT_EDITMSG
│   │   ├── sync_service.py       # Commit-triggered sync: push timesheet.json to timelogs branch
│   │   ├── pairing_service.py    # Commit ↔ timelog auto-match logic & pending queue management
│   │   └── preference_service.py # File-based persistence for archive & selected-repo preferences
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py               # Pydantic request/response schemas for User
│   │   ├── repository.py         # Pydantic schemas for GithubRepository
│   │   ├── time_entry.py         # Pydantic schemas for TimeEntry
│   │   └── commit_link.py        # Pydantic schemas for CommitLink pairing
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
        │   └── index.ts          # Shared TypeScript interfaces (TimeEntry, Commit, Repo, etc.)
        ├── api/
        │   ├── client.ts         # Axios/fetch base client (base URL, interceptors, auth header)
        │   ├── auth.ts           # Auth API calls (/auth/*)
        │   ├── repos.ts          # Repo API calls (/repos/*)
        │   ├── time.ts           # Time entry API calls (/time/*)
        │   ├── commits.ts        # Commit pairing API calls (/commits/*)
        │   └── data.ts           # Data hierarchy & export API calls (/data/*)
        ├── hooks/
        │   ├── useAuth.ts        # Auth state, login/logout
        │   ├── useRepos.ts       # Repository list & archive state
        │   ├── useTimer.ts       # Circular timer engine (running, paused, elapsed)
        │   ├── useCommitPoller.ts# Polls /commits/pending on interval, surfaces confirm/reject queue
        │   └── useTheme.ts       # Oklch palette state, localStorage persistence
        ├── components/
        │   ├── layout/
        │   │   ├── Header.tsx
        │   │   └── TabsNav.tsx
        │   ├── timer/
        │   │   ├── TimerDial.tsx         # Circular SVG timer dial
        │   │   ├── LoggingCard.tsx       # Repo selector, task description, duration steppers
        │   │   └── ResetModal.tsx
        │   ├── repos/
        │   │   ├── ReposCard.tsx         # Active repos, progress bars, Sync Now
        │   │   └── ArchiveSection.tsx
        │   ├── commits/
        │   │   ├── CommitPairingQueue.tsx # Pending commit ↔ timelog match cards (confirm/reject)
        │   │   ├── CommitCard.tsx         # Single commit candidate with matched timelog preview
        │   │   └── LocalGitStatus.tsx     # Current branch, staged files, last commit
        │   ├── data/
        │   │   ├── DataTab.tsx
        │   │   ├── HierarchyTree.tsx      # Repo → User → Commits → Time → Date explorer
        │   │   └── DataRepoSelector.tsx
        │   ├── activity/
        │   │   └── ActivityTable.tsx      # Recent time entries, sync status badges, delete
        │   ├── theme/
        │   │   ├── ThemeCard.tsx          # Oklch palette customizer
        │   │   └── SavedPalettes.tsx
        │   └── shared/
        │       ├── FlashMessages.tsx
        │       └── HeroCard.tsx           # Unauthenticated welcome state
        ├── pages/
        │   ├── Dashboard.tsx             # Main dashboard: Timer + Repos + LocalGit + CommitQueue
        │   └── DataPage.tsx              # Data analytics tab page
        └── styles/
            ├── index.css                 # Global tokens, dark theme, CSS variables
            ├── timer.css                 # Circular SVG dial & controls
            ├── commits.css               # Commit pairing queue & cards
            ├── data-dashboard.css        # KPI cards & hierarchy tree
            └── theme.css                 # Oklch theme panel & saved palettes
```

---

## 📊 Core Data Models

### `User`
| Field | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `github_user_id` | String | GitHub unique user ID |
| `github_username` | String | GitHub handle |
| `access_token` | Text | OAuth token (`repo` scope) |
| `avatar_url` | String | Profile image URL |
| `local_repo_path` | String (nullable) | Absolute path to the local clone of the active project |
| `commit_poll_interval_minutes` | Integer | How often to poll GitHub for new commits (default: 5) |

### `GithubRepository`
| Field | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `user_id` | FK → User | |
| `full_name` | String | `owner/repo-name` |
| `default_branch` | String | e.g. `main` |
| `is_active` | Boolean | Active vs archived |

Computed: `unsynced_seconds`, `unsynced_minutes`.

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

### `CommitLink` *(new)*
| Field | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `time_entry_id` | FK → TimeEntry | |
| `repo_id` | FK → GithubRepository | |
| `commit_sha` | String | Full SHA of the linked commit |
| `commit_message` | String | First line of commit message |
| `commit_date` | DateTime | Commit author date |
| `status` | Enum: `pending` / `confirmed` / `rejected` | User-confirmed pairing |
| `created_at` | DateTime | When the pair was detected |

---

## ⚡ Key Business Logic

### Commit Detection & Pairing Flow

1. The backend `pairing_service.py` polls GitHub for new commits every `commit_poll_interval_minutes` (default 5).
2. When a new commit is detected for a tracked repository, it is matched against the **most recent unsynced `TimeEntry`** for that repo.
3. The matched pair is stored as a `CommitLink` with `status = pending`.
4. The frontend `useCommitPoller.ts` hook polls `/commits/pending` and surfaces a **CommitPairingQueue** UI: the user sees the commit message, the matched timelog, and can **Confirm** or **Reject**.
5. On **Confirm**: `CommitLink.status` → `confirmed`, `TimeEntry.is_synced = True`, and `sync_service.py` pushes the pairing to the `timelogs` branch on GitHub via the Contents API.
6. On **Reject**: `CommitLink.status` → `rejected`; the `TimeEntry` remains unsynced and eligible for the next commit match.

### Local Git State
- `git_service.py` runs `git` CLI subprocess commands inside the user-configured `local_repo_path`.
- Provides: current branch, last commit SHA + message, list of staged/modified files.
- The frontend `LocalGitStatus.tsx` component displays this as a real-time panel, refreshed alongside the commit poller.

### GitHub Sync (on Confirm)
1. Ensures `timelogs` branch exists on the remote.
2. Fetches `TimeLogs/timesheet.json` from the `timelogs` branch (or initializes it).
3. Appends the confirmed `{commit_sha, task_description, duration_seconds, synced_at}` entry.
4. Commits and pushes via GitHub Contents API.
5. Marks `TimeEntry.is_synced = True`, `synced_at = utcnow()`, `CommitLink.status = confirmed`.

---

## 🎨 UI & Layout

- **Theme**: Rich dark mode, Oklch palette CSS variables (`--bg-gradient`, `--card-bg`, `--card-border`, `--primary`), glassmorphism, micro-animations.
- **Dashboard Grid**:
  1. **Col 1** — `LoggingCard` + `TimerDial`: repo selector, task input, circular SVG timer, Pause/Resume/Stop, duration steppers (+15m, +30m, +60m).
  2. **Col 2** — `ReposCard` + `LocalGitStatus` + `CommitPairingQueue`: tracked repos, local git panel, pending confirm/reject commit cards.
  3. **Col 3** — `ThemeCard` + `SavedPalettes`: Oklch customizer, named palette profiles.
- **ActivityTable**: chronological recent entries, sync status badges, delete triggers.
- **DataPage**: hierarchy explorer, KPI cards, CSV export.

---

## ⏭️ Next Steps

- [ ] Run full e2e: GitHub OAuth → log a time entry → push a commit → confirm pairing in UI → verify `timelogs` branch updated
- [ ] Update GitHub OAuth App callback from `http://127.0.0.1:5000/callback` → `http://127.0.0.1:8000/auth/callback`
- [ ] Delete legacy root-level Flask files once e2e passes: `app.py`, `models.py`, `migrate_db.py`, `routes/`, `services/`, `src/`, `static/`, `templates/`
- [ ] Confirm `backend/requirements.txt` lists `python-jose[cryptography]` for JWT (needed for `auth_router.py`)
- [ ] Add `README.md` entry for Commit Pairing feature (rule §6)

---

## 📜 Development & Engineering Rules

### 1. General Principles
- **Preserve documentation**: Keep all existing comments and docstrings unless explicitly changing the associated logic.
- **Modularity**:
  - Routers handle HTTP concerns only (parsing, auth checks, response shape).
  - Business logic lives in `services/`.
  - Pydantic schemas live in `schemas/` — never inline.
  - ORM models live in `models/` — one model per file.

### 2. Backend Conventions (FastAPI + Python)
- All endpoints return typed Pydantic response models.
- Use `async def` for all route handlers and I/O-bound service calls.
- GitHub API calls go through `github_service.py` only — never directly in a router.
- Local git subprocess calls go through `git_service.py` only.
- DB session injected via FastAPI `Depends(get_db)` — never imported globally in routes.
- Wrap GitHub Contents API calls + DB writes in try/except with explicit rollback.

### 3. Frontend Conventions (React + Vite + TypeScript)
- **Strict TypeScript**: no `any`. All API response shapes typed in `types/index.ts`.
- **Vanilla CSS** in `styles/` — no Tailwind, no CSS-in-JS.
- API calls isolated in `api/` modules — no `fetch`/`axios` directly in components.
- Stateful logic in `hooks/` — components are presentation-only where possible.
- Micro-animations and hover effects on all interactive elements.
- Preserve dark-mode glassmorphism aesthetic from the existing design.

### 4. File Size & Single Responsibility
- **Maximum 200 lines per file** — refactor immediately when approaching this limit.
- Extract subcomponents into `components/<feature>/` when a component exceeds 120 lines.
- One router, one service, one model, one hook per file.
- Shared TypeScript types → `types/index.ts`. Shared Python types → `schemas/`.

### 5. Security & Environment
- Never hardcode GitHub client secrets, OAuth tokens, or session keys.
- Load all credentials from `.env` via `python-dotenv` (backend) and Vite `import.meta.env` (frontend).
- `local_repo_path` must be validated server-side (exists, is a git repo) before any subprocess call.

### 6. Feature Documentation
- Every new feature must have a corresponding entry in `README.md` explaining how the user can use it.

### 7. Markdown Output Routing
- Any generated `.md` file that is not `GEMINI.md` or `README.md` must be placed inside `.obsidian/` (or a subfolder). Never place session logs or outputs in the repository root.
