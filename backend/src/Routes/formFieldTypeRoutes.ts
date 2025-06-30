import { Router, Request, Response, NextFunction } from 'express';
import * as FormFieldTypeController from '../Controllers/FormFieldTypeController';
import { authMiddleware } from '../Middleware/authMiddleware';
import { authorizeRole } from '../Middleware/authorizeMiddleware';
import { FormFieldTypeRequest } from '../types/formFieldType.types';

const router = Router();

// Handler functions 
const getAllTypesHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FormFieldTypeController.getAllFormFieldTypes(req as FormFieldTypeRequest, res);
    } catch (error) {
        next(error);
    }
};

const createTypeHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FormFieldTypeController.createFormFieldType(req as FormFieldTypeRequest, res);
    } catch (error) {
        next(error);
    }
};

// Route 
router.get('/', getAllTypesHandler);
router.post('/', authMiddleware, authorizeRole(['Admin']), createTypeHandler);

export default router;
