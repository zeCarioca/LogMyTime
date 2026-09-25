import sqlite3

con = sqlite3.connect('instance/database.db')
cur = con.cursor()

cur.execute('''
CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    created_at DATETIME
)
''')
con.commit()

cols = [c[1] for c in cur.execute('PRAGMA table_info(item)').fetchall()]
if 'activity_id' not in cols:
    cur.execute('ALTER TABLE item ADD COLUMN activity_id INTEGER REFERENCES activity(id)')
    con.commit()

# Ensure default activity
cur.execute('SELECT COUNT(*) FROM activity')
if cur.fetchone()[0] == 0:
    cur.execute("INSERT INTO activity (name, color, created_at) VALUES ('General Work', '#6366f1', datetime('now'))")
    con.commit()

con.close()
print('Migration complete')
