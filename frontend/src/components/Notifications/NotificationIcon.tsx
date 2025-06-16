import React, { useState } from 'react';
import { useNotifications } from '../../context/notificationContext';
import './NotificationIcon.css';
import NotificationPanel from './NotificationPanel';

const NotificationIcon: React.FC = () => {
    const { unreadCount } = useNotifications();
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const togglePanel = () => {
        setIsPanelOpen(!isPanelOpen);
    };

    return (
        <div className="notification-icon-container">
            <button onClick={togglePanel} className="notification-button" aria-label="Toggle notifications panel">
                <i className='bx bxs-bell'></i>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            {isPanelOpen && <NotificationPanel onClose={() => setIsPanelOpen(false)} />}
        </div>
    );
};

export default NotificationIcon;