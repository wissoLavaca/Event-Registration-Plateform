import React from 'react';
import { useNotifications } from '../../context/notificationContext';
import { type UINotification, UINotificationType } from '../../types/notification.types';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns'; 
import { fr } from 'date-fns/locale'; 
import './NotificationPanel.css';

const getNotificationIcon = (type: UINotificationType) => {
    switch (type) {
        case UINotificationType.EVENT_CREATED:
            return "fas fa-calendar-plus";
        case UINotificationType.EVENT_UPDATED:
            return "fas fa-calendar-alt";
        case UINotificationType.EVENT_CANCELLED:
            return "fas fa-calendar-times";
        case UINotificationType.REGISTRATION_CONFIRMATION: 
            return "fas fa-user-check";
        case UINotificationType.EVENT_REMINDER: 
            return "fas fa-bell"; 
        case UINotificationType.REGISTRATION_DEADLINE_REMINDER: 
            return "fas fa-hourglass-half"; 

        default:
            return "fas fa-info-circle";
    }
};

const formatRelativeTime = (dateString: string) => {
    try {
        const date = parseISO(dateString);
        return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } catch (e) {
        console.error("Error formatting relative time:", e);
        return "Invalid date";
    }
};

interface NotificationPanelProps {
    onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, error } = useNotifications();
    const navigate = useNavigate();

    const handleNotificationClick = async (notification: UINotification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id_notification);
        }
        if (notification.related_event_id) {
            navigate(`/events/${notification.related_event_id}`);
        } else if (notification.link) { 
            navigate(notification.link);
        }
        onClose();
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
    };


    return (
        <div className="notification-panel-dark"> {/* Changed class for new styling */}
            <div className="panel-header-dark">
                <h3>Notifications</h3> {/* can be a badge elsewhere if needed */}
                <button onClick={onClose} className="close-btn-dark" aria-label="Close notifications">
                    <i className="fas fa-times"></i>
                </button>
            </div>

            {isLoading && <p className="loading-text-dark">Chargement...</p>}
            {error && <p className="error-text-dark">Erreur: {error}</p>}
            {!isLoading && !error && notifications.length === 0 && (
                <p className="empty-text-dark">Aucune nouvelle notification.</p>
            )}

            {!isLoading && !error && notifications.length > 0 && (
                <ul className="notification-list-dark">
                    {notifications.slice(0, 5).map((notification) => ( 
                        <li
                            key={notification.id_notification}
                            className={`notification-item-dark ${notification.is_read ? 'read' : 'unread'}`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className="item-icon-dark">
                                <i className={getNotificationIcon(notification.type)}></i>
                            </div>
                            <div className="item-content-dark">
                                {/* For title/subtitle, adjust your UINotification type and message content however u like  */}
                                <p className="item-message-main-dark">{notification.message.split('\n')[0]}</p>
                                {notification.message.includes('\n') && <p className="item-message-sub-dark">{notification.message.split('\n').slice(1).join(' ')}</p>}
                                <small className="item-date-dark">{formatRelativeTime(notification.created_at)}</small>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div className="panel-footer-dark">
                <button onClick={handleMarkAllRead} className="footer-btn-dark" disabled={isLoading || unreadCount === 0}>
                    Marquer tout comme lu
                </button>
                
            </div>
        </div>
    );
};

export default NotificationPanel;
