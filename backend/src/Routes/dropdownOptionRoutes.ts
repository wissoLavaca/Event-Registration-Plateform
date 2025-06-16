import { Router } from 'express';
import {
    createOptionForField,
    getOptionsForField,
    updateDropdownOption,
    deleteDropdownOption
} from '../Controllers/DropdownOptionController';

const router = Router();

// Routes for dropdown options related to a specific form field
router.post('/form-fields/:fieldId/options', createOptionForField);
router.get('/form-fields/:fieldId/options', getOptionsForField);

// Routes for managing a specific dropdown option by its own ID
// (Useful if you want to update/delete an option without knowing its parent fieldId directly in the route)
router.put('/dropdown-options/:optionId', updateDropdownOption);
router.delete('/dropdown-options/:optionId', deleteDropdownOption);

export default router;