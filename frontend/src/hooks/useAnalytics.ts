import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../api/analytics';
import {
  DailyBreakdownItem,
  WeeklySummaryItem,
  MonthlySummaryItem,
  CommitCorrelationItem,
  SessionStatsOut,
  HeatmapResponse,
  KeywordFrequencyItem,
  PairingCoverageOut,
  InsightsOut,
  AnalyticsGoal
} from '../types';

export interface AnalyticsData {
  daily: DailyBreakdownItem[];
  weekly: WeeklySummaryItem[];
  monthly: MonthlySummaryItem[];
  perCommit: CommitCorrelationItem[];
  sessions: SessionStatsOut | null;
  heatmap: HeatmapResponse | null;
  keywords: KeywordFrequencyItem[];
  pairing: PairingCoverageOut | null;
  insights: InsightsOut | null;
}

export const useAnalytics = () => {
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [data, setData] = useState<AnalyticsData>({
    daily: [],
    weekly: [],
    monthly: [],
    perCommit: [],
    sessions: null,
    heatmap: null,
    keywords: [],
    pairing: null,
    insights: null,
  });
  
  const [goal, setGoal] = useState<AnalyticsGoal | null>(null);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { start, end } = dateRange;
      const summary = await analyticsApi.getDashboardSummary(start, end);

      setData({
        daily: summary.daily,
        weekly: summary.weekly,
        monthly: summary.monthly,
        perCommit: summary.perCommit,
        sessions: summary.sessions,
        heatmap: null, // Fetched independently by ActivityHeatmap
        keywords: summary.keywords,
        pairing: summary.pairing,
        insights: summary.insights,
      });
      setGoal(summary.goal);
    } catch (err: any) {
      console.error("Failed to load analytics data", err);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const updateGoal = async (seconds: number) => {
    try {
      const newGoal = await analyticsApi.updateGoal(seconds);
      setGoal(newGoal);
      return true;
    } catch (err) {
      console.error("Failed to update goal", err);
      return false;
    }
  };

  return {
    dateRange,
    setDateRange,
    isLoading,
    error,
    data,
    goal,
    refresh: fetchAllData,
    updateGoal
  };
};
