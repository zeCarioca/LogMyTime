import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../api/analytics';
import {
  DailyBreakdownItem,
  WeeklySummaryItem,
  MonthlySummaryItem,
  CommitCorrelationItem,
  SessionStatsOut,
  HeatmapCell,
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
  heatmap: HeatmapCell[];
  keywords: KeywordFrequencyItem[];
  pairing: PairingCoverageOut | null;
  insights: InsightsOut | null;
  goal: AnalyticsGoal | null;
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
    heatmap: [],
    keywords: [],
    pairing: null,
    insights: null,
    goal: null,
  });

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { start, end } = dateRange;
      const [
        daily, weekly, monthly, perCommit, sessions, heatmap, keywords, pairing, insights, goal
      ] = await Promise.all([
        analyticsApi.getDaily(start, end),
        analyticsApi.getWeekly(start, end),
        analyticsApi.getMonthly(start, end),
        analyticsApi.getPerCommit(start, end),
        analyticsApi.getSessions(start, end),
        analyticsApi.getHeatmap(start, end),
        analyticsApi.getKeywords(start, end),
        analyticsApi.getPairing(start, end),
        analyticsApi.getInsights(start, end),
        analyticsApi.getGoal(), // Goal doesn't usually depend on date range, but we fetch it here
      ]);

      setData({
        daily, weekly, monthly, perCommit, sessions, heatmap, keywords, pairing, insights, goal
      });
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
      setData(prev => ({ ...prev, goal: newGoal }));
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
    refresh: fetchAllData,
    updateGoal
  };
};
