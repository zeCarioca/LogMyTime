import os
import json

PREFERENCES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'archive_preferences.json')

def _load_raw_preferences() -> dict:
    """Load full preferences dictionary from local JSON file."""
    if not os.path.exists(PREFERENCES_FILE):
        return {}
    try:
        with open(PREFERENCES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}

def _save_raw_preferences(data: dict) -> None:
    """Save full preferences dictionary to local JSON file."""
    try:
        with open(PREFERENCES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving preferences: {e}")

def load_archive_preferences() -> set:
    """Load list of archived repository full_names from local JSON file."""
    data = _load_raw_preferences()
    return set(data.get('archived_repositories', []))

def save_archive_preference(repo_full_name: str, is_archived: bool) -> None:
    """Update and persist the archive preferences to local JSON file."""
    data = _load_raw_preferences()
    archived_set = set(data.get('archived_repositories', []))
    if is_archived:
        archived_set.add(repo_full_name)
    else:
        archived_set.discard(repo_full_name)
    data['archived_repositories'] = sorted(list(archived_set))
    _save_raw_preferences(data)

def get_selected_repository() -> str:
    """Get the currently selected repository preference."""
    data = _load_raw_preferences()
    return data.get('selected_repository', '')

def set_selected_repository(repo_full_name: str) -> None:
    """Save the selected repository preference."""
    data = _load_raw_preferences()
    data['selected_repository'] = repo_full_name
    _save_raw_preferences(data)
