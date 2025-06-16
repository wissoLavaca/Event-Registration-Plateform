export enum UINotificationType {
    EVENT_CREATED = 'EVENT_CREATED',
    EVENT_UPDATED = 'EVENT_UPDATED',
    EVENT_CANCELLED = 'EVENT_CANCELLED',
    EVENT_REMINDER = 'EVENT_REMINDER',
    REGISTRATION_DEADLINE_REMINDER = 'REGISTRATION_DEADLINE_REMINDER',
    REGISTRATION_CONFIRMATION = 'REGISTRATION_CONFIRMATION',
    // Add any other types you might have
}

export interface UINotification {
    link: any; // <<<< This is correctly exported
    id_notification: number;
    id_user: number;
    type: UINotificationType;
    message: string;
    related_event_id?: number | null;
    is_read: boolean;
    created_at: string;
    relatedEvent?: {
        id_event: number;
        title_event: string;
    }
}

export interface NotificationsResponse {
    notifications: UINotification[];
    unreadCount: number;
}