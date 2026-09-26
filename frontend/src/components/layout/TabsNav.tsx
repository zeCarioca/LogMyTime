import React from 'react';

interface TabsNavProps {
  activeTab: 'timer' | 'data';
  onTabChange: (tab: 'timer' | 'data') => void;
}

export const TabsNav: React.FC<TabsNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="tabs-navigation">
      <button
        className={`tab-button ${activeTab === 'timer' ? 'active' : ''}`}
        onClick={() => onTabChange('timer')}
      >
        <span className="tab-icon">⏱️</span> Timer & Tracking
      </button>
      <button
        className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
        onClick={() => onTabChange('data')}
      >
        <span className="tab-icon">📊</span> Hierarchy Explorer
      </button>
    </nav>
  );
};
