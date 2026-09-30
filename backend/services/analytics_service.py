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
        query = db.query(TimeEntry).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
            
        entries = query.all()
        daily = defaultdict(lambda: {"total_seconds": 0, "entry_count": 0, "repos": set()})
        for entry in entries:
            date_str = entry.created_at.date().isoformat()
            daily[date_str]["total_seconds"] += entry.total_seconds
            daily[date_str]["entry_count"] += 1
            daily[date_str]["repos"].add(entry.repo_id)
            
        result = []
        for d, stats in sorted(daily.items()):
            result.append(DailyBreakdownItem(
                date=d,
                total_seconds=stats["total_seconds"],
                total_minutes=stats["total_seconds"] // 60,
                entry_count=stats["entry_count"],
                repos_touched=len(stats["repos"])
            ))
        return result
    
    @staticmethod
    def get_weekly_summaries(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None) -> list[WeeklySummaryItem]:
        daily = AnalyticsService.get_daily_breakdown(db, user, date_start, date_end)
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
    def get_monthly_summaries(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None) -> list[MonthlySummaryItem]:
        daily = AnalyticsService.get_daily_breakdown(db, user, date_start, date_end)
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
    def get_per_commit_breakdown(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None) -> list[CommitCorrelationItem]:
        query = db.query(TimeEntry).join(GithubRepository).filter(GithubRepository.user_id == user.id).filter(TimeEntry.commit_sha.isnot(None))
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
            
        entries = query.all()

        # Build message lookup map from CommitLink and BranchCommit
        commit_shas = [e.commit_sha for e in entries if e.commit_sha]
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

        commits = defaultdict(lambda: {"seconds": 0, "count": 0, "msg": "", "repo": "", "date": ""})
        for e in entries:
            c = commits[e.commit_sha]
            c["seconds"] += e.total_seconds
            c["count"] += 1
            if not c["msg"]:
                c["msg"] = e.commit_message or message_map.get(e.commit_sha) or "No message"
                c["repo"] = e.repository.full_name
                c["date"] = e.created_at.isoformat()
                
        result = []
        for sha, data in commits.items():
            result.append(CommitCorrelationItem(
                commit_sha=sha,
                commit_message=data["msg"],
                total_seconds_logged=data["seconds"],
                entry_count=data["count"],
                repo_name=data["repo"],
                commit_date=data["date"],
                same_day_commits=0
            ))
        return result
    
    @staticmethod
    def get_session_stats(db: Session, user: User, date_start: datetime.date | None, date_end: datetime.date | None) -> SessionStatsOut:
        query = db.query(TimeEntry).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
        
        entries = query.all()
        if not entries:
            return SessionStatsOut(avg_session_seconds=0.0, median_session_seconds=0.0, max_session_seconds=0, min_session_seconds=0, total_sessions=0, longest_session=None)
            
        durations = sorted([e.total_seconds for e in entries])
        total = len(durations)
        median = durations[total//2] if total % 2 != 0 else (durations[total//2 - 1] + durations[total//2]) / 2.0
        
        longest = max(entries, key=lambda e: e.total_seconds)
        
        return SessionStatsOut(
            avg_session_seconds=sum(durations) / total,
            median_session_seconds=median,
            max_session_seconds=durations[-1],
            min_session_seconds=durations[0],
            total_sessions=total,
            longest_session={"task": longest.task_description, "date": longest.created_at.date().isoformat()}
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
            curr = curr.replace(day=1) # align to start of month
            while curr <= end_dt:
                bucket = curr.strftime('%Y-%m')
                timeline[bucket] = {"ts": f"{bucket}-01T00:00:00Z", "sec": 0, "commits": set(), "projects": set()}
                # Advance to next month
                next_month = curr.month % 12 + 1
                next_year = curr.year + (curr.month // 12)
                curr = curr.replace(year=next_year, month=next_month, day=1)
                
        elif level == "month":
            # Week resolution
            # Align to Monday of the week
            curr = curr - datetime.timedelta(days=curr.weekday())
            while curr <= end_dt + datetime.timedelta(days=7):
                bucket = curr.strftime('%Y-%W')
                timeline[bucket] = {"ts": curr.strftime('%Y-%m-%dT00:00:00Z'), "sec": 0, "commits": set(), "projects": set()}
                curr += datetime.timedelta(weeks=1)
                
        elif level == "week":
            # Day resolution
            while curr <= end_dt:
                bucket = curr.strftime('%Y-%m-%d')
                timeline[bucket] = {"ts": f"{bucket}T00:00:00Z", "sec": 0, "commits": set(), "projects": set()}
                curr += datetime.timedelta(days=1)
                
        elif level == "day":
            # Hour resolution
            curr = curr.replace(minute=0, second=0, microsecond=0)
            while curr <= end_dt:
                bucket = curr.strftime('%Y-%m-%d %H:00')
                timeline[bucket] = {"ts": curr.strftime('%Y-%m-%dT%H:%M:%SZ'), "sec": 0, "commits": set(), "projects": set()}
                curr += datetime.timedelta(hours=1)
        else:
            raise ValueError(f"Unknown level: {level}")

        # 2. Fetch Aggregated DB Data
        query = db.query(
            TimeEntry.created_at,
            TimeEntry.duration_seconds,
            TimeEntry.commit_sha,
            GithubRepository.full_name
        ).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
            
        entries = query.all()
        
        # 3. Map to Buckets
        for e in entries:
            bucket = None
            if level == "year":
                bucket = e.created_at.strftime('%Y-%m')
            elif level == "month":
                bucket = e.created_at.strftime('%Y-%W')
            elif level == "week":
                bucket = e.created_at.strftime('%Y-%m-%d')
            elif level == "day":
                bucket = e.created_at.strftime('%Y-%m-%d %H:00')
                
            if bucket in timeline:
                t = timeline[bucket]
                t["sec"] += e.duration_seconds
                if e.commit_sha:
                    t["commits"].add(e.commit_sha)
                if e.full_name:
                    t["projects"].add(e.full_name)

        # 4. Resolve Commit Messages for deepest level (day/hours)
        all_shas = set()
        if level == "day":
            for t in timeline.values():
                all_shas.update(t["commits"])
                
        link_map = {}
        if all_shas:
            links = db.query(CommitLink).filter(CommitLink.commit_sha.in_(list(all_shas))).all()
            link_map = {l.commit_sha: l.commit_message for l in links}
            
            missing = all_shas - set(link_map.keys())
            if missing:
                bcs = db.query(BranchCommit).filter(BranchCommit.commit_sha.in_(list(missing))).all()
                for bc in bcs:
                    link_map[bc.commit_sha] = bc.message

        # 5. Format Response
        data_points = []
        max_duration = 0
        
        for bucket, t in timeline.items():
            max_duration = max(max_duration, t["sec"])
            
            point = HeatmapDataPoint(
                timestamp=t["ts"],
                total_duration_seconds=t["sec"],
                commit_count=len(t["commits"])
            )
            
            if level == "day":
                point.projects = list(t["projects"])
                point.commits = [{"sha": sha, "message": link_map.get(sha, "No message")} for sha in t["commits"]]
                
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
        query = db.query(TimeEntry).join(GithubRepository).filter(GithubRepository.user_id == user.id)
        if date_start:
            query = query.filter(func.date(TimeEntry.created_at) >= date_start)
        if date_end:
            query = query.filter(func.date(TimeEntry.created_at) <= date_end)
        
        entries = query.all()
        total = len(entries)
        paired = sum(1 for e in entries if e.commit_sha)
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
