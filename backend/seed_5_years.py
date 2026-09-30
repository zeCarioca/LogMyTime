import random
from datetime import datetime, timedelta
import math

from models.database import SessionLocal, engine
from models.user import User
from models.repository import GithubRepository
from models.time_entry import TimeEntry
from sqlalchemy.orm import Session

# Project timeline configurations (simulating switching projects over 5 years)
REPO_CONFIGS = [
    {"name": "tester/legacy- monolith-app", "weight": 0},
    {"name": "tester/data-migration-scripts", "weight": 1},
    {"name": "tester/log-my-time-v1", "weight": 2},
    {"name": "tester/log-my-time-v2", "weight": 3},
]

def get_repo_for_date(date: datetime, start_date: datetime, total_days: int, repos: list[GithubRepository]) -> int:
    """Assigns a repository based on the progress through the 5-year timeline."""
    progress = (date - start_date).days / total_days
    if progress < 0.3:
        return repos[0].id
    elif progress < 0.5:
        return repos[1].id
    elif progress < 0.8:
        return repos[2].id
    else:
        return repos[3].id

def seed_data():
    db = SessionLocal()
    
    # 1. Fetch or create a user
    user = db.query(User).first()
    if not user:
        user = User(github_user_id="test_user", github_username="tester")
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # 2. Setup multiple repositories
    repos = []
    for config in REPO_CONFIGS:
        repo = db.query(GithubRepository).filter_by(user_id=user.id, full_name=config["name"]).first()
        if not repo:
            repo = GithubRepository(
                user_id=user.id, 
                full_name=config["name"], 
                default_branch="main", 
                is_active=True
            )
            db.add(repo)
            db.commit()
            db.refresh(repo)
        repos.append(repo)

    # 3. Time configuration
    end_date = datetime.utcnow()
    total_days = 5 * 365
    start_date = end_date - timedelta(days=total_days)
    
    current_date = start_date
    entries = []
    vacation_days_left = 0
    
    print(f"Generating 5 years of enhanced data from {start_date.date()} to {end_date.date()}...")
    
    while current_date <= end_date:
        # Check if we are currently on a vacation / burnout gap
        if vacation_days_left > 0:
            vacation_days_left -= 1
            current_date += timedelta(days=1)
            continue
            
        # 2% chance to trigger a new vacation/gap (1 to 3 weeks)
        if random.random() < 0.02:
            vacation_days_left = random.randint(7, 21)
            continue
            
        # Weekend logic (crunch time allows working weekends)
        is_weekend = current_date.weekday() >= 5
        is_crunch_time = random.random() < 0.10  # 10% chance for a crunch period day
        
        if is_weekend and not is_crunch_time and random.random() < 0.85:
            # 85% chance to skip normal weekends
            current_date += timedelta(days=1)
            continue
            
        if not is_weekend and not is_crunch_time and random.random() < 0.15:
            # 15% chance to skip a normal weekday (sick day, errands)
            current_date += timedelta(days=1)
            continue

        repo_id = get_repo_for_date(current_date, start_date, total_days, repos)
        
        # Decide the structure of the day
        day_type_roll = random.random()
        
        if day_type_roll < 0.10:
            # MONOLITHIC DAY (1 massive commit, 8 hours of work)
            duration = random.randint(7 * 3600, 9 * 3600)
            hour = random.randint(9, 11)
            entry_time = current_date.replace(hour=hour, minute=random.randint(0, 59))
            commit_sha = f"mono{random.randint(1000000, 9999999)}"
            
            entries.append(TimeEntry(
                repo_id=repo_id,
                task_description=f"Monolithic refactoring - {entry_time.strftime('%b %Y')}",
                duration_seconds=duration,
                duration_minutes=duration // 60,
                created_at=entry_time,
                commit_sha=commit_sha,
                is_synced=True
            ))
            
        elif day_type_roll < 0.30:
            # MICRO-COMMITS DAY (10-15 tiny commits)
            num_entries = random.randint(10, 15)
            
            # Decide shift (Night owl vs Day)
            is_night_owl = random.random() < 0.30 or is_crunch_time
            start_hour = 22 if is_night_owl else 9
            
            for i in range(num_entries):
                duration = random.randint(10 * 60, 25 * 60) # 10 to 25 mins
                
                # Spread out chronologically
                hour = (start_hour + (i // 3)) % 24
                entry_time = current_date.replace(hour=hour, minute=random.randint(0, 59))
                
                entries.append(TimeEntry(
                    repo_id=repo_id,
                    task_description=f"Micro tweak #{i+1}",
                    duration_seconds=duration,
                    duration_minutes=duration // 60,
                    created_at=entry_time,
                    commit_sha=f"micro{random.randint(1000000, 9999999)}",
                    is_synced=True
                ))
                
        else:
            # NORMAL DAY (1-3 commits, 2-5 entries)
            num_entries = random.randint(2, 5)
            daily_commits = [f"norm{random.randint(1000000, 9999999)}" for _ in range(random.randint(1, 3))]
            
            # Shift selection
            is_night_owl = random.random() < 0.15 or is_crunch_time
            base_hour = 21 if is_night_owl else 9
            
            for i in range(num_entries):
                duration = random.randint(30 * 60, 120 * 60) # 30 mins to 2 hours
                hour = (base_hour + i) % 24
                entry_time = current_date.replace(hour=hour, minute=random.randint(0, 59))
                
                commit_sha = random.choice(daily_commits) if random.random() < 0.8 else None
                
                entries.append(TimeEntry(
                    repo_id=repo_id,
                    task_description=f"Standard feature work",
                    duration_seconds=duration,
                    duration_minutes=duration // 60,
                    created_at=entry_time,
                    commit_sha=commit_sha,
                    is_synced=True
                ))
            
        current_date += timedelta(days=1)
        
    print(f"Generated {len(entries)} highly detailed time entries.")
    print("Writing to SQLite database (this might take a few seconds)...")
    
    # Chunking insert to avoid massive memory spikes
    chunk_size = 2000
    for i in range(0, len(entries), chunk_size):
        db.bulk_save_objects(entries[i:i + chunk_size])
        db.commit()
        
    print("Done! You can now view the data in your analytics dashboard.")
    
if __name__ == "__main__":
    seed_data()
