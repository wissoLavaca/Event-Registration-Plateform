import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import './Sidebar.css';
import mobilisLogo from '../../assets/Mob.svg'; 
import { useAuth } from '../../context/authContext';

interface SidebarProps {
  isClosed: boolean;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isClosed, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); 
  const isEmployee = user?.roleId === 2; 

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onLogout) onLogout();
    navigate('/login');
  };

  return (
    <div className={`sidebar ${isClosed ? 'close' : ''}`}>
      <div className="logo-details">
        <img src = {mobilisLogo} alt="Mobilis Logo" className="logo-image" />
      </div>
      <ul className="nav-links">
        <li className={location.pathname === "/dashboard" ? "active" : ""}>
          <NavLink to="/dashboard">
            <i className='bx bxs-dashboard'></i>
            <span className="link_name">Accueil</span>
          </NavLink>
          <ul className="sub-menu blank"><li onClick={() => navigate("/dashboard")}><span className="link_name">Accueil</span></li></ul>
        </li>
        <li className={location.pathname.startsWith("/events") ? "active" : ""}>
          <NavLink to="/events">
            <i className='bx bx-calendar-event'></i>
            <span className="link_name">Événements</span>
          </NavLink>
          <ul className="sub-menu blank"><li onClick={() => navigate("/events")}><span className="link_name">Événements</span></li></ul>
        </li>
        {!isEmployee && (
          <li className={location.pathname === "/users" ? "active" : ""}>
            <NavLink to="/users">
              <i className='bx bx-group'></i>
              <span className="link_name">Utilisateurs</span>
            </NavLink>
            <ul className="sub-menu blank"><li onClick={() => navigate("/users")}><span className="link_name">Utilisateurs</span></li></ul>
          </li>
        )}
        {!isEmployee && (
           <li className={location.pathname === "/forms" ? "active" : ""}>
            <NavLink to="/forms">
              <i className='bx bx-file'></i> 
              <span className="link_name">Formulaire</span>
            </NavLink>
            <ul className="sub-menu blank"><li onClick={() => navigate("/forms")}><span className="link_name">Formulaire</span></li></ul>
          </li>
        )}
        <li className={location.pathname === "/settings" ? "active" : ""}>
          <NavLink to="/settings">
            <i className='bx bx-cog'></i>
            <span className="link_name">Paramètres</span>
          </NavLink>
          <ul className="sub-menu blank"><li onClick={() => navigate("/settings")}><span className="link_name">Paramètres</span></li></ul>
        </li>
        <li className="logout-link-item">
          <a href="#" onClick={handleLogoutClick} role="button" tabIndex={0}>
            <i className='bx bx-log-out'></i>
            <span className="link_name">Déconnexion</span>
          </a>
          <ul className="sub-menu blank">
            <li onClick={handleLogoutClick}><span className="link_name">Déconnexion</span></li>
          </ul>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
