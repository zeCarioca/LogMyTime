# Verification Report: Backend Commit Storage & Frontend Routing

**Date**: 2026-09-29

## Overview & Architecture Audit
Audited the backend commit ingestion pipeline and frontend routing for commits.

### Backend Pipeline ([[backend/routers/commit_router.py]] & [[backend/services/pairing_service.py]])
- **Local SQLite DB Storage**: Commits are stored in `instance/local-git-log-commits.db` (scraped via local `git log`). `PairingService.fetch_recent_commits` queries `git_commits` table directly.
- **GitHub API Fallback**: If logged in with GitHub OAuth, `PairingService` calls `GitHubService.get_commits(...)` targeting active repositories in `GithubRepository`.
- **Local Subprocess Fallback**: Uses `GitService.get_recent_commits()` inside `user.local_repo_path`.
- **Deduplication**: `PairingService` deduplicates commits by `sha` across all active sources.
- **Backend Endpoint**: Available at `GET /commits/recent` via [[backend/routers/commit_router.py]].

### Frontend Pipeline ([[frontend/src/api/commits.ts]] & [[frontend/src/components/commits/CommitPairingQueue.tsx]])
- **API Call**: `commitsApi.getRecent()` fetches `RecentCommit[]` from `GET /commits/recent`.
- **Recent Commits Panel**: In the recent refactor of [[frontend/src/components/commits/CommitPairingQueue.tsx]], data bindings for `recentCommits` were cleared to prepare for the new branch structure. To display them, `commitsApi.getRecent()` needs to be wired into the right container state.
