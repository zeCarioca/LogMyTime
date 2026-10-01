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

    # Add Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_entries_created_at ON time_entries(created_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_entries_commit_sha ON time_entries(commit_sha);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_commit_links_status ON commit_links(status);")
    print("Checked database indexes.")

    conn.commit()
    conn.close()
    print("Database migration check completed successfully.")

if __name__ == '__main__':
    migrate()
