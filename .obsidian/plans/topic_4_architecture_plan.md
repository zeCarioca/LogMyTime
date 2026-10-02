# Execution Plan: Technical Architecture Roadmap (Topic 4)

This document outlines the step-by-step technical implementation plan for the **Technical Architecture Roadmap**, focusing on how the backend FastAPI routes and the frontend React components will be wired together to support the entire Analytics module.

## 🎯 Goal
Establish a robust, performant data pipeline from the SQLite database through FastAPI, directly into the React visualization components, ensuring smooth load times and accurate metric calculations.

---

## 🛠️ Step-by-Step Implementation

### Step 1: Define API Contracts (Pydantic)
Before writing business logic, we define exactly what the frontend expects.
1. **File:** Update `backend/schemas/analytics.py` (New file).
2. **Schemas:**
   - `HeatmapDataPoint`: `{ "date": date, "duration_seconds": int, "commits": int }`
   - `KPISummary`: `{ "avg_time_per_commit": float, "most_productive_day": str, "burnout_risk_pct": float, "pending_sync_seconds": int }`
   - `TimeDistribution`: `{ "repository": str, "duration_seconds": int }`

### Step 2: Backend Services & Database Queries
1. **Service Layer:** Create `backend/services/analytics_service.py`.
2. **SQLAlchemy Queries:**
   - We must avoid N+1 queries. Use `func.sum`, `func.count`, and `group_by` directly on the `TimeEntry` and `CommitLink` tables.
   - Implement date filtering (e.g., `last_30_days`, `last_365_days`) passing specific `datetime` ranges to the queries.
3. **Router:** Mount these services inside `backend/routers/data_router.py` under the `/analytics` prefix.

### Step 3: Frontend Charting & Theming Setup
1. **Library Selection:** We will integrate **Recharts** (a composable charting library built on React components).
2. **Setup:** Run `npm install recharts` in the frontend.
3. **Theming Adapter:** Create a utility `styles/chartColors.ts` that reads our Oklch CSS variables (`getComputedStyle(document.documentElement).getPropertyValue('--primary')`) and feeds them into Recharts to ensure the charts perfectly match the current theme dynamically.

### Step 4: Frontend State Management (Custom Hooks)
1. **Hooks Creation:** Create `frontend/src/hooks/useAnalytics.ts`.
2. **Data Fetching:** 
   - Use `Axios` to fetch data from the new endpoints.
   - Implement basic `useEffect` / local state to handle `isLoading`, `data`, and `error` states. 
   - Add a date-range selector state (e.g., "Last 7 Days", "Last 30 Days", "All Time") that automatically refetches the data when changed.

### Step 5: Final Assembly & Optimization
1. Combine the Data Fetching hook with the Visual Components (Topic 2) inside the Tabbed Dashboard (Topic 1).
2. **Optimization:** Ensure the heatmap endpoint is cached or fast enough that it doesn't block the UI render. Use React `Suspense` or Skeleton loaders while waiting for the FastAPI response.

---

## 📅 Next Actions
- **Action 1:** Define the Pydantic schemas in the backend to lock in the API contract.
- **Action 2:** Write the SQLAlchemy aggregation queries in the service layer.
