import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/db';
import { FormField } from '../Models/FormField';
import { Event } from '../Models/Event';
import { FormFieldType } from '../Models/FormFieldType';
import { DropdownOption } from '../Models/DropdownOption';
import { In } from "typeorm";

const formFieldRepository = AppDataSource.getRepository(FormField);
const eventRepository = AppDataSource.getRepository(Event);
const formFieldTypeRepository = AppDataSource.getRepository(FormFieldType);
// const dropdownOptionRepository = AppDataSource.getRepository(DropdownOption); // Not directly used here anymore, transaction manager handles it


// POST /api/events/:eventId/form-fields
export const createFormFieldForEvent = async (req: Request, res: Response) => {
    try {
        const eventId = parseInt(req.params.eventId);
        // Expect 'acceptedFileTypes' from frontend for file types
        const { label, id_type, is_required, order, options, acceptedFileTypes, help_text, min_length, max_length, min_value, max_value } = req.body;

        const event = await eventRepository.findOneBy({ id_event: eventId });
        if (!event) return res.status(404).json({ message: "Event not found" });

        const type = await formFieldTypeRepository.findOneBy({ id_type });
        if (!type) return res.status(400).json({ message: "Invalid form field type ID" });

        const newFieldData: Partial<FormField> = {
            id_event: eventId,
            label,
            id_type,
            is_required: !!is_required,
            sequence: parseInt(order) || 0,
        };

        if (type.field_name === 'file') {
            newFieldData.acceptedFileTypes = acceptedFileTypes || null;
        } else {
            newFieldData.acceptedFileTypes = null; // Ensure it's null for non-file types
        }

        const newField = formFieldRepository.create(newFieldData);
        const savedField = await formFieldRepository.save(newField);

        if ((type.field_name === 'checkbox' || type.field_name === 'radio') && Array.isArray(options)) {
            const dropdownOptionRepo = AppDataSource.getRepository(DropdownOption);
            for (const optionValue of options) {
                if (typeof optionValue === 'string' && optionValue.trim() !== '') {
                    const newOption = dropdownOptionRepo.create({
                        id_field: savedField.id_field,
                        value: optionValue.trim(),
                    });
                    await dropdownOptionRepo.save(newOption);
                }
            }
        }
        const completeField = await formFieldRepository.findOne({
            where: { id_field: savedField.id_field },
            relations: ['type', 'dropdownOptions']
        });
        res.status(201).json(completeField);
    } catch (error: any) {
        console.error("Error creating form field:", error);
        res.status(500).json({ message: "Error creating form field", error: error.message });
    }
};

// GET /api/events/:eventId/form-fields
export const getFormFieldsForEvent = async (req: Request, res: Response): Promise<void> => {
    try {
        const eventIdString = req.params.eventId;
        const eventId = parseInt(eventIdString, 10);

        if (isNaN(eventId)) {
            res.status(400).json({ message: "Invalid event ID format." });
            return;
        }

        const fields = await formFieldRepository.find({
            where: { id_event: eventId },
            relations: ['type', 'dropdownOptions'],
            order: { sequence: 'ASC' }
        });

        const responseFields = fields.map(field => {
            return {
                id_field: field.id_field,
                label: field.label,
                type: field.type,
                is_required: field.is_required,
                sequence: field.sequence,
                accepted_file_types: field.acceptedFileTypes,
                options: (field.dropdownOptions && Array.isArray(field.dropdownOptions))
                    ? field.dropdownOptions.map(option => option.value)
                    : []
            };
        });

        res.status(200).json(responseFields);
    } catch (error: any) {
        console.error("Error fetching form fields for event:", error);
        res.status(500).json({ message: "Error fetching form fields for event", error: error.message });
    }
};

// GET /api/events/:eventId/form-fields/:fieldId  OR /api/form-fields/:fieldId
export const getFormFieldById = async (req: Request, res: Response) => {
    try {
        const fieldId = parseInt(req.params.fieldId || req.params.id);
        const field = await formFieldRepository.findOne({
            where: { id_field: fieldId },
            relations: ['type', 'dropdownOptions', 'event'] // 'event' might be heavy if not needed
        });
        if (field) {
            // The 'field' object from TypeORM will already include 'acceptedFileTypes' if it's in the entity
            res.status(200).json(field);
        } else {
            res.status(404).json({ message: "Form field not found" });
        }
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching form field", error: error.message });
    }
};

