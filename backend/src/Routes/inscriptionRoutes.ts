import { Router, Request, Response, NextFunction } from 'express';
import * as InscriptionController from '../Controllers/InscriptionController';
import { authMiddleware } from '../Middleware/authMiddleware';
import { authorizeRole } from '../Middleware/authorizeMiddleware';
import { InscriptionRequest } from '../types/inscription.types';

const router = Router();

// Handler functions
const getAllInscriptionsHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await InscriptionController.getAllInscriptions(req as InscriptionRequest, res);
    } catch (error) {
        next(error);
    }
};

const getInscriptionByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await InscriptionController.getInscriptionById(req as InscriptionRequest, res);
    } catch (error) {
        next(error);
    }
};

const deleteInscriptionHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await InscriptionController.deleteInscription(req as InscriptionRequest, res);
    } catch (error) {
        next(error);
    }
};

// authentication middleware to all routes
router.use(authMiddleware);

// Route 
router.get('/', authorizeRole(['Admin']), getAllInscriptionsHandler);
router.get('/:id', getInscriptionByIdHandler);
router.delete('/:id', deleteInscriptionHandler);

export default router;
