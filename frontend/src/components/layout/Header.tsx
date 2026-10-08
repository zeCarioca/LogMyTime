import React, { useState } from 'react';
import { User } from '../../types';
import { authApi } from '../../api/auth';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const baseURL = import.meta.env.VITE_API_URL || '';
  const loginUrl = `${baseURL}/auth/login`;
  const [tokenMsg, setTokenMsg] = useState('');

  const handleGenerateToken = async () => {
    try {
      const { token } = await authApi.generateApiToken();
      await navigator.clipboard.writeText(token);
      setTokenMsg('Copied to clipboard!');
      setTimeout(() => setTokenMsg(''), 3000);
    } catch (e) {
      setTokenMsg('Failed');
      setTimeout(() => setTokenMsg(''), 3000);
    }
  };

  return (
    <header className="header-card card">
      <div className="header-brand">
        <div className="logo-icon">⏱️</div>
        <div className="brand-titles">
          <h1>LogMyTime</h1>
          <span className="brand-subtitle">Developer Time & Commit Pairing</span>
        </div>
      </div>

      <div className="header-user">
        {user ? (
          <div className="user-profile" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {user.avatar_url && (
              <img src={user.avatar_url} alt={user.github_username} className="user-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
            )}
            <span className="username">@{user.github_username}</span>
            <button className="btn btn-sm btn-outline" onClick={handleGenerateToken}>
              {tokenMsg || 'Get VS Code Token'}
            </button>
            <button className="btn btn-sm btn-outline" onClick={onLogout}>
              Logout
            </button>
          </div>
        ) : (
          <a href={loginUrl} className="btn btn-primary btn-sm">
            Sign in with GitHub
          </a>
        )}
      </div>
    </header>
  );
};
