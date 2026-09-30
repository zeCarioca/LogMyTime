import { apiClient } from './client';
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

export const analyticsApi = {
  getDaily: (start?: string, end?: string): Promise<DailyBreakdownItem[]> => 
    apiClient.get('/analytics/daily', { params: { date_start: start, date_end: end } }).then(r => r.data),
    
  getWeekly: (start?: string, end?: string): Promise<WeeklySummaryItem[]> => 
    apiClient.get('/analytics/weekly', { params: { date_start: start, date_end: end } }).then(r => r.data),
    
  getMonthly: (start?: string, end?: string): Promise<MonthlySummaryItem[]> => 
    apiClient.get('/analytics/monthly', { params: { date_start: start, date_end: end } }).then(r => r.data),
    
  getPerCommit: (start?: string, end?: string): Promise<CommitCorrelationItem[]> => 
    apiClient.get('/analytics/per-commit', { params: { date_start: start, date_end: end } }).then(r => r.data),
    
  getSessions: (start?: string, end?: string): Promise<SessionStatsOut> => 
    apiClient.get('/analytics/sessions', { params: { date_start: start, date_end: end } }).then(r => r.data),
    
  getHeatmap: (level: string, start?: string, end?: string): Promise<HeatmapResponse> => 
    apiClient.get('/analytics/heatmap', { params: { level, date_start: start, date_end: end } }).then(r => r.data),
    
  getKeywords: (start?: string, end?: string): Promise<KeywordFrequencyItem[]> => 
    apiClient.get('/analytics/keywords', { params: { date_start: start, date_end: end } }).then(r => r.data),
    
  getPairing: (start?: string, end?: string): Promise<PairingCoverageOut> => 
    apiClient.get('/analytics/pairing', { params: { date_start: start, date_end: end } }).then(r => r.data),
    
  getInsights: (start?: string, end?: string): Promise<InsightsOut> => 
    apiClient.get('/analytics/insights', { params: { date_start: start, date_end: end } }).then(r => r.data),
    
  getGoal: (): Promise<AnalyticsGoal> => 
    apiClient.get('/analytics/goals').then(r => r.data),
    
  updateGoal: (seconds: number): Promise<AnalyticsGoal> => 
    apiClient.put('/analytics/goals', { weekly_target_seconds: seconds }).then(r => r.data),
    
  exportJson: (start?: string, end?: string): Promise<Blob> => 
    apiClient.post('/analytics/export/json', { date_start: start, date_end: end }, { responseType: 'blob' }).then(r => r.data),
    
  exportMarkdown: (start?: string, end?: string): Promise<Blob> => 
    apiClient.post('/analytics/export/markdown', { date_start: start, date_end: end }, { responseType: 'blob' }).then(r => r.data),
};
