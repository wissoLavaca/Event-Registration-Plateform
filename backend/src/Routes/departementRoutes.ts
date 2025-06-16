import { Router, RequestHandler } from 'express';
import * as DepartementController from '../Controllers/DepartementController';
import { authMiddleware } from '../Middleware/authMiddleware';
import { authorizeRole } from '../Middleware/authorizeMiddleware';
import { DepartmentRequest } from '../types/department.types';

const router = Router();

// Wrap controller methods to handle promises properly
const getAllHandler: RequestHandler = async (req, res, next) => {
    try {
        await DepartementController.getAllDepartements(req as DepartmentRequest, res);
    } catch (error) {
        next(error);
    }
};

const getByIdHandler: RequestHandler = async (req, res, next) => {
    try {
        await DepartementController.getDepartementById(req as DepartmentRequest, res);
    } catch (error) {
        next(error);
    }
};

const createHandler: RequestHandler = async (req, res, next) => {
    try {
        await DepartementController.createDepartement(req as DepartmentRequest, res);
    } catch (error) {
        next(error);
    }
};

// Apply middleware and routes
router.use(authMiddleware);

router.get('/', getAllHandler);
router.get('/:id', getByIdHandler);
router.post('/', authorizeRole(['admin']), createHandler);

export default router;