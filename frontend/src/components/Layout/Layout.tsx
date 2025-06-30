import React, { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Navbar from '../Navbar/Navbar';


interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void; 
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [isSidebarClosed, setSidebarClosed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarClosed(!isSidebarClosed);
  };

  return (
    <div className={isSidebarClosed ? 'sidebar-closed' : ''}>
      <Sidebar 
        onLogout={onLogout} 
        isClosed={isSidebarClosed}
      />
      <div className="main-container">
        <Navbar onToggleSidebar={handleToggleSidebar} />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
