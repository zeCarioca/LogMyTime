import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PREFERENCES_FILE = os.path.join(BASE_DIR, 'archive_preferences.json')

def _load_raw_preferences() -> dict:
    if not os.path.exists(PREFERENCES_FILE):
        return {}
    try:
        with open(PREFERENCES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}

def _save_raw_preferences(data: dict) -> None:
    try:
        with open(PREFERENCES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving preferences: {e}")

def load_archive_preferences() -> set:
    data = _load_raw_preferences()
    return set(data.get('archived_repositories', []))

def save_archive_preference(repo_full_name: str, is_archived: bool) -> None:
    data = _load_raw_preferences()
    archived_set = set(data.get('archived_repositories', []))
    if is_archived:
        archived_set.add(repo_full_name)
    else:
        archived_set.discard(repo_full_name)
    data['archived_repositories'] = sorted(list(archived_set))
    _save_raw_preferences(data)

def get_selected_repository() -> str:
    data = _load_raw_preferences()
    return data.get('selected_repository', '')

def set_selected_repository(repo_full_name: str) -> None:
    data = _load_raw_preferences()
    data['selected_repository'] = repo_full_name
    _save_raw_preferences(data)
