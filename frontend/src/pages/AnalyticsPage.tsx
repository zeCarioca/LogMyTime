import React from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { DatePickerGroup, InsightsTicker, ActivityHeatmap, TimeTrendsChart, PairingCorrelationChart, KPICards, WeeklyGoalWidget } from '../components';
import { analyticsApi } from '../api/analytics';

export const AnalyticsPage: React.FC = () => {
  const { dateRange, setDateRange, isLoading, error, data, refresh, updateGoal } = useAnalytics();

  // Temporary console.log to use the variables and avoid TS6133 until we build the UI
  console.log('Analytics loaded:', { dateRange, data, updateGoal });

  const handleExportJson = async () => {
    try {
      const blob = await analyticsApi.exportJson(dateRange.start, dateRange.end);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logmytime-analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export JSON", e);
      alert("Failed to export JSON.");
    }
  };

  const handleExportMarkdown = async () => {
    try {
      const blob = await analyticsApi.exportMarkdown(dateRange.start, dateRange.end);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logmytime-analytics-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export Markdown", e);
      alert("Failed to export Markdown.");
    }
  };

  return (
    <div className="analytics-page-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="analytics-page-header card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Analytics & Insights</h2>
            <p className="subtitle">Premium developer time tracking & commit insights</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn btn-outline" onClick={handleExportJson}>📥 JSON</button>
            <button className="btn btn-outline" onClick={handleExportMarkdown}>📥 Markdown</button>
            <button className="btn btn-primary" onClick={() => refresh()}>🔄 Refresh</button>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
          <DatePickerGroup onRangeChange={setDateRange} />
        </div>
      </div>

      {isLoading && <p>Loading analytics data...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!isLoading && !error && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Insights Ticker */}
          <InsightsTicker insights={data.insights?.insights || null} isLoading={isLoading} />

          {/* Activity Heatmap */}
          <ActivityHeatmap data={data.heatmap} isLoading={isLoading} />

          {/* KPIs and Goal Widget */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <KPICards sessions={data.sessions} pairing={data.pairing} isLoading={isLoading} />
            <WeeklyGoalWidget goal={data.goal} weeklyData={Array.isArray(data.weekly) ? data.weekly : []} onUpdateGoal={updateGoal} />
          </div>

          {/* Trends and Correlation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <TimeTrendsChart data={data.daily} isLoading={isLoading} />
            <PairingCorrelationChart data={data.perCommit} isLoading={isLoading} />
          </div>
        </div>
      )}
    </div>
  );
};
