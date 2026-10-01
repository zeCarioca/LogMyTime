# LogMyTime — Context, Architecture & Rules

State, architecture, rules for **LogMyTime**.

---

## 📌 Project Overview & Purpose

**LogMyTime**: local-first web app track dev time + **pair time entries with GitHub commits**.

Capabilities:
- Track time vs local Git & GitHub repos via circular timer + manual controls.
- Detect new commits (GitHub API poll) + show **confirm/reject UI** link commit to timelog.
- Sync confirmed pairings to GitHub on every commit.
- Read local git state via server `git` CLI subprocess.
- Single-user, local SQLite DB via SQLAlchemy ORM.

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
| Frontend Repo Unarchiving & Theme Persistence | ✅ Built & Verified |
| `instance/local-git-log-commits.db` local git log database | ✅ Populated |
| Frontend `pairing-panel` local commit integration | ✅ Verified |
| Codebase Linting (Ruff for Python & `tsc --noEmit` for TypeScript) | ✅ Verified |
| Legacy Flask root files (`app.py`, `models.py`, `routes/`, `services/`, `src/`) | ⚠️ Safe delete after review |

### Key Decisions

| Decision | Reason |
|---|---|
| FastAPI over Flask | `async def` + `httpx.AsyncClient` non-blocking GitHub polling; auto OpenAPI at `/docs` |
| JWT (Bearer) over server sessions | Token in `localStorage`, attached via Axios interceptor in `api/client.ts` |
| `httpx` over `requests` | Async required for `async def` route handlers |
| Oklch CSS variables | Runtime palette swapping without JS |
| SQLite kept | Local-first; zero infra; existing `instance/database.db` migrated |
| No Auto-Pairing | Timelogs default `commit = None`. Routing sends `project` + `commit` to frontend |
| Local Git Log DB (`instance/local-git-log-commits.db`) | Scrapes `git log` CLI store local commit history for manual pairing panel |
| Ruff Linter Integration | Fast Python linting, import formatting, static analysis |
| Branch Commit Storage (`branch_commits` table) | Query GitHub branches API + store branch-labeled commits in SQLite |

---

## 🏗️ Architecture — Decoupled Monorepo

```
log_my_time/
├── GEMINI.md                     # This file: context, rules
├── README.md                     # User docs
├── .env.example                  # Template secrets
├── .env                          # Local secrets (gitignored)
├── .gitignore
├── backend/                      # FastAPI Python REST API
│   ├── app.py                    # Entry point
│   ├── requirements.txt          # Python deps
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py           # SQLAlchemy engine, session, Base
│   │   ├── user.py               # User ORM
│   │   ├── repository.py         # GithubRepository ORM
│   │   ├── time_entry.py         # TimeEntry ORM
│   │   ├── commit_link.py        # CommitLink ORM
│   │   └── branch_commit.py      # BranchCommit ORM
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth_router.py        # GitHub OAuth
│   │   ├── repo_router.py        # Repo sync & archive
│   │   ├── time_router.py        # Time logging
│   │   ├── commit_router.py      # Commit polling, pairing
│   │   └── data_router.py        # Data explorer & CSV export
│   ├── services/
│   │   ├── __init__.py
│   │   ├── github_service.py     # GitHub REST client
│   │   ├── git_service.py        # Local git CLI subprocess
│   │   ├── sync_service.py       # Commit sync to timelogs branch
│   │   ├── pairing_service.py    # Commit ↔ timelog logic
│   │   ├── branch_commit_service.py # Fetch branch commits
│   │   └── preference_service.py # Preferences
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py               # User schemas
│   │   ├── repository.py         # GithubRepository schemas
│   │   ├── time_entry.py         # TimeEntry schemas
│   │   ├── commit_link.py        # CommitLink schemas
│   │   └── branch_commit.py      # BranchCommit schemas
│   └── migrations/
│       └── migrate_db.py         # Schema migration script
└── frontend/                     # React + Vite + TypeScript SPA
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx              # Entry point
        ├── App.tsx               # Root router & layout
        ├── types/
        │   └── index.ts          # Shared TS interfaces
        ├── api/
        │   ├── client.ts         # Axios client
        │   ├── auth.ts           # Auth API
        │   ├── repos.ts          # Repo API
        │   ├── time.ts           # Time entry API
        │   ├── commits.ts        # Commit API
        │   └── data.ts           # Data export API
        ├── hooks/
        │   ├── useAuth.ts        # Auth state
        │   ├── useRepos.ts       # Repo state
        │   ├── useTimer.ts       # Circular timer engine
        │   ├── useCommitPoller.ts# Commit poller hook
        │   └── useTheme.ts       # Theme palette state
        ├── components/
        │   ├── layout/
        │   ├── timer/
        │   ├── repos/
        │   ├── commits/
        │   │   ├── CommitPairingQueue.tsx # Manual pairing
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
| `local_repo_path` | String (nullable) | Absolute path local clone |
| `commit_poll_interval_minutes` | Integer | Poll interval min (default: 5) |

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
1. Auto pairing disabled `pairing_service.py`.
2. Timelogs default `commit = None` explicit `project`.
3. Routing endpoints send `project` + `commit` frontend.
4. On **Confirm**: `CommitLink.status` → `confirmed`, `TimeEntry.is_synced = True`, `sync_service.py` push `timelogs` branch via GitHub Contents API.

### Local Git State
- `git_service.py` run `git` CLI subprocess `local_repo_path`.
- Returns branch, last commit SHA/message, staged/modified files.
- `LocalGitStatus.tsx` render real-time state panel.

### GitHub Sync (on Confirm)
1. Ensure `timelogs` branch exists remote.
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

## 📜 Development Rules

### 1. General Principles
- **Preserve docstrings**: Keep comments unless logic changes.
- **Prompt Clarification**: Ask if prompts ambiguous before execution.
- **Modularity**:
  - Routers: HTTP concerns.
  - Business logic: `services/`.
  - Pydantic schemas: `schemas/`.
  - ORM models: `models/` (one model per file).

### 2. Backend Conventions
- Typed Pydantic response models all endpoints.
- `async def` route handlers and I/O services.
- GitHub API via `github_service.py` only.
- Local git subprocess via `git_service.py` only.
- DB session via `Depends(get_db)`.
- Try/except explicit rollback on DB/GitHub writes.

### 3. Frontend Conventions
- **Strict TypeScript**: no `any`. Types `types/index.ts`.
- **Vanilla CSS** `styles/` — no Tailwind, no CSS-in-JS.
- API calls `api/` modules only.
- Stateful logic `hooks/` — presentation-only components.
- Dark-mode glassmorphism aesthetic.

### 4. File Size & Responsibility
- **Max 200 lines per file** — refactor when limit reached.
- Subcomponents `components/<feature>/` when >120 lines.
- One router, service, model, hook per file.

### 5. Security & Environment
- Load secrets `.env` via `python-dotenv` / Vite `import.meta.env`.
- Validate `local_repo_path` server-side before git subprocess execution.

### 6. Feature Documentation
- Document new features `README.md`.

### 7. Markdown Output Routing
- Markdown files (except `GEMINI.md` / `README.md`) belong `.obsidian/` subfolders. Never place root.

### 8. Change Logging & Execution Plans
- Log changes `.obsidian/logs/<what-was-done>-YYYY-MM-DD.md`.
- Use Obsidian links `[[path/to/file]]` referencing code.
- **Plan Consolidation**: Consolidate multi-step plan updates single plan log file `.obsidian/logs/`.
