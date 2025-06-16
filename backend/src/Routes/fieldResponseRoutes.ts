import { Router, Request, Response, NextFunction } from 'express';
import * as FieldResponseController from '../Controllers/FieldResponseController';
import { authMiddleware } from '../Middleware/authMiddleware';
import { authorizeRole } from '../Middleware/authorizeMiddleware';
import { FieldResponseRequest } from '../types/fieldResponse.types';
import upload from '../Middleware/multerConfig';

const router = Router();

// Handler functions with proper error handling
const submitResponsesHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FieldResponseController.submitResponsesForInscription(req as FieldResponseRequest, res);
    } catch (error) {
        next(error);
    }
};

const getResponsesHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FieldResponseController.getResponsesForInscription(req as FieldResponseRequest, res);
    } catch (error) {
        next(error);
    }
};

const getAllResponsesHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FieldResponseController.getAllResponsesForEvent(req as FieldResponseRequest, res);
    } catch (error) {
        next(error);
    }
};

// Apply authentication middleware
router.use(authMiddleware);

// Route definitions with wrapped handlers
router.post(
    '/inscriptions/:inscriptionId/responses',
    upload.single('response_file'),
    submitResponsesHandler
);

router.get('/inscriptions/:inscriptionId/responses',getResponsesHandler);

router.get('/events/:eventId/responses',authorizeRole(['Admin']),getAllResponsesHandler);

export default router;