import type { NotificationsResponse, UINotification } from '../types/notification.types';

const API_BASE_URL = 'http://localhost:3001/api/notifications';

export const fetchUserNotifications = async (token: string, limit: number = 20, unread?: boolean): Promise<NotificationsResponse> => {
    let url = `${API_BASE_URL}/me?limit=${limit}`;
    if (unread !== undefined) {
        url += `&unread=${unread}`;
    }

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch notifications: ${response.status} ${errorText}`);
    }
    return response.json();
};

export const markNotificationAsRead = async (token: string, notificationId: number): Promise<UINotification> => {
    const response = await fetch(`${API_BASE_URL}/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to mark notification as read: ${response.status} ${errorText}`);
    }
    return response.json();
};

export const markAllNotificationsAsRead = async (token: string): Promise<{ message: string, affected?: number }> => {
    const response = await fetch(`${API_BASE_URL}/me/read-all`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to mark all notifications as read: ${response.status} ${errorText}`);
    }
    return response.json();
};
