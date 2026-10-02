import React, { useState, useEffect } from 'react';
import { HierarchyTree } from '../components';
import { dataApi } from '../api/data';
import { useRepos } from '../hooks/useRepos';

export const DataPage: React.FC = () => {
  const { activeRepos } = useRepos();
  const [selectedRepoId, setSelectedRepoId] = useState<number | ''>('');
  const [refreshCount, setRefreshCount] = useState<number>(0);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await dataApi.getHierarchy(selectedRepoId !== '' ? Number(selectedRepoId) : undefined);
        setData(res);
      } catch (e) {
        console.error('Failed to load hierarchy data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedRepoId, refreshCount]);

  const handleExportCsv = () => {
    window.location.href = dataApi.getExportCsvUrl(selectedRepoId !== '' ? Number(selectedRepoId) : undefined);
  };

  return (
    <div className="data-page-container">
      <div className="data-page-header card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Data & Hierarchy Explorer</h2>
            <p className="subtitle">View structured breakdown of repositories, users, commits, and timelogs</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={() => setRefreshCount(c => c + 1)}>
              🔄 Refresh
            </button>
            <button className="btn btn-primary" onClick={handleExportCsv}>
              📥 Export CSV
            </button>
          </div>
        </div>
        
        <div className="repo-filter-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
          <label htmlFor="repo-select" style={{ fontWeight: 'bold' }}>Explore Repository:</label>
          <select 
            id="repo-select"
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value ? Number(e.target.value) : '')}
            style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-gradient)', color: 'var(--text-color)', border: '1px solid var(--card-border)', minWidth: '250px' }}
          >
            <option value="">🌍 All Repositories</option>
            {activeRepos.map(repo => (
              <option key={repo.id} value={repo.id}>
                📦 {repo.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <HierarchyTree data={data} loading={loading} refreshCount={refreshCount} />
    </div>
  );
};
