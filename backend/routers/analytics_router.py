import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from models import User, get_db
from routers.auth_router import get_current_user
from services import AnalyticsService, AnalyticsInsights, AnalyticsExport
from schemas.analytics import (
    AnalyticsGoalOut,
    AnalyticsGoalUpdate,
    DailyBreakdownItem,
    WeeklySummaryItem,
    MonthlySummaryItem,
    CommitCorrelationItem,
    SessionStatsOut,
    HeatmapResponse,
    KeywordFrequencyItem,
    PairingCoverageOut,
    InsightsOut,
    AnalyticsExportRequest,
    DashboardSummaryResponse
)

router = APIRouter(tags=["Analytics"])

@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    date_start: datetime.date | None = Query(None),
    date_end: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_dashboard_summary(db, user, date_start, date_end)


@router.get("/daily", response_model=list[DailyBreakdownItem])
async def get_daily(
    date_start: datetime.date | None = Query(None),
    date_end: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_daily_breakdown(db, user, date_start, date_end)

@router.get("/weekly", response_model=list[WeeklySummaryItem])
async def get_weekly(
    date_start: datetime.date | None = Query(None),
    date_end: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_weekly_summaries(db, user, date_start, date_end)

@router.get("/monthly", response_model=list[MonthlySummaryItem])
async def get_monthly(
    date_start: datetime.date | None = Query(None),
    date_end: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_monthly_summaries(db, user, date_start, date_end)

@router.get("/per-commit", response_model=list[CommitCorrelationItem])
async def get_per_commit(
    date_start: datetime.date | None = Query(None),
    date_end: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_per_commit_breakdown(db, user, date_start, date_end)

@router.get("/sessions", response_model=SessionStatsOut)
async def get_sessions(
    date_start: datetime.date | None = Query(None),
    date_end: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_session_stats(db, user, date_start, date_end)

@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    level: str = Query(..., description="Zoom level: 'month', 'day', or 'commit'"),
    date_start: datetime.date | None = Query(None),
    date_end: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_heatmap(db, user, level, date_start, date_end)

@router.get("/keywords", response_model=list[KeywordFrequencyItem])
async def get_keywords(
    date_start: datetime.date | None = Query(None),
    date_end: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_keyword_frequency(db, user, date_start, date_end)

@router.get("/pairing", response_model=PairingCoverageOut)
async def get_pairing(
    date_start: datetime.date | None = Query(None),
    date_end: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_pairing_coverage(db, user, date_start, date_end)

@router.get("/insights", response_model=InsightsOut)
async def get_insights(
    date_start: datetime.date | None = Query(None),
    date_end: datetime.date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    insights = AnalyticsInsights.generate_insights(db, user, date_start, date_end)
    return InsightsOut(insights=insights)

@router.get("/goals", response_model=AnalyticsGoalOut)
async def get_goal(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = AnalyticsService.get_goal(db, user)
    if not goal:
        # Return default 0 goal
        goal = AnalyticsService.set_goal(db, user, 0)
    return goal

@router.put("/goals", response_model=AnalyticsGoalOut)
async def update_goal(
    payload: AnalyticsGoalUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsService.set_goal(db, user, payload.weekly_target_seconds)

@router.post("/export/json")
async def export_json(
    payload: AnalyticsExportRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsExport.generate_json(db, user, payload.date_start, payload.date_end, payload.repo_id)

@router.post("/export/markdown")
async def export_markdown(
    payload: AnalyticsExportRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsExport.generate_markdown(db, user, payload.date_start, payload.date_end, payload.repo_id)
