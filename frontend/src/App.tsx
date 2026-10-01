import { useState } from 'react';
import { Header, TabsNav } from './components';
import { PaletteProvider } from './context/PaletteContext';
import { PaletteGeneratorWidget } from './components/theme/PaletteGeneratorWidget';
import { Dashboard } from './pages/Dashboard';
import { DataPage } from './pages/DataPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { useAuth } from './hooks';

export function App() {
  const [activeTab, setActiveTab] = useState<'timer' | 'data' | 'analytics'>('timer');
  const { user, logout } = useAuth();

  return (
    <PaletteProvider>
      <div className="app-shell">
        <Header user={user} onLogout={logout} />
        <TabsNav activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="app-main-content">
          {activeTab === 'timer' && <Dashboard />}
          {activeTab === 'data' && <DataPage />}
          {activeTab === 'analytics' && <AnalyticsPage />}
        </main>
        <PaletteGeneratorWidget />
      </div>
    </PaletteProvider>
  );
}

export default App;
