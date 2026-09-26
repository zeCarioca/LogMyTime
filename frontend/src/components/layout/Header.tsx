import React from 'react';
import { User } from '../../types';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const loginUrl = '/auth/login';

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
          <div className="user-profile">
            {user.avatar_url && (
              <img src={user.avatar_url} alt={user.github_username} className="user-avatar" />
            )}
            <span className="username">@{user.github_username}</span>
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
