# Semantic Zoom Activity Heatmap
**Date:** 2026-09-30

## Overview
Implement Semantic Zoom Activity Heatmap (Backend, Frontend, UX). Replace `react-apexcharts` with high-perf HTML5 `<canvas>`.

## Milestones Completed

### Milestone 1: Backend Aggregation
- Update Pydantic schemas `[[backend/schemas/analytics.py]]` for hierarchical data (`HeatmapResponse`, `HeatmapDataPoint`).
- Refactor `AnalyticsService.get_heatmap` in `[[backend/services/analytics_service.py]]`.
- Replace Python iteration with SQLite `func.sum()`, `func.strftime` aggregations (`month`, `day`, `commit` zoom levels).
- Fix bug: passed `@property` to SQLAlchemy instead of `duration_seconds` col.

### Milestone 2: Canvas Foundation
- Create `[[frontend/src/components/analytics/ActivityHeatmap.tsx]]` via `<canvas>`.
- Implement `ResizeObserver` for dynamic DPI scaling.
- Rewrite color engine with native OKLCH interpolation (duration vs max).
- Draw 7-row geometric grid in 2D context.

### Milestone 3: Interaction & Semantic Zoom
- Create `[[frontend/src/hooks/useSemanticHeatmap.ts]]` to decouple zoom/fetch from global context.
- Add wheel listeners for `scale` (Ctrl+Scroll), `translateX` (Scroll/Shift+Scroll).
- Auto-step `zoomLevel` when scale passes thresholds (`>1.5`, `<0.5`).
- Add test script `[[backend/seed_5_years.py]]` to generate 5 years edge cases.

### Milestone 4: Polish & Tooltips
- Build absolute tooltip inside `[[frontend/src/components/analytics/ActivityHeatmap.tsx]]`.
- Implement reverse-transform to map screen `offsetX/Y` to grid indices across pan/zoom.
- Add CSS opacity transitions.
- Add dynamic visible date range edge indicator.
- Handle CSS `transform` trapping. Add fallback `[+]` `[-]` buttons.

## Conclusion
Heatmap responsive, zoom from 5 years to commit level, 60fps HTML5 canvas.
