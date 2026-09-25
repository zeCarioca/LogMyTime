# LogMyTime — Context, Architecture & Development Rules

This document outlines the current state, architecture, conventions, and rules for the **LogMyTime** project.

---

## 📌 Project Overview & Purpose

**LogMyTime** is a local-first web application built with **Flask (Python)**, **SQLite / SQLAlchemy ORM**, and the **GitHub REST API v3**.
Its core mission:
- Enable developers to track and log development time against their GitHub repositories locally.
- Implement a circular, intuitive visual timer and manual duration input controls.
- Automatically commit and synchronize an audit trail to GitHub once a repository reaches **$\ge$ 60 unsynced minutes** (stored in `TimeLogs/timesheet.json` on a dedicated `timelogs` branch).

---

## 🏗️ Architecture & Directory Structure

```
log_my_time/
├── .env.example                # Template for sensitive credentials
├── .env                        # Local environment secrets (loaded with python-dotenv)
├── archive_preferences.json    # Local JSON storage persisting archived / hidden repositories
├── database.db                 # Local SQLite database
├── requirements.txt            # Python dependencies (Flask, SQLAlchemy, requests, python-dotenv)
├── app.py                      # Flask application factory (create_app) & development runner
├── models.py                   # SQLAlchemy ORM definitions (User, GithubRepository, TimeEntry)
├── migrate_db.py               # Database migration / schema sync script
├── routes/
│   ├── __init__.py             # Route package exports (main_bp, auth_bp, repo_bp, time_bp)
│   ├── auth_routes.py          # GitHub OAuth (/login, /callback, /logout) & session management
│   ├── main_routes.py          # Main dashboard view route (/) & data orchestration
│   ├── repo_routes.py          # Repository sync, refresh (/repos/refresh) & archive toggle
│   └── time_routes.py          # Time logging (/log), threshold checking, manual sync & deletion
├── services/
│   ├── __init__.py
│   ├── github_service.py       # GitHub REST API client (OAuth, user, repos, Git data & Contents API)
│   └── preference_service.py   # File-based persistence for repository archive status
├── src/
│   └── palette-generator.ts    # Algorithmic Oklch palette generator module (pure math)
├── templates/
│   ├── index.html              # Main dashboard view orchestrator (< 50 lines)
│   └── components/             # Subcomponents extracted (< 120 lines each)
│       ├── header.html         # Top navigation header & user profile
│       ├── flash_messages.html # Flash alert notices
│       ├── tabs_nav.html       # Top-level functional tab switcher (Timer, Data)
│       ├── hero_card.html      # Unauthenticated welcome & OAuth setup state
│       ├── logging_card.html   # Repo selector & duration controls
│       ├── timer_dial.html     # Circular SVG timer dial & action buttons
│       ├── repos_card.html     # Sync thresholds & active repository list
│       ├── archive_section.html# Collapsible archived repositories
│       ├── theme_card.html     # Oklch customizer & saved palettes panel
│       ├── activity_table.html # Recent activity logs table
│       ├── data_tab.html       # Data & metrics placeholder tab view
│       └── reset_modal.html    # Timer reset confirmation modal
└── static/
    ├── css/
    │   ├── style.css           # Global tokens, dark theme, layout, responsive grid, theme panel
    │   └── timer.css           # Circular timer SVG dial & timer control buttons
    └── js/
        ├── tabs.js             # Tab navigation controller
        ├── main.js             # Circular timer engine, duration sync, modal, archive collapsible
        ├── color-math.js       # Pure Oklch/Oklab/sRGB color space transforms & gamut clipping
        ├── color-harmony.js    # Harmony calculation rules (Triadic, etc.) & aesthetic profiles
        ├── theme-tokens.js     # Dynamic CSS custom property application engine
        ├── color-inspector.js  # Swatches strip rendering & active color inspector controls
        ├── saved-palettes.js   # Saved palette profiles component (persistence, save/load/delete)
        └── bg-color-picker.js  # Standalone Oklch palette generator orchestrator component
```

---

## 📊 Core Data Models (`models.py`)

1. **`User`**:
   - `id`: Integer primary key.
   - `github_user_id`: GitHub unique user ID.
   - `github_username`: GitHub username handle.
   - `access_token`: OAuth token (requested with `repo` scope).
   - `avatar_url`: User avatar image URL.

