# Execution Plan: Visual Components - Heatmap & KPI Cards (Topic 2)

This document outlines the step-by-step implementation plan for the **Key Visual Components** feature, focusing on the GitHub-style Activity Heatmap and the Smart KPI Cards.

## 🎯 Goal
Implement the core visual engines of the Analytics Dashboard. The Heatmap will visualize daily time investment over the past year, while the KPI Cards will surface immediate, actionable insights (averages, burnout warnings, and pending syncs).

---

## 🛠️ Step-by-Step Implementation

### Step 1: Backend Aggregation for Heatmap
1. **Endpoint:** Create `GET /analytics/heatmap` in `backend/routers/data_router.py`.
2. **Logic:**
   - Query `TimeEntry` records from the last 365 days.
   - Group by `DATE(created_at)` and sum `duration_seconds`.
   - Ensure the query is efficient (e.g., using `func.sum` and `group_by` in SQLAlchemy).
3. **Payload:** Return a structured list: `[{ date: 'YYYY-MM-DD', total_seconds: 14400, entry_count: 5 }, ...]`.

### Step 2: Backend Aggregation for KPI Cards
1. **Endpoint:** Create `GET /analytics/kpis`.
2. **Logic & Calculations:**
   - **Average time per commit:** Sum of all synced time divided by the count of `CommitLink`s with `status = 'confirmed'`.
   - **Most Productive Day:** Group time by `EXTRACT(DOW FROM created_at)` to find the day of the week with the highest average.
   - **Burnout Warning:** Calculate the percentage of time logged on weekends or outside standard working hours (e.g., 8 AM - 6 PM).
   - **Pending Syncs:** Sum of `duration_seconds` for all `TimeEntry` records where `is_synced == False`.

### Step 3: Frontend Component: Activity Heatmap
1. **Component Scaffold:** Create `<ActivityHeatmap />` in `frontend/src/components/analytics/`.
2. **Rendering Strategy:**
   - Build a custom SVG grid or use a library like `react-calendar-heatmap` that supports deep CSS customization.
   - Map the `total_seconds` to a 4-tier color intensity scale using our Oklch variables (e.g., empty = `--bg-muted`, highest = `--primary`).
3. **Interactivity:** Add a custom tooltip that appears on hover, displaying the exact date, total hours logged, and number of tasks.

### Step 4: Frontend Component: Smart KPI Cards
1. **Component Scaffold:** Create `<KpiCard />` in `frontend/src/components/analytics/`.
2. **Design:** Apply the existing glassmorphism aesthetic (`--card-bg`, `--card-border`).
3. **Props:** Accept `title`, `value`, `subtext` (for trends/warnings), and an optional `icon`.
4. **Implementation:** Render a grid of 4 cards at the top of the dashboard using the data from the `/analytics/kpis` endpoint.

### Step 5: Integration & Polish
1. Implement loading skeletons for both the Heatmap (a grid of gray squares) and the KPI cards to ensure a smooth user experience while data is being fetched.
2. Ensure the Heatmap has a horizontal scroll container for smaller screens/mobile to preserve the 52-week layout.

---

## 📅 Next Actions
- **Action 1:** Write the SQLAlchemy queries and endpoints in `data_router.py` for both the heatmap and KPIs.
- **Action 2:** Build the `<KpiCard />` and `<ActivityHeatmap />` components in React and wire them up to the API.
