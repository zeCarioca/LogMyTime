# Branch-Aware Commit Storage & Routing Implementation Plan — 2026-09-29

Dedicated log tracking the execution of the multi-step branch-aware commit feature.

---

## Plan Overview
- Goal: Fetch branches from GitHub API, fetch commits per branch, store them labeled by branch in a dedicated `branch_commits` table, and expose an endpoint for the frontend.
- Single consolidated log file for all steps.

---

## Execution Progress

### Step 1: Create `BranchCommit` ORM Model
- **Status**: ✅ Completed
- **File**: [[backend/models/branch_commit.py]]
- **Details**: Created `BranchCommit` model with table `branch_commits`, columns (`id`, `repo_id`, `branch_name`, `commit_sha`, `short_sha`, `message`, `author`, `commit_date`, `fetched_at`), relationship to [[backend/models/repository.py]], and unique constraint `uq_repo_branch_commit` on `(repo_id, branch_name, commit_sha)`.

### Step 2: Register Model in Models Package
- **Status**: ✅ Completed
- **File**: [[backend/models/__init__.py]]
- **Details**: Imported `BranchCommit` and exported in `__all__`.

### Step 3: Create Pydantic Schemas
- **Status**: ✅ Completed
- **File**: [[backend/schemas/branch_commit.py]]
- **Details**: Created `BranchCommitOut`, `BranchCommitItem`, and `BranchWithCommitsOut` schemas.

### Step 4: Register Schemas in Schemas Package
- **Status**: ✅ Completed
- **File**: [[backend/schemas/__init__.py]]
- **Details**: Imported and exported `BranchCommitItem`, `BranchCommitOut`, and `BranchWithCommitsOut` in `__all__`.

### Step 5: Add `get_branches()` to GitHubService
- **Status**: ✅ Completed
- **File**: [[backend/services/github_service.py]]
- **Details**: Added async `get_branches(self, repo_full_name: str, per_page: int = 100)` to query GitHub REST API branches endpoint.

### Step 6: Create `BranchCommitService`
- **Status**: ✅ Completed
- **File**: [[backend/services/branch_commit_service.py]]
- **Details**: Created `BranchCommitService` with `sync_branch_commits_for_repo()` and `get_branches_with_commits()`. Implemented branch discovery via `GitHubService.get_branches`, commit fetching per branch, deduplication against existing database entries with `(repo_id, branch_name, commit_sha)`, and registered in [[backend/services/__init__.py]].

### Step 7: Add Router Endpoint
- **Status**: ✅ Completed
- **File**: [[backend/routers/commit_router.py]]
- **Details**: Added `GET /commits/branches-with-commits` endpoint returning `list[BranchWithCommitsOut]`, accepting optional query params `repo_id: int | None = None` and `refresh: bool = False`, delegating to `BranchCommitService.get_branches_with_commits()`.

### Step 8: Apply Database Migration
- **Status**: ✅ Completed
- **File**: [[backend/migrations/migrate_db.py]]
- **Details**: Created the `branch_commits` table in `instance/database.db` with columns `id`, `repo_id`, `branch_name`, `commit_sha`, `short_sha`, `message`, `author`, `commit_date`, and `fetched_at` along with the unique constraint. Verified schema via PRAGMA inspection.

### Step 9: Update Frontend API Client
- **Status**: ✅ Completed
- **File**: [[frontend/src/api/commits.ts]] & [[frontend/src/types/index.ts]]
- **Details**: Added `BranchCommitItem` and `BranchWithCommits` interfaces to TypeScript types. Added `getBranchesWithCommits(repoId?: number, refresh: boolean = false)` method to `commitsApi` in [[frontend/src/api/commits.ts]]. Verified with clean `tsc --noEmit`.

---

## Additional Frontend UI Updates
- **File**: [[frontend/src/components/commits/CommitPairingQueue.tsx]]
- **Details**: Swapped commit data source from `getRecent()` to `commitsApi.getBranchesWithCommits()`. Added a branch filter dropdown (`<select>`) at the top of the "Recent Commits" container displaying counts per branch, deductive "All Branches" aggregation, and a branch badge (`🌿 <branch>`) on each commit card. Fully type-checked with `npx tsc --noEmit`.
