import { Router } from 'express';
import { authMiddleware } from '../Middleware/authMiddleware'; 
import * as NotificationController from '../Controllers/NotificationController';

const router = Router();

router.get('/me', authMiddleware, NotificationController.getMyNotifications);

router.patch('/:id/read', authMiddleware, NotificationController.markNotificationAsRead);

router.patch('/me/read-all', authMiddleware, NotificationController.markAllNotificationsAsRead );


export default router;