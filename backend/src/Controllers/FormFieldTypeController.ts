import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { FormFieldType, FieldTypeName } from '../Models/FormFieldType';

const formFieldTypeRepository = AppDataSource.getRepository(FormFieldType);

export const getAllFormFieldTypes = async (req: Request, res: Response) => {
    try {
        const types = await formFieldTypeRepository.find();
        res.status(200).json(types);
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching form field types", error: error.message });
    }
};

// Create/Update/Delete for types might not be needed if they are static
export const createFormFieldType = async (req: Request, res: Response) => {
    // TODO: Authorization: Admin only
    try {
        const { field_name } = req.body as { field_name: FieldTypeName };
        if (!field_name || !['text', 'number', 'file', 'date', 'checkbox', 'radio'].includes(field_name)) {
             return res.status(400).json({ message: "Invalid field type name." });
        }
        const newType = formFieldTypeRepository.create({ field_name });
        await formFieldTypeRepository.save(newType);
        res.status(201).json(newType);
    } catch (error: any) {
        if ((error as any).code === '23505') { // Unique constraint violation
            return res.status(409).json({ message: "Field type name already exists." });
        }
        res.status(500).json({ message: "Error creating form field type", error: error.message });
    }
};