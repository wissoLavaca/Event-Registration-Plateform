import { Router, Request, Response, NextFunction } from 'express';
import * as EventController from '../Controllers/EventController';
import * as InscriptionController from '../Controllers/InscriptionController';
import * as FormFieldController from '../Controllers/FormFieldController';
import { authMiddleware } from '../Middleware/authMiddleware';
import { authorizeRole } from '../Middleware/authorizeMiddleware';
import { EventRequest } from '../types/event.types';
import { AuthenticatedRequest } from '../types/auth.types';
import upload from '../Middleware/multerConfig'; 
import { getEventsCount } from '../Controllers/EventController';
import { updateEventStatusesScheduled } from '../Controllers/EventController';





const router = Router();

// handlers 
const getAllEventsHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await EventController.getAllEvents(req, res, next);
    } catch (error) {
        next(error);
    }
};

const getEventByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await EventController.getEventById(req, res, next);
    } catch (error) {
        next(error);
    }
};

const createEventHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await EventController.createEvent(req as EventRequest, res, next);
    } catch (error) {
        next(error);
    }
};

const updateEventHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await EventController.updateEvent(req as EventRequest, res, next);
    } catch (error) {
        next(error);
    }
};

const deleteEventHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await EventController.deleteEvent(req as EventRequest, res, next);
    } catch (error) {
        next(error);
    }
};

// routes
router.get('/', getAllEventsHandler);
router.get('/count', getEventsCount);
router.get('/:id', getEventByIdHandler);

// Protected routes
router.post('/', authMiddleware, authorizeRole(['Admin']), createEventHandler);
router.put('/:id', authMiddleware, authorizeRole(['Admin']), updateEventHandler);
router.delete('/:id', authMiddleware, authorizeRole(['Admin']), deleteEventHandler);




router.post('/:eventId/inscriptions', 
    authMiddleware, 
    upload.any(),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await InscriptionController.createInscriptionForEvent(req as AuthenticatedRequest, res, next);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:eventId/inscriptions', 
    authMiddleware, 
    authorizeRole(['Admin']), 
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await InscriptionController.getInscriptionsForEvent(req as AuthenticatedRequest, res);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:eventId/inscriptions/me',
    authMiddleware, 
    async (req: Request, res: Response, next: NextFunction) => {
        try {

            await InscriptionController.getCurrentUserInscriptionForEvent(req, res, next);
        } catch (error) {
            next(error);
        }
    }
);

// Form field routes
router.get('/:eventId/form-fields', 
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await FormFieldController.getFormFieldsForEvent(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/:eventId/form-fields', 
    authMiddleware, 
    authorizeRole(['Admin']), 
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await FormFieldController.createFormFieldForEvent(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.put('/:eventId/fields', 
    authMiddleware,
    authorizeRole(['Admin']), 
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await FormFieldController.setFormFieldsForEvent(req, res, next); 
        } catch (error) {
            next(error);
        }
    }
);

router.post('/update-statuses-debug', async (req, res) => {
    try {
        await updateEventStatusesScheduled();
        res.status(200).send("Event statuses update process triggered successfully.");
    } catch (error) {
        console.error("Error triggering status update manually:", error);
        res.status(500).send("Error triggering status update.");
    }
});



router.get('/me/summary', authMiddleware,EventController.getMyEventsSummary)

router.get('/me/registered', authMiddleware, EventController.getMyRegisteredEvents);



export default router;
