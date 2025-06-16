import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type UINotification, type NotificationsResponse } from '../types/notification.types';
import * as notificationService from '../Services/notificationService';
import { useAuth } from './authContext';
import { toast } from 'react-toastify';

interface NotificationContextType {
    notifications: UINotification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token, user } = useAuth();
    const [notifications, setNotifications] = useState<UINotification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [toastedNotificationIds, setToastedNotificationIds] = useState<Set<number>>(new Set());

    const fetchNotifications = useCallback(async () => {
        if (!token || !user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data: NotificationsResponse = await notificationService.fetchUserNotifications(token);
            
            const newToastedInThisFetch = new Set<number>(); // Track IDs toasted in *this* specific fetch

            const newUnreadForToasting = data.notifications.filter(
                n => !n.is_read && !toastedNotificationIds.has(n.id_notification)
            );

            if (newUnreadForToasting.length > 0) {
                console.log("New unread notifications for toasting:", newUnreadForToasting);
            }

            newUnreadForToasting.forEach(n => {
                console.log(`Toasting notification: ${n.message}`);
                toast.info(n.message, {
                    toastId: `notif-${n.id_notification}`,
                });
                newToastedInThisFetch.add(n.id_notification); // Add to locally tracked set
            });

            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);

            // After processing, update the main toastedNotificationIds state
            // with the IDs that were just toasted in this run.
            if (newToastedInThisFetch.size > 0) {
                setToastedNotificationIds(prevToastedIds => {
                    const updatedSet = new Set(prevToastedIds);
                    newToastedInThisFetch.forEach(id => updatedSet.add(id));
                    return updatedSet;
                });
            }

        } catch (err: any) {
            console.error("Failed to fetch notifications:", err);
            setError(err.message || 'Could not fetch notifications.');
            toast.error('Failed to load notifications.');
            setNotifications([]);
            setUnreadCount(0);
        } finally {
            setIsLoading(false);
        }
    }, [token, user]); // <<<< REMOVE toastedNotificationIds from dependency array

    useEffect(() => {
        if (token && user) {
            fetchNotifications();
            // Optional: Set up polling for new notifications
            // const intervalId = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
            // return () => clearInterval(intervalId);
        } else {
            setNotifications([]);
            setUnreadCount(0);
            setToastedNotificationIds(new Set()); // Clear toasted IDs on logout
        }
    }, [token, user, fetchNotifications]);

    const markAsRead = async (notificationId: number) => {
        if (!token) return;
        try {
            await notificationService.markNotificationAsRead(token, notificationId);
            setNotifications(prev =>
                prev.map(n => (n.id_notification === notificationId ? { ...n, is_read: true } : n))
            );
            setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
        } catch (err: any) {
            console.error("Failed to mark notification as read:", err);
            setError(err.message || 'Could not mark notification as read.');
            toast.error('Failed to update notification status.');
        }
    };

    const markAllAsRead = async () => {
        if (!token) return;
        try {
            await notificationService.markAllNotificationsAsRead(token);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err: any) {
            console.error("Failed to mark all notifications as read:", err);
            setError(err.message || 'Could not mark all notifications as read.');
            toast.error('Failed to update notifications.');
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, isLoading, error, fetchNotifications, markAsRead, markAllAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};