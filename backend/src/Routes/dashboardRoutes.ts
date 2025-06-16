import express from 'express';
import { DashboardController } from '../Controllers/DashboardContoller';
import { authMiddleware } from '../Middleware/authMiddleware'; // Corrected path assuming Middleware folder
import { authorizeRole } from '../Middleware/authorizeMiddleware'; // Corrected path assuming Middleware folder

const router = express.Router();

router.get(
    '/registrations-per-event', // Path is now relative to /api/admin/dashboard
    authMiddleware,
    authorizeRole(['Admin']),
    DashboardController.getRegistrationsPerEvent
);

router.get(
    '/registrations-over-time', // Path is now relative
    authMiddleware,
    authorizeRole(['Admin']),
    DashboardController.getRegistrationsOverTime // Ensure this method exists in DashboardController
);

router.get(
    '/registrations-by-department', // Path is now relative
    authMiddleware,
    authorizeRole(['Admin']),
    DashboardController.getRegistrationsByDepartment // Ensure this method exists in DashboardController
);

export default router;