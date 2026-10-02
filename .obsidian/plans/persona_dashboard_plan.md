# Execution Plan: Persona-Based Modular Dashboard (Topic 1)

This document outlines the step-by-step implementation plan for the **Core Value Proposition by Persona** feature, which introduces a tabbed/modular layout for the new Data Analytics section.

## 🎯 Goal
Create the main `<AnalyticsDashboard />` component that houses 4 distinct "Persona" tabs. Each tab will focus on a specific set of metrics (Billing, Estimation, Productivity, Work-Life Balance) to avoid overwhelming the user with data.

---

## 🛠️ Step-by-Step Implementation

### Step 1: Frontend Routing & Scaffold
1. **Route Creation:** 
   - Add a new route `/analytics` in `App.tsx`.
   - Update the main navigation sidebar/header to include a link to "Analytics".
2. **Base Component:**
   - Create `frontend/src/pages/AnalyticsPage.tsx`.
   - Implement the core layout with a tabbed interface (e.g., using a custom `TabGroup` component styled with our Oklch variables).

### Step 2: Tab Architecture & State Management
1. **State:** 
   - Add a `useAnalyticsState` hook or simple local state to track the `activeTab` (`'freelancer' | 'planner' | 'executor' | 'human'`).
2. **Tab Components Scaffold:**
   - Create empty placeholder components for each view:
     - `<FreelancerTab />` (Billing & Invoicing)
     - `<PlannerTab />` (Estimation Accuracy)
     - `<ExecutorTab />` (Productivity Heatmaps)
     - `<HumanTab />` (Work-Life Balance)

### Step 3: Backend Data Aggregation Routers
We need to ensure the `backend/routers/data_router.py` can feed these specific views.
1. **`/analytics/billing` (Freelancer):**
   - Returns aggregated time grouped by `project` and `repository`.
   - Calculates total billable time for a given date range.
2. **`/analytics/estimation` (Planner):**
   - Returns average time spent per `commit` or per `task_description`.
3. **`/analytics/productivity` (Executor):**
   - Returns raw daily time logs for the Activity Heatmap.
   - Calculates "Most productive day".
4. **`/analytics/wellness` (Human):**
   - Returns time entries grouped by hour of the day (0-23) and day of the week to detect weekend/late-night work.

### Step 4: UI Implementation & Theming
1. **Design System Integration:** 
   - Ensure all tabs use the `glassmorphism` aesthetic defined in `useTheme.ts`.
   - Build generic KPI Card components (`<StatCard title="..." value="..." trend="..." />`) that can be reused across all 4 tabs.
2. **Component Integration:**
   - Wire up the API calls (`api/analytics.ts`) to feed data into the respective tabs.

### Step 5: Testing & Refinement
1. Verify tab switching is instantaneous (client-side routing or state).
2. Ensure the Oklch palette correctly colors the active/inactive tabs.
3. Validate backend endpoints efficiently aggregate SQLite data without N+1 query issues.

---

## 📅 Next Actions
- **Action 1:** Scaffold the `AnalyticsPage.tsx` and the 4 Tab components in the frontend.
- **Action 2:** Build the FastAPI endpoints to supply the necessary JSON payloads for each persona.
