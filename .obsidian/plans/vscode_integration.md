# VS Code Integration Plan for LogMyTime

## 🎯 Goal
Create VS Code extension interface with local `LogMyTime` FastAPI backend (`http://localhost:8000`). Log time, control timer, pair commits directly from IDE.

## 🏗️ Architecture
- **Extension Type**: TypeScript VS Code extension.
- **Location**: New folder in monorepo, e.g., `vscode-extension/`.
- **Communication**: HTTP requests to local FastAPI backend.
- **Authentication**: Backend uses GitHub OAuth. Extension need auth. Add "VS Code Login" flow (URI handler) or static API key from web dashboard.

## ✨ Proposed Features

### 1. Status Bar Item
- Persistent item in VS Code Status Bar (bottom right).
- Display current timer state (e.g., `⏱️ 15:20 (log_my_time)`).
- Click open Quick Pick menu actions: "Start Timer", "Stop Timer", "Select Repo".

### 2. Command Palette Commands
- `LogMyTime: Start Timer`
- `LogMyTime: Stop Timer`
- `LogMyTime: Add Manual Time Entry`
- `LogMyTime: View Unlinked Logs`

### 3. Sidebar View (Tree View)
- Dedicated Activity Bar icon (clock logo).
- **Repositories**: List tracked repos + sync progress to 60-min threshold.
- **Timelogs**: List recent unlinked timelogs.
- **Pairing**: Interface to link timelog to `git HEAD` or recent commit.

## ✅ Resolved Design Decisions
1. **Timer State Sync**: **migrate the active timer state to the backend** first. Synchronize timer state between web browser + VS Code extension.
2. **Authentication Flow**: Use **simple static API key/token** generated from web dashboard. Paste token into VS Code settings (`logmytime.apiToken`) for auth.
3. **Workspace Context**: Extension **automatically infer the repository context**. Detect open VS Code workspace folder + match against backend registered repositories.

## 🛠️ Implementation Phases

### Phase 1: Backend Preparation (Timer Sync & Auth)
1. **Timer State Migration**: Add `ActiveTimer` model/table to backend. Track `current_repo_id`, `start_time`, `task_description`. Update frontend (`useTimer.ts`) to use backend state.
2. **Static API Token**: Add functionality in web UI to generate + copy static API token. Update backend accept token in `Authorization` header for CLI/Extension requests.

### Phase 2: Scaffold Extension & Authentication
1. Initialize extension using `yo code`.
2. Add VS Code configuration settings API URL (`logmytime.apiUrl`, default `http://localhost:8000`) + auth token (`logmytime.apiToken`).
3. Setup Axios client communicate with `apiUrl` using `apiToken`.

### Phase 3: Timer & Status Bar (Core UX)
1. **Workspace Inference**: Auto detect open git repository + match to `repo_id` in backend.
2. **Status Bar Item**: Status Bar item show current active timer + unsynced time for inferred repository.
3. **Timer Commands**: Command palette actions "Start Timer" + "Stop Timer" interface with backend timer endpoints.

### Phase 4: Sidebar & Git Integration (Advanced UX)
1. Create Tree Data Provider for VS Code sidebar. List tracked repos + recent unlinked timelogs.
2. Integrate with VS Code git API (`vscode.extensions.getExtension('vscode.git')`).
3. Add command "Link selected unlinked logs to current Commit", call backend `POST /commits/bulk-link` endpoint from IDE.
