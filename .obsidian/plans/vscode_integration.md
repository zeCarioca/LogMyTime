# VS Code Integration Plan for LogMyTime

## 🎯 Goal
Create a VS Code extension that interfaces with the local `LogMyTime` FastAPI backend (`http://localhost:8000`), allowing developers to log time, control the timer, and pair commits directly from their IDE without switching to the web dashboard.

## 🏗️ Architecture
- **Extension Type**: TypeScript-based VS Code extension.
- **Location**: A new folder in the monorepo, e.g., `vscode-extension/`.
- **Communication**: The extension will make HTTP requests to the existing local FastAPI backend.
- **Authentication**: Since the backend uses GitHub OAuth (JWT stored in `localStorage` in the frontend), the extension will need a way to authenticate. We can add a "VS Code Login" flow (URI handler) or a simpler static API key generated from the web dashboard.

## ✨ Proposed Features

### 1. Status Bar Item
- A persistent item in the VS Code Status Bar (bottom right).
- Displays current timer state (e.g., `⏱️ 15:20 (log_my_time)`).
- Clicking it opens a Quick Pick menu with actions: "Start Timer", "Stop Timer", "Select Repo".

### 2. Command Palette Commands
- `LogMyTime: Start Timer`
- `LogMyTime: Stop Timer`
- `LogMyTime: Add Manual Time Entry`
- `LogMyTime: View Unlinked Logs`

### 3. Sidebar View (Tree View)
- A dedicated Activity Bar icon (a clock logo).
- **Repositories**: List tracked repos and their sync progress towards the 60-min threshold.
- **Timelogs**: List recent unlinked timelogs.
- **Pairing**: Interface to quickly link a timelog to the current `git HEAD` or a recent commit.

## ✅ Resolved Design Decisions
1. **Timer State Sync**: We will **migrate the active timer state to the backend** first. This ensures that the timer state is synchronized seamlessly between the web browser and the VS Code extension.
2. **Authentication Flow**: We will use a **simple static API key/token** generated from the web dashboard. Users will paste this token into their VS Code settings (`logmytime.apiToken`) for authentication.
3. **Workspace Context**: The extension will **automatically infer the repository context** by detecting the currently open VS Code workspace folder and matching it against the backend's registered repositories.

## 🛠️ Implementation Phases

### Phase 1: Backend Preparation (Timer Sync & Auth)
1. **Timer State Migration**: Add an `ActiveTimer` model/table (or user fields) to the backend to track `current_repo_id`, `start_time`, and `task_description`. Update the frontend (`useTimer.ts`) to rely on this backend state.
2. **Static API Token**: Add functionality in the web UI for users to generate and copy a static API token. Update the backend to accept this token in the `Authorization` header for CLI/Extension requests.

### Phase 2: Scaffold Extension & Authentication
1. Initialize the extension using `yo code`.
2. Add VS Code configuration settings for the API URL (`logmytime.apiUrl`, defaulting to `http://localhost:8000`) and the auth token (`logmytime.apiToken`).
3. Setup an Axios client to communicate with the configured `apiUrl` using the `apiToken`.

### Phase 3: Timer & Status Bar (Core UX)
1. **Workspace Inference**: Automatically detect the open git repository and match it to a `repo_id` in the backend.
2. **Status Bar Item**: Implement the Status Bar item showing the current active timer (polled or pushed from backend) and unsynced time for the inferred repository.
3. **Timer Commands**: Implement command palette actions to "Start Timer" and "Stop Timer" that interface with the new backend timer endpoints.

### Phase 4: Sidebar & Git Integration (Advanced UX)
1. Create a Tree Data Provider for the VS Code sidebar to list tracked repos and recent unlinked timelogs.
2. Integrate with VS Code's built-in git API (`vscode.extensions.getExtension('vscode.git')`).
3. Add a command to "Link selected unlinked logs to current Commit", calling the backend's `POST /commits/bulk-link` endpoint directly from the IDE.
