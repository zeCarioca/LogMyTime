import os
import json

PREFERENCES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'archive_preferences.json')

def load_archive_preferences() -> set:
    """Load list of archived repository full_names from local JSON file."""
    if not os.path.exists(PREFERENCES_FILE):
        return set()
    try:
        with open(PREFERENCES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return set(data.get('archived_repositories', []))
    except Exception:
        return set()

def save_archive_preference(repo_full_name: str, is_archived: bool) -> None:
    """Update and persist the archive preferences to local JSON file."""
    archived_set = load_archive_preferences()
    if is_archived:
        archived_set.add(repo_full_name)
    else:
        archived_set.discard(repo_full_name)
    try:
        with open(PREFERENCES_FILE, 'w', encoding='utf-8') as f:
            json.dump({'archived_repositories': sorted(list(archived_set))}, f, indent=2)
    except Exception as e:
        print(f"Error saving archive preferences: {e}")
