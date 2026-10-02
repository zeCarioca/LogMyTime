import os
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict, Any

from sqlalchemy.orm import Session
from models.database import SessionLocal
from models.time_entry import TimeEntry

class GeminiSyncService:
    def __init__(self, brain_dir: str = r"C:\Users\mateu\.gemini\antigravity-ide\brain"):
        self.brain_dir = Path(brain_dir)

    def scan_transcripts(self) -> List[Dict[str, Any]]:
        """
        Recursively scan for transcript.jsonl files and parse token usage.
        """
        token_events = []
        
        if not self.brain_dir.exists():
            print(f"Directory not found: {self.brain_dir}")
            return token_events
            
        for conversation_dir in self.brain_dir.iterdir():
            if not conversation_dir.is_dir():
                continue
                
            transcript_path = conversation_dir / ".system_generated" / "logs" / "transcript.jsonl"
            if not transcript_path.exists():
                continue
                
            try:
                with open(transcript_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                            
                        try:
                            step = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                            
                        if step.get("type") == "PLANNER_RESPONSE" and step.get("source") == "MODEL":
                            # Extract timestamp
                            created_at_str = step.get("created_at")
                            if not created_at_str:
                                continue
                                
                            try:
                                timestamp = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                            except ValueError:
                                continue
                                
                            # Extract token usage. This looks for usage in the step root or metadata.
                            usage = step.get("usage", {})
                            metadata = step.get("metadata", {})
                            
                            prompt_tokens = usage.get("prompt_tokens") or metadata.get("prompt_tokens") or 0
                            completion_tokens = usage.get("completion_tokens") or metadata.get("completion_tokens") or 0
                            
                            # Fallback approximation if strict token counting is missing from logs
                            if prompt_tokens == 0 and completion_tokens == 0:
                                content = step.get("content", "") or ""
                                thinking = step.get("thinking", "") or ""
                                completion_tokens = len(content + thinking) // 4
                                prompt_tokens = 5000 # rough baseline Context Window for a session
                            
                            token_events.append({
                                "conversation_id": conversation_dir.name,
                                "timestamp": timestamp,
                                "prompt_tokens": prompt_tokens,
                                "completion_tokens": completion_tokens,
                                "model_name": "gemini-3.1-pro"
                            })
                            
            except Exception as e:
                print(f"Error reading {transcript_path}: {e}")
                
        # Sort by timestamp
        token_events.sort(key=lambda x: x["timestamp"])
        return token_events

    def correlate_tokens_to_time_entries(self):
        """
        Phase 2: Strict Timestamp Matching Engine.
        Scans all TimeEntry records and aggregates token events that occurred
        during the TimeEntry's active duration.
        """
        token_events = self.scan_transcripts()
        if not token_events:
            print("No token events found to correlate.")
            return

        db: Session = SessionLocal()
        try:
            entries = db.query(TimeEntry).all()
            updated_count = 0

            for entry in entries:
                # TimeEntry created_at is naive UTC in SQLite (usually)
                entry_start = entry.created_at.replace(tzinfo=timezone.utc)
                # entry duration is stored in duration_seconds or we calculate it
                duration = entry.duration_seconds if entry.duration_seconds else (entry.duration_minutes * 60)
                entry_end = entry_start + timedelta(seconds=duration)

                # Reset to recalculate
                entry.total_prompt_tokens = 0
                entry.total_completion_tokens = 0

                # In a real system, we'd use binary search or db indexing, but for local MVP iterating is fine
                for event in token_events:
                    if entry_start <= event["timestamp"] <= entry_end:
                        entry.total_prompt_tokens += event["prompt_tokens"]
                        entry.total_completion_tokens += event["completion_tokens"]
                
                if entry.total_prompt_tokens > 0 or entry.total_completion_tokens > 0:
                    updated_count += 1
            
            db.commit()
            print(f"Successfully correlated tokens for {updated_count} TimeEntries.")
        except Exception as e:
            db.rollback()
            print(f"Database error during correlation: {e}")
        finally:
            db.close()

if __name__ == "__main__":
    service = GeminiSyncService()
    print("Running token correlation engine...")
    service.correlate_tokens_to_time_entries()
