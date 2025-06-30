import { Router, Request, Response, NextFunction} from 'express';
import * as FormFieldController from '../Controllers/FormFieldController';
import * as DropdownOptionController from '../Controllers/DropdownOptionController';
import { authMiddleware } from '../Middleware/authMiddleware';
import { authorizeRole } from '../Middleware/authorizeMiddleware';
import { AuthenticatedRequest } from '../types/auth.types';


const router = Router();



// Form field handlers
const getFormFieldByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FormFieldController.getFormFieldById(req as AuthenticatedRequest, res);
    } catch (error) {
        next(error);
    }
};

const updateFormFieldHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FormFieldController.updateFormField(req as AuthenticatedRequest, res);
    } catch (error) {
        next(error);
    }
};

const deleteFormFieldHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FormFieldController.deleteFormField(req as AuthenticatedRequest, res);
    } catch (error) {
        next(error);
    }
};

// Dropdown option handlers
const createOptionHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await DropdownOptionController.createOptionForField(req as AuthenticatedRequest, res, next);
    } catch (error) {
        next(error);
    }
};

const getOptionsHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await DropdownOptionController.getOptionsForField(req as AuthenticatedRequest, res, next);
    } catch (error) {
        next(error);
    }
};




// Apply middleware
router.use(authMiddleware, authorizeRole(['Admin']));
// Form field routes
router.get('/:id', getFormFieldByIdHandler);
router.put('/:id', updateFormFieldHandler);
router.delete('/:id', deleteFormFieldHandler);

// Dropdown option routes
router.post('/:fieldId/options', createOptionHandler);
router.get('/:fieldId/options', getOptionsHandler);




export default router;
