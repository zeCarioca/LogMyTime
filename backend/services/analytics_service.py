import datetime
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import User
from models.analytics_goal import AnalyticsGoal
from models.time_entry import TimeEntry
from models.repository import GithubRepository
from models.commit_link import CommitLink
from models.branch_commit import BranchCommit
from schemas.analytics import (
    DailyBreakdownItem,
    WeeklySummaryItem,
    MonthlySummaryItem,
    CommitCorrelationItem,
    SessionStatsOut,
    HeatmapDataPoint,
    HeatmapResponse,
    KeywordFrequencyItem,
    PairingCoverageOut
)

class AnalyticsService:
    @staticmethod
    def get_goal(db: Session, user: User) -> AnalyticsGoal | None:
        return db.query(AnalyticsGoal).filter(AnalyticsGoal.user_id == user.id).first()

    @staticmethod
    def set_goal(db: Session, user: User, weekly_target_seconds: int) -> AnalyticsGoal:
        goal = db.query(AnalyticsGoal).filter(AnalyticsGoal.user_id == user.id).first()
        if not goal:
            goal = AnalyticsGoal(user_id=user.id, weekly_target_seconds=weekly_target_seconds)
            db.add(goal)
        else:
            goal.weekly_target_seconds = weekly_target_seconds
            goal.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def get_daily_breakdown(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None) -> list[DailyBreakdownItem]:
        query = db.query(
            func.date(TimeEntry.created_at).label("day_date"),
            func.sum(TimeEntry.duration_seconds).label("total_sec"),
            func.count(TimeEntry.id).label("entry_count"),
            func.count(func.distinct(TimeEntry.repo_id)).label("repos_touched")
        ).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
            
        query = query.group_by(func.date(TimeEntry.created_at)).order_by(func.date(TimeEntry.created_at))
        
        results = query.all()
        
        output = []
        for r in results:
            if not r.day_date:
                continue
            sec = int(r.total_sec or 0)
            output.append(DailyBreakdownItem(
                date=r.day_date,
                total_seconds=sec,
                total_minutes=sec / 60.0,
                entry_count=int(r.entry_count or 0),
                repos_touched=int(r.repos_touched or 0)
            ))
        return output
    
    @staticmethod
    def get_weekly_summaries(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None, precomputed_daily: list[DailyBreakdownItem] | None = None) -> list[WeeklySummaryItem]:
        daily = precomputed_daily if precomputed_daily is not None else AnalyticsService.get_daily_breakdown(db, user, date_start, date_end)
        weekly = defaultdict(lambda: {"total_seconds": 0, "entry_count": 0})
        
        for d in daily:
            date_obj = datetime.datetime.fromisoformat(d.date)
            iso_year, iso_week, _ = date_obj.isocalendar()
            week_label = f"{iso_year}-W{iso_week:02d}"
            weekly[week_label]["total_seconds"] += d.total_seconds
            weekly[week_label]["entry_count"] += d.entry_count
            
        goal = AnalyticsService.get_goal(db, user)
        goal_seconds = goal.weekly_target_seconds if goal else 0
        
        result = []
        sorted_weeks = sorted(weekly.keys())
        prev_seconds = 0
        for week_label in sorted_weeks:
            stats = weekly[week_label]
            total = stats["total_seconds"]
            goal_pct = (total / goal_seconds * 100) if goal_seconds > 0 else None
            
            result.append(WeeklySummaryItem(
                week_label=week_label,
                week_start=week_label,
                week_end=week_label,
                total_seconds=total,
                total_minutes=total // 60,
                entry_count=stats["entry_count"],
                goal_seconds=goal_seconds,
                goal_pct=goal_pct,
                delta_vs_prior_week=total - prev_seconds if prev_seconds > 0 else None
            ))
            prev_seconds = total
            
        return result
    
    @staticmethod
    def get_monthly_summaries(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None, precomputed_daily: list[DailyBreakdownItem] | None = None) -> list[MonthlySummaryItem]:
        daily = precomputed_daily if precomputed_daily is not None else AnalyticsService.get_daily_breakdown(db, user, date_start, date_end)
        monthly = defaultdict(lambda: {"total_seconds": 0, "entry_count": 0})
        
        for d in daily:
            month_label = d.date[:7] # YYYY-MM
            monthly[month_label]["total_seconds"] += d.total_seconds
            monthly[month_label]["entry_count"] += d.entry_count
            
        result = []
        sorted_months = sorted(monthly.keys())
        prev_seconds = 0
        for month_label in sorted_months:
            stats = monthly[month_label]
            total = stats["total_seconds"]
            result.append(MonthlySummaryItem(
                month_label=month_label,
                total_seconds=total,
                total_minutes=total // 60,
                entry_count=stats["entry_count"],
                delta_vs_prior_month=total - prev_seconds if prev_seconds > 0 else None
            ))
            prev_seconds = total
            
        return result
    
    @staticmethod
    def get_per_commit_breakdown(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None, limit: int | None = None) -> list[CommitCorrelationItem]:
        query = db.query(
            TimeEntry.commit_sha,
            func.sum(TimeEntry.duration_seconds).label('total_sec'),
            func.count(TimeEntry.id).label('entry_count'),
            func.max(TimeEntry.created_at).label('last_date'),
            GithubRepository.full_name.label('repo_name')
        ).join(GithubRepository).filter(
            GithubRepository.user_id == user.id,
            TimeEntry.commit_sha.isnot(None)
        )
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
            
        query = query.group_by(TimeEntry.commit_sha, GithubRepository.full_name)
        query = query.order_by(func.sum(TimeEntry.duration_seconds).desc())
        
        if limit:
            query = query.limit(limit)
            
        results = query.all()

        commit_shas = [r.commit_sha for r in results]
        message_map = {}
        if commit_shas:
            # 1. Check CommitLink
            links = db.query(CommitLink).filter(CommitLink.commit_sha.in_(commit_shas)).all()
            for l in links:
                if l.commit_message:
                    message_map[l.commit_sha] = l.commit_message

            # 2. Check BranchCommit for any missing messages
            missing_shas = [sha for sha in commit_shas if sha not in message_map]
            if missing_shas:
                b_commits = db.query(BranchCommit).filter(BranchCommit.commit_sha.in_(missing_shas)).all()
                for bc in b_commits:
                    if bc.message:
                        message_map[bc.commit_sha] = bc.message

        output = []
        for r in results:
            output.append(CommitCorrelationItem(
                commit_sha=r.commit_sha,
                commit_message=message_map.get(r.commit_sha) or "No message",
                total_seconds_logged=r.total_sec,
                entry_count=r.entry_count,
                repo_name=r.repo_name,
                commit_date=r.last_date.isoformat() if r.last_date else None,
                same_day_commits=0
            ))
        return output
    
    @staticmethod
    def get_session_stats(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None) -> SessionStatsOut:
        query = db.query(
            func.avg(TimeEntry.duration_seconds).label("avg_sec"),
            func.max(TimeEntry.duration_seconds).label("max_sec"),
            func.min(TimeEntry.duration_seconds).label("min_sec"),
            func.count(TimeEntry.id).label("total")
        ).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
            
        res = query.first()
        total = int(res.total or 0)
        if total == 0:
            return SessionStatsOut(avg_session_seconds=0.0, median_session_seconds=0.0, max_session_seconds=0, min_session_seconds=0, total_sessions=0, longest_session=None)
            
        # Median is tricky in generic SQL without window functions.
        offset = total // 2
        median_query = db.query(TimeEntry.duration_seconds).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        if date_start:
            median_query = median_query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            median_query = median_query.filter(func.date(TimeEntry.created_at) <= date_end)
            
        median_query = median_query.order_by(TimeEntry.duration_seconds)
        
        if total % 2 != 0:
            median_val = median_query.offset(offset).limit(1).scalar() or 0
        else:
            vals = [r[0] for r in median_query.offset(offset - 1).limit(2).all()]
            median_val = sum(vals) / 2.0 if vals else 0
            
        # Get the longest session task details
        longest_entry = db.query(TimeEntry).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        if date_start:
            longest_entry = longest_entry.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            longest_entry = longest_entry.filter(func.date(TimeEntry.created_at) <= date_end)
            
        longest = longest_entry.order_by(TimeEntry.duration_seconds.desc()).first()
        
        return SessionStatsOut(
            avg_session_seconds=float(res.avg_sec or 0),
            median_session_seconds=float(median_val),
            max_session_seconds=int(res.max_sec or 0),
            min_session_seconds=int(res.min_sec or 0),
            total_sessions=total,
            longest_session={"task": longest.task_description, "date": longest.created_at.date().isoformat()} if longest else None
        )
    
    @staticmethod
    def get_heatmap(db: Session, user: User, level: str, date_start: datetime.date | None, date_end: datetime.date | None) -> HeatmapResponse:
        # Default to 1 year if no bounds provided
        actual_start = date_start if date_start else (datetime.date.today() - datetime.timedelta(days=365))
        actual_end = date_end if date_end else datetime.date.today()
        
        # We need datetime objects for timeline generation
        start_dt = datetime.datetime.combine(actual_start, datetime.time.min)
        end_dt = datetime.datetime.combine(actual_end, datetime.time.max)
        
        # 1. Generate Contiguous Timeline Buckets
        timeline = {}
        curr = start_dt
        
        if level == "year":
            # Month resolution
            curr = curr.replace(month=1, day=1) # align to Jan 1st
            while curr <= end_dt:
                bucket = curr.strftime('%Y-%m')
                timeline[bucket] = {"ts": f"{bucket}-01T00:00:00Z", "sec": 0, "commits": set(), "projects": set()}
                # Advance to next month
                next_month = curr.month % 12 + 1
                next_year = curr.year + (curr.month // 12)
                curr = curr.replace(year=next_year, month=next_month, day=1)
                
        elif level == "month":
            # Week resolution
            curr = start_dt - datetime.timedelta(days=start_dt.weekday()) # align to Monday
            end_limit = end_dt + datetime.timedelta(days=7)
            while curr <= end_limit:
                bucket = curr.strftime('%Y-%W')
                if bucket not in timeline:
                    timeline[bucket] = {"ts": curr.strftime('%Y-%m-%dT00:00:00Z'), "sec": 0, "commits": set(), "projects": set()}
                curr += datetime.timedelta(days=1)
                
        elif level == "week":
            # Day resolution
            curr = curr - datetime.timedelta(days=curr.weekday()) # align to Monday
            while curr <= end_dt:
                bucket = curr.strftime('%Y-%m-%d')
                timeline[bucket] = {"ts": f"{bucket}T00:00:00Z", "sec": 0, "commits": set(), "projects": set()}
                curr += datetime.timedelta(days=1)
                
        elif level == "day":
            # Hour resolution
            curr = curr.replace(hour=0, minute=0, second=0, microsecond=0) # align to Midnight
            while curr <= end_dt:
                bucket = curr.strftime('%Y-%m-%d %H:00')
                timeline[bucket] = {"ts": curr.strftime('%Y-%m-%dT%H:%M:%SZ'), "sec": 0, "commits": set(), "projects": set()}
                curr += datetime.timedelta(hours=1)
        else:
            raise ValueError(f"Unknown level: {level}")

        # 2. Fetch Aggregated DB Data via ORM Abstractions
        from models.database import date_trunc_custom, string_agg_custom
        
        query = db.query(
            date_trunc_custom(level, TimeEntry.created_at).label('bucket'),
            func.sum(TimeEntry.duration_seconds).label('total_sec'),
            string_agg_custom(TimeEntry.commit_sha).label('shas'),
            string_agg_custom(GithubRepository.full_name).label('repos')
        ).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
            
        results = query.group_by('bucket').all()
        
        # 3. Map to Buckets and Collect Unique SHAs
        all_unique_shas = set()
        for r in results:
            bucket = r.bucket
            if not bucket or bucket not in timeline:
                continue
            
            t = timeline[bucket]
            t["sec"] += r.total_sec or 0
            
            if r.shas:
                sha_list = str(r.shas).split(',')
                for sha in sha_list:
                    if sha:
                        t["commits"].add(sha)
                        all_unique_shas.add(sha)
                        
            if r.repos:
                for repo in str(r.repos).split(','):
                    if repo:
                        t["projects"].add(repo)

        # 3.5. Fetch Commit Messages for all unique SHAs
        message_map = {}
        if all_unique_shas:
            sha_list = list(all_unique_shas)
            # 1. Check CommitLink
            links = db.query(CommitLink).filter(CommitLink.commit_sha.in_(sha_list)).all()
            for l in links:
                if l.commit_message:
                    message_map[l.commit_sha] = l.commit_message

            # 2. Check BranchCommit for any missing messages
            missing_shas = [sha for sha in sha_list if sha not in message_map]
            if missing_shas:
                b_commits = db.query(BranchCommit).filter(BranchCommit.commit_sha.in_(missing_shas)).all()
                for bc in b_commits:
                    if bc.message:
                        message_map[bc.commit_sha] = bc.message

        # 4. Format Response
        data_points = []
        max_duration = 0
        
        for bucket, t in timeline.items():
            max_duration = max(max_duration, t["sec"])
            
            point = HeatmapDataPoint(
                timestamp=t["ts"],
                total_duration_seconds=t["sec"],
                commit_count=len(t["commits"])
            )
            
            point.projects = list(t["projects"])
            point.commits = [{"sha": sha, "message": message_map.get(sha, "No message")} for sha in t["commits"]]
                
            data_points.append(point)
            
        return HeatmapResponse(
            level=level,
            start_date=actual_start.isoformat(),
            end_date=actual_end.isoformat(),
            max_duration_seconds=max_duration,
            data=data_points
        )
    
    @staticmethod
    def get_keyword_frequency(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None) -> list[KeywordFrequencyItem]:
        query = db.query(TimeEntry).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
        
        entries = query.all()
        keywords = defaultdict(lambda: {"count": 0, "seconds": 0})
        stop = {"the", "and", "a", "to", "of", "in", "i", "is", "that", "it", "on", "you", "this", "for", "with"}
        
        for e in entries:
            words = [w.lower() for w in e.task_description.split() if w.lower() not in stop and len(w) > 3]
            for w in words:
                keywords[w]["count"] += 1
                keywords[w]["seconds"] += e.total_seconds
                
        result = []
        for k, v in sorted(keywords.items(), key=lambda x: x[1]["seconds"], reverse=True)[:20]:
            result.append(KeywordFrequencyItem(
                keyword=k,
                occurrence_count=v["count"],
                total_seconds_weighted=v["seconds"]
            ))
        return result
    
    @staticmethod
    def get_pairing_coverage(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None) -> PairingCoverageOut:
        from sqlalchemy import case
        query = db.query(
            func.count(TimeEntry.id).label("total"),
            func.sum(case((TimeEntry.commit_sha.isnot(None), 1), else_=0)).label("paired")
        ).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
            
        res = query.first()
        total = int(res.total or 0)
        paired = int(res.paired or 0)
        unpaired = total - paired
        pct = (paired / total * 100) if total > 0 else 0.0
        
        return PairingCoverageOut(
            total_entries=total,
            paired_entries=paired,
            unpaired_entries=unpaired,
            pairing_pct=pct,
            total_commits_with_data=0,
            commits_with_at_least_one_timelog=0,
            commits_without_timelog=0,
            avg_timelogs_per_commit=0.0,
            avg_link_lag_hours=None
        )

    @staticmethod
    def get_dashboard_summary(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None):
        from schemas.analytics import DashboardSummaryResponse, InsightsOut
        from services.analytics_insights import AnalyticsInsights
        
        # 1. Fetch daily once and reuse for weekly/monthly
        daily = AnalyticsService.get_daily_breakdown(db, user, date_start, date_end)
        weekly = AnalyticsService.get_weekly_summaries(db, user, date_start, date_end, precomputed_daily=daily)
        monthly = AnalyticsService.get_monthly_summaries(db, user, date_start, date_end, precomputed_daily=daily)
        
        # 2. Limit the heavy commits to top 10
        per_commit = AnalyticsService.get_per_commit_breakdown(db, user, date_start, date_end, limit=10)
        
        # 3. Other async-like (though sync in python) aggregations
        sessions = AnalyticsService.get_session_stats(db, user, date_start, date_end)
        keywords = AnalyticsService.get_keyword_frequency(db, user, date_start, date_end)
        pairing = AnalyticsService.get_pairing_coverage(db, user, date_start, date_end)
        
        goal = AnalyticsService.get_goal(db, user)
        if not goal:
            goal = AnalyticsService.set_goal(db, user, 0)
            
        insights = AnalyticsInsights.generate_insights(db, user, date_start, date_end)
        
        return {
            "daily": daily,
            "weekly": weekly,
            "monthly": monthly,
            "perCommit": per_commit,
            "sessions": sessions,
            "keywords": keywords,
            "pairing": pairing,
            "insights": {"insights": insights},
            "goal": goal
        }
