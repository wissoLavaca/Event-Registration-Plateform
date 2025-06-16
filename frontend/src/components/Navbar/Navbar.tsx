import React from 'react';
import './Navbar.css';
import { useAuth } from '../../context/authContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/themeContext';
import NotificationIcon from '../Notifications/NotificationIcon';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface NavbarProps {
  onToggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <div className="top-navbar-content">
      <div className="left-section">
        <i className='bx bx-menu sidebar-toggle-icon' onClick={onToggleSidebar}></i>
        <span className="navbar-subtitle">Event Registration</span>
      </div>

      <div className="right-section">
        <div className="action-icons">
          <button
            className="icon-button"
            id="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <i className="fas fa-moon"></i> : <i className="fas fa-sun"></i>}
          </button>
          <NotificationIcon />
          <button className="icon-button" id="settings-btn" onClick={handleSettingsClick}>
            <i className="fas fa-cog"></i>
          </button>
        </div>
        <div className="user-profile-navbar">
          {user?.profilePictureUrl ? (
            <img
              src={
                user.profilePictureUrl.startsWith('http') || user.profilePictureUrl.startsWith('blob:')
                  ? user.profilePictureUrl
                  : `${BACKEND_URL}${user.profilePictureUrl}`
              }
              alt={user.username || 'User Avatar'}
              className="user-avatar-image" // Add a class for styling
            />
          ) : (
            <i className='bx bxs-user-circle bx-sm user-avatar-icon'></i>
          )}
          <span className="user-name-navbar">{user?.username || 'Utilisateur'}</span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;