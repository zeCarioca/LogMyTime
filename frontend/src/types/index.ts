export interface User {
  id: number;
  github_user_id: string;
  github_username: string;
  avatar_url: string | null;
  local_repo_path: string | null;
  commit_poll_interval_minutes: number;
  created_at: string;
}

export interface GithubRepository {
  id: number;
  user_id: number;
  full_name: string;
  default_branch: string;
  is_active: boolean;
  unsynced_seconds: number;
  unsynced_minutes: number;
  created_at: string;
}

export interface TimeEntry {
  id: number;
  repo_id: number;
  task_description: string;
  duration_seconds: number;
  duration_minutes: number;
  is_synced: boolean;
  synced_at: string | null;
  created_at: string;
  formatted_duration: string;
}

export type CommitStatus = 'pending' | 'confirmed' | 'rejected';

export interface CommitLink {
  id: number;
  repo_id: number;
  commit_sha: string;
  commit_message: string;
  commit_date: string;
  status: CommitStatus;
  created_at: string;
  time_entry: TimeEntry;
}

export interface GitStatus {
  is_valid: boolean;
  repo_path: string | null;
  branch?: string;
  last_commit?: {
    sha: string;
    short_sha: string;
    message: string;
    author: string;
    date: string;
  };
  staged_files?: string[];
  modified_files?: string[];
}