2. **`GithubRepository`**:
   - `id`: Integer primary key.
   - `user_id`: Foreign key referencing `User`.
   - `full_name`: Format `owner/repo-name`.
   - `default_branch`: Target base branch (e.g. `main`).
   - `is_active`: Boolean flag indicating if active or archived.
   - Calculated property: `unsynced_minutes` ($\sum \text{duration where is\_synced=False}$).
   - Calculated property: `sync_progress_percent` towards the 60-minute threshold.

3. **`TimeEntry`**:
   - `id`: Integer primary key.
   - `repo_id`: Foreign key referencing `GithubRepository`.
   - `task_description`: Description of the task.
   - `duration_minutes`: Integer duration in minutes.
   - `is_synced`: Boolean flag (`False` by default).
   - `synced_at`: Timestamp when entry was synchronized to GitHub.
   - `created_at`: Creation timestamp.

---

## ⚡ Key Business Logic: 60-Minute GitHub Sync Threshold

- Logging an entry creates a `TimeEntry` with `is_synced = False`.
- The application evaluates total unsynced minutes for that repository:
  - **$< 60$ minutes:** Remains stored locally; visual progress bar updates towards threshold.
  - **$\ge 60$ minutes:** Automatically triggers sync via `services/github_service.py`:
    1. Ensures `timelogs` branch exists in remote repository.
    2. Fetches `TimeLogs/timesheet.json` on the `timelogs` branch (or initializes it).
    3. Appends all pending logs to the JSON array.
    4. Commits and pushes the file via GitHub Contents API.
    5. Atomically flags pending entries as `is_synced = True` with `synced_at = datetime.utcnow()`.
- Users can also trigger a manual sync at any time via the "Sync Now" button on repos with pending minutes.

---

## 🎨 UI & Layout State

- **Theme & Palette**: Rich dark aesthetics using custom CSS variables (`--bg-gradient`, `--card-bg`, `--card-border`, `--primary`).
- **Dashboard Grid**: Responsive layout containing:
  1. **Column 1 (`logging-card`)**: Repository selector, task description, circular SVG timer, controls (Pause/Resume/Stop), and duration steppers (`+15m`, `+30m`, `+60m`).
  2. **Column 2 (`repos-card`)**: Tracked active repositories, threshold progress bars, "Sync Now" actions, and collapsible Archive section.
  3. **Column 3 (`theme-column-wrapper`)**: Contains the interactive **Oklch Palette** customizer and the **Saved Palettes** container allowing users to name, save, persist (`localStorage`), and hot-swap custom color palettes.
- **Activity Table (`activity-table-card`)**: Chronological table of recent time entries with sync status badges and deletion triggers.

---

## 📜 Development & Engineering Rules

### 1. General Principles
- **Documentation & Comments**: Preserve existing comments, docstrings, and project structure unless explicit changes are requested.
- **Modularity**:
  - Keep route handlers focused on request parsing, session checks, and view/API responses.
  - Delegate GitHub API interactions to `services/github_service.py`.
  - Delegate preference persistence to `services/preference_service.py`.
  - Place shared data structures in `models.py`.

### 2. Frontend Conventions
- **Vanilla CSS & JS**: Do not introduce heavy frontend frameworks or Tailwind unless requested. Keep code lightweight and native.
- **Design Excellence**: Preserve the modern, sleek dark-mode aesthetic, micro-animations, glassmorphism, and responsive breakpoints.
- **Separation of Scripts**:
  - Maintain reusable, feature-specific JavaScript modules in `static/js/` (e.g. `main.js`, `bg-color-picker.js`).
  - Avoid inline scripts in templates where possible.

### 3. Database & Transactions
- When performing database updates alongside external network operations (like GitHub commits), wrap database updates in appropriate transactions (`db.session.commit()` / `db.session.rollback()`) to avoid inconsistent local vs. remote state.

### 4. Security & Environment
- Never hardcode GitHub client secrets, OAuth tokens, or session keys in repository files.
- Always load sensitive credentials from `.env` via `python-dotenv`.

### 5. Feature Documentation in README
- Whenever new functionality is added to the application, immediately append a clear, simple written explanation to `README.md` detailing how the feature can be used by the user.

# Architecture & File Size Limits
- Maximum file length: **200 lines**. If a file approaches 200 lines, refactor immediately.
- Single Responsibility: One component, hook, utility set, or route handler per file.
- Colocation & Extraction:
  - Extract subcomponents into a `components/` subfolder when a component exceeds 120 lines.
  - Move stateful logic, side effects, and complex handlers into custom hooks (`use*.ts`).
  - Move business logic, data transformers, and validation schemas into dedicated `utils/` or `services/`.
  - Move shared types/interfaces to a `types.ts` file or dedicated schema files.