# Gemini Token Analytics Integration Plan

## Objective
Correlate AI assistance costs with local time-tracking data by parsing Antigravity IDE conversation logs and cross-referencing token spend timestamps against `TimeEntry` durations.

## Architecture & Data Flow

1. **Data Source (Backend Service)**
   - Create `backend/services/gemini_sync_service.py`.
   - The service will recursively scan the `C:\Users\mateu\.gemini\antigravity-ide\brain\` directory for `transcript.jsonl` files.
   - It will parse the JSONL steps, looking for AI model responses (`type: "PLANNER_RESPONSE"` or similar) to extract `timestamp` and token usage metrics (e.g., `prompt_tokens`, `completion_tokens`).

2. **Database Schema Update**
   - Add a `TokenUsage` model (or add columns to `TimeEntry`).
   - Given the strict timestamp matching requirement, it's best to create a dedicated `TokenUsage` table:
     - `id`, `time_entry_id` (FK), `timestamp`, `prompt_tokens`, `completion_tokens`, `model_name`.
   - Alternatively, pre-aggregate tokens directly onto the `TimeEntry` row: `total_prompt_tokens`, `total_completion_tokens` to save DB space.

3. **Correlation Engine (Strict Timestamp Matching)**
   - During the sync process, the service will iterate through all `TimeEntry` records.
   - For a given `TimeEntry` (which has `created_at` and `duration_seconds`), it will sum all token events where `event_time` falls exactly within `[created_at, created_at + duration_seconds]`.
   - These sums will be attached to the `TimeEntry` and exposed via the REST API.

## Frontend Visualization

Update the Analytics Dashboard (`DataPage.tsx` or new `AnalyticsPage.tsx`) to render the requested charts using `recharts` or `vis-network`/custom SVGs:

1. **Repo-Level KPI Cards**
   - Display "Total Tokens Spent", "Tokens per Minute", and an estimated "AI Cost" (calculating $ / 1M tokens based on Gemini Pro pricing).

2. **Cost vs Time Heatmap**
   - Enhance the GitHub-style heatmap to toggle between "Time Spent" (green) and "Token Intensity" (red/purple). Hotter colors indicate high-token-spend sessions.

3. **Token Burn-Rate Line Chart**
   - A dual-axis line chart overlaying "Hours Worked" (bars) with "Tokens Consumed" (line) over a weekly/monthly timeline.

## Phased Execution

- **Phase 1**: Backend script to locate, parse, and extract token counts from Antigravity `transcript.jsonl` logs.
- **Phase 2**: Database migration to store token counts on `TimeEntry`, and the strict-timestamp correlation logic.
- **Phase 3**: Expose data via `/data/analytics/tokens` endpoint.
- **Phase 4**: Frontend UI implementation of the KPIs, Line Chart, and Heatmap.
