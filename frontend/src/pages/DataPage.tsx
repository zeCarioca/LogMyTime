import React, { useState, useEffect } from 'react';
import { HierarchyTree } from '../components';
import { dataApi } from '../api/data';

export const DataPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await dataApi.getHierarchy();
        setData(res);
      } catch (e) {
        console.error('Failed to load hierarchy data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportCsv = () => {
    window.location.href = dataApi.getExportCsvUrl();
  };

  return (
    <div className="data-page-container">
      <div className="data-page-header card">
        <div>
          <h2>Data & Hierarchy Explorer</h2>
          <p className="subtitle">View structured breakdown of repositories, users, commits, and timelogs</p>
        </div>
        <button className="btn btn-primary" onClick={handleExportCsv}>
          📥 Export CSV
        </button>
      </div>

      <HierarchyTree data={data} loading={loading} />
    </div>
  );
};
