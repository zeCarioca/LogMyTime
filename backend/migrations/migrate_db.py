import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH_INSTANCE = os.path.join(BASE_DIR, 'instance', 'database.db')
DB_PATH_ROOT = os.path.join(BASE_DIR, 'database.db')

DB_PATH = DB_PATH_INSTANCE if os.path.exists(DB_PATH_INSTANCE) else DB_PATH_ROOT

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"No existing database found at {DB_PATH}, skipping migration script.")
        return

    print(f"Migrating database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(users);")
    columns = [row[1] for row in cursor.fetchall()]

    if 'local_repo_path' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN local_repo_path VARCHAR(512);")
        print("Added 'local_repo_path' column to 'users' table.")

    if 'commit_poll_interval_minutes' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN commit_poll_interval_minutes INTEGER DEFAULT 5;")
        print("Added 'commit_poll_interval_minutes' column to 'users' table.")

    if 'static_api_token' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN static_api_token VARCHAR(255);")
        print("Added 'static_api_token' column.")
    if 'active_timer_repo_id' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN active_timer_repo_id INTEGER REFERENCES github_repositories(id);")
        print("Added 'active_timer_repo_id' column.")
    if 'active_timer_start' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN active_timer_start DATETIME;")
        print("Added 'active_timer_start' column.")
    if 'active_timer_task_description' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN active_timer_task_description VARCHAR(255);")
        print("Added 'active_timer_task_description' column.")
    if 'active_timer_accumulated_seconds' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN active_timer_accumulated_seconds INTEGER DEFAULT 0;")
        print("Added 'active_timer_accumulated_seconds' column.")
    if 'active_timer_is_running' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN active_timer_is_running BOOLEAN DEFAULT 0;")
        print("Added 'active_timer_is_running' column.")

    # Create analytics_goals if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analytics_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        weekly_target_seconds INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)
    print("Checked 'analytics_goals' table.")

    # Create tasks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        repo_id INTEGER,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'todo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(repo_id) REFERENCES github_repositories(id) ON DELETE SET NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);")
    print("Checked 'tasks' table.")

    # Add Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_entries_created_at ON time_entries(created_at);")
    
    # Token Usage Migration
    cursor.execute("PRAGMA table_info(time_entries);")
    time_columns = [row[1] for row in cursor.fetchall()]
    if 'total_prompt_tokens' not in time_columns:
        cursor.execute("ALTER TABLE time_entries ADD COLUMN total_prompt_tokens INTEGER NOT NULL DEFAULT 0;")
        print("Added 'total_prompt_tokens' column to 'time_entries' table.")
    if 'total_completion_tokens' not in time_columns:
        cursor.execute("ALTER TABLE time_entries ADD COLUMN total_completion_tokens INTEGER NOT NULL DEFAULT 0;")
        print("Added 'total_completion_tokens' column to 'time_entries' table.")
    if 'task_id' not in time_columns:
        cursor.execute("ALTER TABLE time_entries ADD COLUMN task_id INTEGER REFERENCES tasks(id);")
        print("Added 'task_id' column to 'time_entries' table.")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_entries_commit_sha ON time_entries(commit_sha);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_commit_links_status ON commit_links(status);")
    print("Checked database indexes.")

    conn.commit()
    conn.close()
    print("Database migration check completed successfully.")

if __name__ == '__main__':
    migrate()
