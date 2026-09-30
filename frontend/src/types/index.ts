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
  repo_name?: string | null;
  project?: string | null;
  task_description: string;
  duration_seconds: number;
  duration_minutes: number;
  is_synced: boolean;
  synced_at: string | null;
  created_at: string;
  formatted_duration: string;
  commit?: string | null;
  commit_sha?: string | null;
  commit_message?: string | null;
}

export interface RecentCommit {
  sha: string;
  short_sha: string;
  message: string;
  author: string;
  date: string;
  repo_name: string;
  repo_id: number;
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

export interface BulkLinkPayload {
  commit_sha: string;
  timelog_ids: number[];
}

export interface BulkLinkResponse {
  status: string;
  message: string;
  updated_count: number;
  commit_sha: string;
  updated_timelog_ids: number[];
}

export interface BranchCommitItem extends RecentCommit {
  branch: string;
}

export interface BranchWithCommits {
  branch: string;
  commits: BranchCommitItem[];
}

// Analytics Types
export interface AnalyticsGoal {
  id: number;
  user_id: number;
  weekly_target_seconds: number;
  updated_at: string;
}

export interface DailyBreakdownItem {
  date: string;
  total_seconds: number;
  total_minutes: number;
  entry_count: number;
  repos_touched: number;
}

export interface WeeklySummaryItem {
  week_label: string;
  week_start: string;
  week_end: string;
  total_seconds: number;
  total_minutes: number;
  entry_count: number;
  goal_seconds: number | null;
  goal_pct: number | null;
  delta_vs_prior_week: number | null;
}

export interface MonthlySummaryItem {
  month_label: string;
  total_seconds: number;
  total_minutes: number;
  entry_count: number;
  delta_vs_prior_month: number | null;
}

export interface CommitCorrelationItem {
  commit_sha: string;
  commit_message: string;
  total_seconds_logged: number;
  entry_count: number;
  repo_name: string;
  commit_date: string | null;
  same_day_commits: number;
}

export interface SessionStatsOut {
  avg_session_seconds: number;
  median_session_seconds: number;
  max_session_seconds: number;
  min_session_seconds: number;
  total_sessions: number;
  longest_session: Record<string, any> | null;
}

export interface HeatmapDataPoint {
  timestamp: string;
  total_duration_seconds: number;
  commit_count: number;
  commits?: Array<{ sha: string; message: string }> | null;
}

export interface HeatmapResponse {
  level: string;
  start_date: string | null;
  end_date: string | null;
  max_duration_seconds: number;
  data: HeatmapDataPoint[];
}

export interface KeywordFrequencyItem {
  keyword: string;
  occurrence_count: number;
  total_seconds_weighted: number;
}

export interface PairingCoverageOut {
  total_entries: number;
  paired_entries: number;
  unpaired_entries: number;
  pairing_pct: number;
  total_commits_with_data: number;
  commits_with_at_least_one_timelog: number;
  commits_without_timelog: number;
  avg_timelogs_per_commit: number;
  avg_link_lag_hours: number | null;
}

export interface Insight {
  text: string;
  type: string;
  severity: string;
}

export interface InsightsOut {
  insights: Insight[];
}


