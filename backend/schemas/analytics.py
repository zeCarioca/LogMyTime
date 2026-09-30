from datetime import datetime
from pydantic import BaseModel, Field

class AnalyticsGoalBase(BaseModel):
    weekly_target_seconds: int = Field(0, description="Weekly target in seconds")

class AnalyticsGoalUpdate(AnalyticsGoalBase):
    pass

class AnalyticsGoalOut(AnalyticsGoalBase):
    id: int
    user_id: int
    updated_at: datetime

    class Config:
        orm_mode = True

class DailyBreakdownItem(BaseModel):
    date: str
    total_seconds: int
    total_minutes: float
    entry_count: int
    repos_touched: int

class WeeklySummaryItem(BaseModel):
    week_label: str
    week_start: str
    week_end: str
    total_seconds: int
    total_minutes: float
    entry_count: int
    goal_seconds: int | None
    goal_pct: float | None
    delta_vs_prior_week: int | None

class MonthlySummaryItem(BaseModel):
    month_label: str
    total_seconds: int
    total_minutes: float
    entry_count: int
    delta_vs_prior_month: int | None

class CommitCorrelationItem(BaseModel):
    commit_sha: str
    commit_message: str
    total_seconds_logged: int
    entry_count: int
    repo_name: str
    commit_date: str | None
    same_day_commits: int

class SessionStatsOut(BaseModel):
    avg_session_seconds: float
    median_session_seconds: float
    max_session_seconds: int
    min_session_seconds: int
    total_sessions: int
    longest_session: dict | None

class HeatmapDataPoint(BaseModel):
    timestamp: str  # ISO-8601 string representing the bucket start (Month/Day/Commit)
    total_duration_seconds: int
    commit_count: int
    commits: list[dict] | None = None # Populated only at the 'day' zoom level
    projects: list[str] | None = None # Populated at 'day' level

class HeatmapResponse(BaseModel):
    level: str  # "year", "month", "week", "day"
    start_date: str | None
    end_date: str | None
    max_duration_seconds: int # Included for frontend color normalization
    data: list[HeatmapDataPoint]

class KeywordFrequencyItem(BaseModel):
    keyword: str
    occurrence_count: int
    total_seconds_weighted: int

class PairingCoverageOut(BaseModel):
    total_entries: int
    paired_entries: int
    unpaired_entries: int
    pairing_pct: float
    total_commits_with_data: int
    commits_with_at_least_one_timelog: int
    commits_without_timelog: int
    avg_timelogs_per_commit: float
    avg_link_lag_hours: float | None

class Insight(BaseModel):
    text: str
    type: str
    severity: str

class InsightsOut(BaseModel):
    insights: list[Insight]

class AnalyticsExportRequest(BaseModel):
    date_start: str | None = None
    date_end: str | None = None
    repo_id: int | None = None