// PUT /api/events/:eventId/form-fields/:fieldId OR /api/form-fields/:fieldId
export const updateFormField = async (req: Request, res: Response) => {
    try {
        const fieldId = parseInt(req.params.fieldId || req.params.id);
        const existingField = await formFieldRepository.findOne({
            where: { id_field: fieldId },
            relations: ['type'] // Load type to check if it's a file field
        });

        if (!existingField) {
            return res.status(404).json({ message: "Form field not found" });
        }

        const { label, id_type, is_required, order, options, acceptedFileTypes, help_text, min_length, max_length, min_value, max_value } = req.body;

        const updateData: Partial<FormField> = {
            label,
            id_type,
            is_required: !!is_required,
            sequence: parseInt(order) || existingField.sequence,
           
        };

        let fieldType = existingField.type;
        if (id_type !== undefined && id_type !== existingField.id_type) {
            const newType = await formFieldTypeRepository.findOneBy({ id_type });
            if (!newType) return res.status(400).json({ message: "Invalid new form field type ID" });
            fieldType = newType; // Use the new type for checking 'file'
            updateData.id_type = id_type; // Update the type ID
        }


        if (fieldType.field_name === 'file') {
            updateData.acceptedFileTypes = acceptedFileTypes !== undefined ? acceptedFileTypes : existingField.acceptedFileTypes;
        } else {
            updateData.acceptedFileTypes = null; // Ensure it's null if not a file type or changed from file type
        }

        formFieldRepository.merge(existingField, updateData);
        const updatedField = await formFieldRepository.save(existingField);

        // Handle options update (simplified: delete existing and recreate)
        // For a more robust solution, you'd compare and update/add/delete specific options.
        if ((fieldType.field_name === 'checkbox' || fieldType.field_name === 'radio') && Array.isArray(options)) {
            const dropdownOptionRepo = AppDataSource.getRepository(DropdownOption);
            await dropdownOptionRepo.delete({ id_field: updatedField.id_field }); // Delete old options

            for (const optionValue of options) {
                if (typeof optionValue === 'string' && optionValue.trim() !== '') {
                    const newOption = dropdownOptionRepo.create({
                        id_field: updatedField.id_field,
                        value: optionValue.trim(),
                    });
                    await dropdownOptionRepo.save(newOption);
                }
            }
        }


        const completeUpdatedField = await formFieldRepository.findOne({
            where: { id_field: updatedField.id_field },
            relations: ['type', 'dropdownOptions']
        });

        res.status(200).json(completeUpdatedField);
    } catch (error: any) {
        console.error("Error updating form field:", error);
        res.status(500).json({ message: "Error updating form field", error: error.message });
    }
};

// DELETE /api/events/:eventId/form-fields/:fieldId OR /api/form-fields/:fieldId
export const deleteFormField = async (req: Request, res: Response) => {
    try {
        const fieldId = parseInt(req.params.fieldId || req.params.id);
        // Before deleting the field, delete its associated dropdown options
        await AppDataSource.getRepository(DropdownOption).delete({ id_field: fieldId });

        const result = await formFieldRepository.delete(fieldId);
        if (result.affected === 0) {
            return res.status(404).json({ message: "Form field not found" });
        }
        res.status(200).json({ message: "Form field deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting form field:", error);
        res.status(500).json({ message: "Error deleting form field", error: error.message });
    }
};

export const setFormFieldsForEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const eventId = parseInt(req.params.eventId);
        const fieldsData = req.body; // This is payloadFields from FormBuilder.tsx

        if (isNaN(eventId)) {
            res.status(400).json({ message: "Invalid event ID." });
            return;
        }
        if (!Array.isArray(fieldsData)) {
            res.status(400).json({ message: "Request body must be an array of form fields." });
            return;
        }

        const event = await eventRepository.findOneBy({ id_event: eventId });
        if (!event) {
            res.status(404).json({ message: "Event not found" });
            return;
        }

        await AppDataSource.transaction(async transactionalEntityManager => {
            const existingFields = await transactionalEntityManager.find(FormField, { where: { id_event: eventId }, select: ["id_field"] });
            if (existingFields.length > 0) {
                const existingFieldIds = existingFields.map(f => f.id_field);
                await transactionalEntityManager.delete(DropdownOption, { id_field: In(existingFieldIds) });
            }
            await transactionalEntityManager.delete(FormField, { id_event: eventId });

            for (const fieldDef of fieldsData) {
                // Destructure all potential fields, including accepted_file_types
                const { label, id_type, is_required, sequence, help_text, options, accepted_file_types, min_length, max_length, min_value, max_value } = fieldDef;

                const type = await transactionalEntityManager.findOneBy(FormFieldType, { id_type });
                if (!type) {
                    throw new Error(`Invalid form field type ID: ${id_type} for field "${label}"`);
                }

                const newFieldData: Partial<FormField> = {
                    id_event: eventId,
                    label,
                    id_type,
                    is_required: !!is_required,
                    sequence: parseInt(sequence) || 0,
                    };

                if (type.field_name === 'file') {
                    newFieldData.acceptedFileTypes = accepted_file_types || null; // Use accepted_file_types from payload
                } else {
                    newFieldData.acceptedFileTypes = null; // Ensure it's null for non-file types
                }

                const newFieldEntity = transactionalEntityManager.create(FormField, newFieldData);
                const savedField = await transactionalEntityManager.save(newFieldEntity);

                if ((type.field_name === 'checkbox' || type.field_name === 'radio') && Array.isArray(options) && options.length > 0) {
                    for (const optionValue of options) {
                        if (typeof optionValue === 'string' && optionValue.trim() !== '') {
                            const newOption = transactionalEntityManager.create(DropdownOption, {
                                id_field: savedField.id_field,
                                value: optionValue.trim(),
                            });
                            await transactionalEntityManager.save(newOption);
                        }
                    }
                }
            }
        });

        const finalFieldsWithDetails = await formFieldRepository.find({
            where: { id_event: eventId },
            relations: ['type', 'dropdownOptions'],
            order: { sequence: 'ASC' }
        });

        const responseFields = finalFieldsWithDetails.map(field => ({
            id_field: field.id_field,
            label: field.label,
            type: field.type,
            is_required: field.is_required,
            sequence: field.sequence,
            accepted_file_types: field.acceptedFileTypes, // <<<< ADDED
            options: (field.dropdownOptions && Array.isArray(field.dropdownOptions))
                ? field.dropdownOptions.map(option => option.value)
                : []
        }));

        res.status(200).json(responseFields);

    } catch (error: any) {
        console.error("Error in setFormFieldsForEvent:", error);
        if (error.message.startsWith("Invalid form field type ID")) {
            res.status(400).json({ message: error.message });
            return;
        }
        next(error);
    }
};

