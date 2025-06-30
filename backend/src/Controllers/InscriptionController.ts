import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/db';
import { Inscription } from '../Models/Inscription';
import { User } from '../Models/User';
import { Event } from '../Models/Event';
import { FieldResponse } from '../Models/FieldResponse'; 
import { AuthenticatedRequest } from '../types/auth.types';
import { createNotification } from './NotificationController'; 
import { NotificationType } from '../Models/Notification';



const inscriptionRepository = AppDataSource.getRepository(Inscription);
const userRepository = AppDataSource.getRepository(User);
const eventRepository = AppDataSource.getRepository(Event);
const fieldResponseRepository = AppDataSource.getRepository(FieldResponse); 


export const createInscriptionForEvent = async (req: Request, res: Response, next: NextFunction) => { // Add next to params
    try {
        const eventId = parseInt(req.params.eventId);
        const userId = (req as AuthenticatedRequest).user?.id_user;

        if (isNaN(eventId)) { 
            return res.status(400).json({ message: "Invalid event ID." });
        }
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const event = await eventRepository.findOneBy({ id_event: eventId });
        if (!event) return res.status(404).json({ message: "Event not found" });

        const user = await userRepository.findOneBy({ id_user: userId });
        if (!user) return res.status(404).json({ message: "User not found" }); 

       const existingInscription = await inscriptionRepository.findOne({ where: { id_user: userId, id_event: eventId }});
        if (existingInscription) {
            return res.status(409).json({ message: "User already inscribed to this event" });
        }
        
        const newInscriptionEntity = inscriptionRepository.create({ 
            id_user: userId, 
            id_event: eventId,
           
        });
        const savedInscription = await inscriptionRepository.save(newInscriptionEntity);
        console.log(`[createInscriptionForEvent] Inscription ${savedInscription.id_inscription} created for event ${eventId} by user ${userId}`);

        const responsesToSave: FieldResponse[] = [];

        if (req.body) {
            for (const key in req.body) {
                if (key.startsWith('field_')) {
                    const fieldIdStr = key.split('_')[1];
                    const fieldId = parseInt(fieldIdStr);
                    if (!isNaN(fieldId)) {
                        const responseText = req.body[key] as string;
                        
                        const fieldResponse = fieldResponseRepository.create({
                            id_inscription: savedInscription.id_inscription,
                            id_field: fieldId,
                            response_text: responseText,
                        });
                        responsesToSave.push(fieldResponse);
                        console.log(`[createInscriptionForEvent] Prepared text response for field ${fieldId} (inscription ${savedInscription.id_inscription}): ${responseText}`);
                    } else {
                        console.warn(`[createInscriptionForEvent] Invalid fieldId parsed from req.body key: ${key}`);
                    }
                }
            }
        }


        if (req.files && Array.isArray(req.files)) {
            for (const file of (req.files as Express.Multer.File[])) {
                if (file.fieldname.startsWith('field_')) {
                    const fieldIdStr = file.fieldname.split('_')[1];
                    const fieldId = parseInt(fieldIdStr);
                    if (!isNaN(fieldId)) {
                        const existingTextResponseIndex = responsesToSave.findIndex(r => r.id_field === fieldId && r.response_text !== null && r.response_text !== undefined);
                        if (existingTextResponseIndex !== -1) {
                            console.log(`[createInscriptionForEvent] Field ${fieldId} (inscription ${savedInscription.id_inscription}) also had text data, replacing with file.`);
                            responsesToSave.splice(existingTextResponseIndex, 1);
                        }
                        
                        const fieldResponse = fieldResponseRepository.create({
                            id_inscription: savedInscription.id_inscription,
                            id_field: fieldId,
                            response_file_path: file.path, 
                        });
                        responsesToSave.push(fieldResponse);
                        console.log(`[createInscriptionForEvent] Prepared file response for field ${fieldId} (inscription ${savedInscription.id_inscription}): ${file.path}`);
                    } else {
                        console.warn(`[createInscriptionForEvent] Invalid fieldId parsed from file fieldname: ${file.fieldname}`);
                    }
                }
            }
        }

        if (responsesToSave.length > 0) {
            await fieldResponseRepository.save(responsesToSave);
            console.log(`[createInscriptionForEvent] Successfully saved ${responsesToSave.length} field responses for inscription ${savedInscription.id_inscription}`);
        } else {
            console.log(`[createInscriptionForEvent] No field responses to save for inscription ${savedInscription.id_inscription}`);
        }

        if (savedInscription && event && user) { 
            await createNotification(
                userId,
                NotificationType.REGISTRATION_CONFIRMATION,
                `Votre inscription à l'événement "${event.title_event}" a été confirmée.`,
                eventId
            );
        }

        res.status(201).json({ 
            message: "Successfully inscribed to event and responses saved.", 
            inscription: savedInscription 
        });

    } catch (error: any) {
        console.error("[createInscriptionForEvent] Error:", error);
        if (req.files && Array.isArray(req.files)) {
            (req.files as Express.Multer.File[]).forEach(file => {
                
                console.warn(`[createInscriptionForEvent] Orphaned file might exist due to error: ${file.path}. Manual cleanup might be needed or implement fs.unlink.`);
            });
        }
        if (next) {
             next(error);
        } else {
            res.status(500).json({ message: "Error creating inscription", error: error.message });
        }
    }
};

