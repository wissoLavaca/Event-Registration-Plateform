import { Router, RequestHandler } from 'express';
import * as RoleController from '../Controllers/RoleController';
import { authMiddleware } from '../Middleware/authMiddleware';
import { authorizeRole } from '../Middleware/authorizeMiddleware';
import { RoleRequest } from '../types/role.types';

const router = Router();

// Request handlers 
const getAllRolesHandler: RequestHandler = async (req, res, next) => {
    try {
        await RoleController.getAllRoles(req as RoleRequest, res);
    } catch (error) {
        next(error);
    }
};

const getRoleByIdHandler: RequestHandler = async (req, res, next) => {
    try {
        await RoleController.getRoleById(req as RoleRequest, res);
    } catch (error) {
        next(error);
    }
};

const createRoleHandler: RequestHandler = async (req, res, next) => {
    try {
        await RoleController.createRole(req as RoleRequest, res);
    } catch (error) {
        next(error);
    }
};

const updateRoleHandler: RequestHandler = async (req, res, next) => {
    try {
        await RoleController.updateRole(req as RoleRequest, res);
    } catch (error) {
        next(error);
    }
};

const deleteRoleHandler: RequestHandler = async (req, res, next) => {
    try {
        await RoleController.deleteRole(req as RoleRequest, res);
    } catch (error) {
        next(error);
    }
};

// Protecting all role routes with authentication
router.use(authMiddleware);

// Public routes 
router.get('/', getAllRolesHandler);
router.get('/:id', getRoleByIdHandler);

// Admin only routes
router.use(authorizeRole(['admin']));
router.post('/', createRoleHandler);
router.put('/:id', updateRoleHandler);
router.delete('/:id', deleteRoleHandler);

export default router;
