# LogMyTime — GitHub Integrated Time Tracker

A local web application built with **Flask**, **SQLite & SQLAlchemy ORM**, and the **GitHub REST API v3** that lets developers log time against their repositories and automatically commits a `TimeLogs/timesheet.json` audit trail directly to GitHub once 60 minutes of unsynced work have accumulated.

---

## 🏗️ Architecture & Directory Structure

```
log_my_time/
├── .env.example                # Template for sensitive credentials
├── .env                        # Local environment variables (loaded with python-dotenv)
├── archive_preferences.json    # Local persistent storage for archived repositories
├── requirements.txt            # Project dependencies
├── app.py                      # Application factory & runner
├── models.py                   # SQLAlchemy ORM models (User, GithubRepository, TimeEntry)
├── routes/
│   ├── __init__.py             # Route package exports
│   ├── auth_routes.py          # GitHub OAuth login, callback, user session & logout
│   ├── main_routes.py          # Dashboard view & data orchestration
│   ├── repo_routes.py          # Repository sync, refresh & archive/hide toggle
│   └── time_routes.py          # Time logging, threshold checking, sync API & deletion
├── services/
│   ├── __init__.py
│   ├── github_service.py       # GitHub REST API v3 (OAuth, repos, Contents & Ref API)
│   └── preference_service.py   # Local archive preferences JSON file storage
├── templates/
│   ├── index.html              # Main dashboard view orchestrator
│   └── components/             # Modular dashboard components (< 120 lines each)
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
    │   ├── style.css           # Modern dark-mode styling and UI tokens
    │   └── timer.css           # Circular timer & duration controls styles
    └── js/
        ├── tabs.js             # Tab navigation controller
        ├── main.js             # Timer engine, quick steppers, modal & archive toggles
        └── ...                 # Modular Oklch palette generators & theme managers
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
   - Ensures the `timelogs` branch exists in the repository (creates `refs/heads/timelogs` from the default branch via GitHub Git Data API if it does not yet exist).
   - Fetches `TimeLogs/timesheet.json` on the `timelogs` branch via GitHub Contents API: `GET /repos/{owner}/{repo}/contents/TimeLogs/timesheet.json?ref=timelogs` (decoding Base64 and obtaining the `sha` if it exists).
   - Appends all pending entries into the structured timesheet format.
   - Pushes the updated JSON file to the `timelogs` branch via `PUT /repos/{owner}/{repo}/contents/TimeLogs/timesheet.json` with commit message: `chore: sync logged time (+X mins) [LogMyTime]`.
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

---

## 🎨 Oklch Theme & Palette Customizer (User Guide)

The application features an interactive color palette customizer built on the **Oklch color model** that harmonizes cards, borders, buttons, and backgrounds.

### How to Use the Feature:
1. **Open the Theme Panel**:
   - Locate the **Oklch Palette** container on the right side of the dashboard and click **Customize** (or click the card header) to expand the controls.
2. **Select a Color Harmony & Aesthetic Profile**:
   - Use the **Harmony Engine** dropdown to pick color relationships (such as *Triadic*, *Analogous*, *Complementary*, *Split-Complementary*, or *Tetradic*).
   - Select an **Aesthetic Profile** (*Pastel*, *Vibrant*, *Neon*, *Jewel*, or *Earthy*) to define the palette's lightness, saturation, and contrast character.
3. **Adjust the Base Hue or Randomize**:
   - Drag the continuous **Base Hue** rainbow slider ($0^\circ - 360^\circ$) to dynamically rotate the entire palette.
   - Or click **🎲 Randomize** to generate an unexpected, visually balanced combination.
4. **Lock Specific Colors**:
   - Click any swatch in the palette strip to inspect it.
   - Click the **Lock** button (`🔒`) to lock that color. When you randomize or change the base hue slider, **locked colors will not change**, allowing you to protect colors you like while experimenting with the rest.
5. **Manually Edit a Color**:
   - With any color selected, type a custom 6-digit hex code in the `#` input field (e.g. `4F46E5`), or click the color swatch preview to open your system's native color picker.
6. **Reset Anytime**:
   - Click **Reset Default** to return to the app's default dark theme. All selections (including colors, lock states, and whether the palette panel is expanded or collapsed) are automatically remembered across page reloads and app sessions.
7. **Save & Load Custom Profiles**:
   - Locate the **Saved Palettes** container beneath the palette customizer. Click the header or the **View** button to expand or collapse the section.
   - Type a descriptive name in the text field (e.g. `Cyberpunk Cyan` or `Forest Moss`).
   - Click **Save** to store the full palette snapshot (including base hue, harmony, aesthetic profile, and locked states) in persistent storage.
   - Browse your saved profiles in the list and click **Load** to instantly re-apply any saved palette to the application.
   - Click the delete button (`×`) beside any profile to remove it.

---

## 📑 Navigation Tabs (Timer & Data)

Beneath the header, a sleek tab container organizes core functions:

- **Timer Tab**: The default active tab containing the current application interface (time logger, circular SVG timer dial, tracked repositories with 60-minute sync progress, theme customizer, and activity logs).
- **Data Tab**: A dedicated analytics dashboard displaying a structured hierarchy (`Repository -> UserList (self) -> Commits -> Time -> Date`) along with KPI cards, a **Repository Selector container** that persists user preferences, and an **Export CSV for Python** button (`/data/export/csv`) designed for immediate ingestion and analysis in pandas.

---

## 📈 Data & Analytics Dashboard

The **Data** tab features:
1. **Repository Selector Container**: Allows scoping analytics to a specific repository or viewing an aggregated overview across all tracked repositories. The chosen repository is automatically persisted to user preferences (`archive_preferences.json` via `/data/preference/selected-repo`), reloading seamlessly across sessions.
2. **Structured Hierarchy**:
   - **Repository**: Grouped by repository with branch details, total logged duration, and commit counts.
   - **UserList**: Defaults to the authenticated developer (`self`).
   - **Commits**: Linked commit history for the active author.
   - **Time**: Detailed task time logs and sync statuses (`Synced` vs `Pending`).
   - **Date**: Timestamps and ISO dates for chronological tracking.

### 📥 Python Data Analysis CSV Export
Click the **"Export CSV for Python"** button in the Data tab header (or query `/data/export/csv`) to download an audit CSV file pre-formatted for Python & Pandas data exploration:
```python
import pandas as pd

# Load LogMyTime exported data
df = pd.read_csv('logmytime_export_YYYYMMDD_HHMMSS.csv')
print(df.groupby('repository')['duration_minutes'].sum())
```


