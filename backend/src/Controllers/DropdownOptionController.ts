import { Request, Response, NextFunction } from 'express'; 
import { AppDataSource } from '../config/db';
import { DropdownOption } from '../Models/DropdownOption';
import { FormField } from '../Models/FormField';

const dropdownOptionRepository = AppDataSource.getRepository(DropdownOption);
const formFieldRepository = AppDataSource.getRepository(FormField);

export const createOptionForField = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const fieldId = parseInt(req.params.fieldId);
        const { value, is_default } = req.body;

        if (isNaN(fieldId)) {
            res.status(400).json({ message: "Invalid field ID format." });
            return; 
        }
        if (typeof value !== 'string' || value.trim() === '') {
            res.status(400).json({ message: "Option value is required and must be a non-empty string." });
            return;
        }


        const formField = await formFieldRepository.findOneBy({ id_field: fieldId });
        if (!formField) {
            res.status(404).json({ message: "Form field not found" });
            return; 
        }

        const newOption = dropdownOptionRepository.create({ id_field: fieldId, value, is_default: !!is_default });
        await dropdownOptionRepository.save(newOption);
        res.status(201).json(newOption);
    } catch (error: any) {
        next(error);
    }
};

export const getOptionsForField = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const fieldId = parseInt(req.params.fieldId);
        if (isNaN(fieldId)) {
            res.status(400).json({ message: "Invalid field ID format." });
            return;
        }
        const options = await dropdownOptionRepository.find({ where: { id_field: fieldId } });
        res.status(200).json(options);
    } catch (error: any) {
        next(error);
    }
};

export const updateDropdownOption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const optionId = parseInt(req.params.optionId); 
        const { value, is_default } = req.body; 

        if (isNaN(optionId)) {
            res.status(400).json({ message: "Invalid option ID format." });
            return;
        }

        const option = await dropdownOptionRepository.findOneBy({ id_options: optionId });
        if (!option) {
            res.status(404).json({ message: "Dropdown option not found" });
            return;
        }

        if (value !== undefined) {
            option.value = value;
        }
        if (is_default !== undefined) {
            option.is_default = is_default;
        }

        await dropdownOptionRepository.save(option);
        res.status(200).json(option);
    } catch (error: any) {
        next(error);
    }
};

export const deleteDropdownOption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const optionId = parseInt(req.params.optionId); 
         if (isNaN(optionId)) {
            res.status(400).json({ message: "Invalid option ID format." });
            return;
        }
        const result = await dropdownOptionRepository.delete(optionId);
        if (result.affected === 0) {
            res.status(404).json({ message: "Dropdown option not found" });
            return;
        }
        res.status(200).json({ message: "Dropdown option deleted successfully" }); 
    } catch (error: any) {
        next(error);
    }
};
