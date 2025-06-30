import express from 'express';
import { DashboardController } from '../Controllers/DashboardContoller';
import { authMiddleware } from '../Middleware/authMiddleware'; 
import { authorizeRole } from '../Middleware/authorizeMiddleware'; 

const router = express.Router();

router.get(
    '/registrations-per-event', 
    authMiddleware,
    authorizeRole(['Admin']),
    DashboardController.getRegistrationsPerEvent
);

router.get(
    '/registrations-over-time', 
    authMiddleware,
    authorizeRole(['Admin']),
    DashboardController.getRegistrationsOverTime 
);

router.get(
    '/registrations-by-department', 
    authMiddleware,
    authorizeRole(['Admin']),
    DashboardController.getRegistrationsByDepartment 
);

export default router;
