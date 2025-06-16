import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Navbar from '../Navbar/Navbar';


interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void; 
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  return (
    <div className="layout">
      <Sidebar 
        onLogout={onLogout} isClosed={false}/>
      <div className="main-container">
        <Navbar onToggleSidebar={function (): void {
          throw new Error('Function not implemented.');
        } }        />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;