export const getInscriptionsForEvent = async (req: Request, res: Response) => {
    try {
        const eventId = parseInt(req.params.eventId);
        const inscriptions = await inscriptionRepository.find({
            where: { id_event: eventId },
            relations: ['user', 
                'user.departement',
                'fieldResponses', 
                'fieldResponses.formField'] 
        });
        res.status(200).json(inscriptions);
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching inscriptions for event", error: error.message });
    }
};

export const getInscriptionsForUser = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);

        const inscriptions = await inscriptionRepository.find({
            where: { id_user: userId },
            relations: ['event'] // Load event details
        });
        res.status(200).json(inscriptions);
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching inscriptions for user", error: error.message });
    }
};

export const getAllInscriptions = async (req: Request, res: Response) => {
    try {
        const inscriptions = await inscriptionRepository.find({ relations: ['user', 'event'] });
        res.status(200).json(inscriptions);
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching all inscriptions", error: error.message });
    }
};


export const getInscriptionById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const inscription = await inscriptionRepository.findOne({
            where: { id_inscription: id },
            relations: ['user', 'event', 'fieldResponses', 'fieldResponses.formField']
        });
        if (inscription) {
            res.status(200).json(inscription);
        } else {
            res.status(404).json({ message: "Inscription not found" });
        }
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching inscription", error: error.message });
    }
};

export const deleteInscription = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const result = await inscriptionRepository.delete(id);
        if (result.affected === 0) {
            return res.status(404).json({ message: "Inscription not found" });
        }
        res.status(200).json({ message: "Inscription cancelled successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Error cancelling inscription", error: error.message });
    }
};

export const getCurrentUserInscriptionForEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventIdString = req.params.eventId;
        const userId = (req as AuthenticatedRequest).user?.id_user;

        if (!eventIdString) {
            return res.status(400).json({ message: "Event ID is missing in request parameters." });
        }
        const eventId = parseInt(eventIdString, 10);

        if (isNaN(eventId)) {
            return res.status(400).json({ message: "Invalid event ID format." });
        }
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated." });
        }

        console.log(`[getCurrentUserInscriptionForEvent] Checking for user ${userId} inscription to event ${eventId}`);

        const inscription = await inscriptionRepository.findOne({
            where: { 
                id_event: eventId,
                id_user: userId 
            },
            relations: [
                'fieldResponses', 
                'fieldResponses.formField', 
                'fieldResponses.formField.type' 
            ] 
        });

        if (inscription) {
            console.log(`[getCurrentUserInscriptionForEvent] Found inscription:`, inscription.id_inscription);

            res.status(200).json(inscription);
        } else {
            console.log(`[getCurrentUserInscriptionForEvent] No inscription found for user ${userId} and event ${eventId}`);
            res.status(404).json({ message: "No registration found for this user and event." });
        }
    } catch (error: any) {
        console.error("[getCurrentUserInscriptionForEvent] Error:", error);
        if (next) {
            next(error);
        } else {
            res.status(500).json({ message: "Server error fetching user inscription for event.", error: error.message });
        }
    }
};
