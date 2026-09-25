# LogMyTime — GitHub Integrated Time Tracker

A local web application built with **Flask**, **SQLite & SQLAlchemy ORM**, and the **GitHub REST API v3** that lets developers log time against their repositories and automatically commits a `timesheet.json` audit trail directly to GitHub once 60 minutes of unsynced work have accumulated.

---

## 🏗️ Architecture & Directory Structure

```
log_my_time/
├── .env.example                # Template for sensitive credentials
├── .env                        # Local environment variables (loaded with python-dotenv)
├── requirements.txt            # Project dependencies
├── app.py                      # Application factory & runner
├── models.py                   # SQLAlchemy ORM models (User, GithubRepository, TimeEntry)
├── routes/
│   ├── __init__.py
│   └── main_routes.py          # OAuth flow, time logging, thresholds, sync API
├── services/
│   ├── __init__.py
│   └── github_service.py       # GitHub REST API v3 (OAuth, repos, Contents API)
├── templates/
│   └── index.html              # Main dashboard with progress bars & activity table
└── static/
    └── css/
        └── style.css           # Modern dark-mode styling and UI tokens
```

---

## 📦 Data Models

1. **`User`**:
   - `id`: Primary key
   - `github_user_id`: GitHub unique account ID
   - `github_username`: GitHub username
   - `access_token`: OAuth bearer token with `repo` scope
   - `avatar_url`: User profile avatar

2. **`GithubRepository`**:
   - `id`: Primary key
   - `user_id`: Foreign key referencing `User`
   - `full_name`: Format `owner/repo-name`
   - `default_branch`: Target branch (`main` or fetched from metadata)
   - Calculated property: `unsynced_minutes` ($\sum \text{duration where is\_synced=False}$)
   - Calculated property: `sync_progress_percent` towards the 60-minute threshold

3. **`TimeEntry`**:
   - `id`: Primary key
   - `repo_id`: Foreign key referencing `GithubRepository`
   - `task_description`: Description of work done
   - `duration_minutes`: Logged time in minutes
   - `is_synced`: Boolean flag (`False` initially)
   - `synced_at`: UTC timestamp of sync completion

---

## ⚡ 60-Minute GitHub Sync Threshold Logic

1. When a user logs time, the entry is saved to local SQLite with `is_synced = False`.
2. The total unsynced minutes for that specific repository are calculated:
   $$\text{Unsynced Minutes} = \sum (\text{duration\_minutes where } \text{is\_synced} = \text{False})$$
3. **If $< 60$ minutes:**
   - Saved locally. The UI displays remaining minutes needed to trigger sync (e.g. *"45/60 min logged — syncs automatically at 60 min"*).
4. **If $\ge 60$ minutes:**
   - Fetches the repository's `timesheet.json` via GitHub Contents API: `GET /repos/{owner}/{repo}/contents/timesheet.json` (decoding Base64 and obtaining the `sha` if it exists).
   - Appends all pending entries into the structured timesheet format.
   - Pushes the updated JSON file via `PUT /repos/{owner}/{repo}/contents/timesheet.json` with commit message: `chore: sync logged time (+X mins) [LogMyTime]`.
   - In a safe atomic database transaction, updates the local records to `is_synced = True` with the `synced_at` timestamp.

---

## 🚀 Setup & Execution Guide

### 1. Register GitHub OAuth App
1. Navigate to **GitHub Settings** > **Developer settings** > **OAuth Apps** > **New OAuth App** ([https://github.com/settings/applications/new](https://github.com/settings/applications/new)).
2. Fill in the fields:
   - **Application name**: `LogMyTime Local`
   - **Homepage URL**: `http://127.0.0.1:5000`
   - **Authorization callback URL**: `http://127.0.0.1:5000/callback`
3. Click **Register application**.
4. Generate a **Client Secret** and copy both the **Client ID** and **Client Secret**.

### 2. Configure Environment Variables
Edit your `.env` file in the root directory:
```ini
SECRET_KEY=generate-a-random-secret-key
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```
Open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your browser, click **Connect GitHub**, grant repository permissions, and start logging your development time!
