import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { AppDataSource } from '../config/db';
import { Notification, NotificationType } from '../Models/Notification';
import { User } from '../Models/User';
import { Event } from '../Models/Event';

const notificationRepository = AppDataSource.getRepository(Notification);
const userRepository = AppDataSource.getRepository(User);
const eventRepository = AppDataSource.getRepository(Event);

async function createNotificationDirect(
    userId: number,
    type: NotificationType,
    message: string,
    relatedEventId?: number
): Promise<Notification | null> {
    try {
        const user = await userRepository.findOneBy({ id_user: userId });
        if (!user) {
            console.warn(`[NotificationController] User with ID ${userId} not found. Cannot create notification.`);
            return null;
        }

        const newNotification = new Notification();
        newNotification.id_user = userId;
        newNotification.user = user;
        newNotification.type = type;
        newNotification.message = message;
        
        if (relatedEventId) {
            const event = await eventRepository.findOneBy({ id_event: relatedEventId });
            if (event) {
                newNotification.relatedEvent = event;
                newNotification.related_event_id = relatedEventId;
            } else {
                console.warn(`[NotificationController] Event with ID ${relatedEventId} not found for notification.`);
                newNotification.related_event_id = relatedEventId;
            }
        }
        newNotification.is_read = false;

        return await notificationRepository.save(newNotification);
    } catch (error) {
        console.error('[NotificationController] Error creating notification directly:', error);
        return null;
    }
}

export const getMyNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.id_user;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated." });
            return; // Added return
        }
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const onlyUnreadQuery = req.query.unread as string;
        let onlyUnread: boolean | undefined = undefined;
        if (onlyUnreadQuery === 'true') {
            onlyUnread = true;
        }

        const whereClause: any = { id_user: userId };
        if (onlyUnread) {
            whereClause.is_read = false;
        }
        
        const notifications = await notificationRepository.find({
            where: whereClause,
            order: { created_at: 'DESC' },
            take: limit,
            relations: ['relatedEvent']
        });

        const unreadCount = await notificationRepository.count({
            where: { id_user: userId, is_read: false }
        });

        res.status(200).json({ notifications, unreadCount });
    } catch (error) {
        console.error("[NotificationController] Error in getMyNotifications:", error);
        next(error);
    }
};

export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.id_user;
        const notificationId = parseInt(req.params.id);

        if (!userId) {
            res.status(401).json({ message: "User not authenticated." });
            return; // Added return
        }
        if (isNaN(notificationId)) {
            res.status(400).json({ message: "Invalid notification ID." });
            return; // Added return
        }

        const notification = await notificationRepository.findOne({
            where: { id_notification: notificationId, id_user: userId }
        });

        if (notification) {
            if (!notification.is_read) {
                notification.is_read = true;
                await notificationRepository.save(notification);
            }
            res.status(200).json(notification);
            return; // Added return
        } else {
            console.warn(`[NotificationController] Notification ID ${notificationId} for User ID ${userId} not found or access denied.`);
            res.status(404).json({ message: "Notification not found or not owned by user." });
            return; // Added return
        }
    } catch (error) {
        console.error("[NotificationController] Error in markNotificationAsRead:", error);
        next(error);
    }
};

export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.id_user;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated." });
            return; // Added return
        }

        const result = await notificationRepository.update(
            { id_user: userId, is_read: false },
            { is_read: true }
        );
        res.status(200).json({ message: `${result.affected || 0} notifications marked as read.` });
    } catch (error) {
        console.error("[NotificationController] Error in markAllNotificationsAsRead:", error);
        next(error);
    }
};

export const getUserNotifications = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id_user;
    try {
        const notificationRepository = AppDataSource.getRepository(Notification);

        const notifications = await notificationRepository
            .createQueryBuilder("notification")
            .where("notification.id_user = :userId", { userId })
            .orderBy("notification.created_at", "DESC")
            .getMany();

        const unreadCount = await notificationRepository.count({
            where: { id_user: userId, is_read: false }
        });

        res.status(200).json({ notifications, unreadCount });
    } catch (error: any) {
        console.error("Error fetching user notifications:", error);
        res.status(500).json({ error: "Something went wrong!", message: error.message });
    }
};

export { createNotificationDirect as createNotification };