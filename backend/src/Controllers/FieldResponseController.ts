import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { FieldResponse } from '../Models/FieldResponse';
import { Inscription } from '../Models/Inscription'; 
import { FormField } from '../Models/FormField'; 
import { AuthenticatedRequest } from '../types/auth.types';

const fieldResponseRepository = AppDataSource.getRepository(FieldResponse);
const inscriptionRepository = AppDataSource.getRepository(Inscription);
const formFieldRepository = AppDataSource.getRepository(FormField);


export const submitResponsesForInscription = async (req: Request, res: Response) => {
    console.log(`[submitResponsesForInscription] Received request for inscriptionId: ${req.params.inscriptionId}`);
    console.log("[submitResponsesForInscription] Request body:", JSON.stringify(req.body, null, 2));

    try {
        const inscriptionId = parseInt(req.params.inscriptionId);
        const responsesData = req.body.responses as Array<{ id_field: number; response_text?: string; response_file_path?: string }>; 

        if (!req.body.responses || !Array.isArray(req.body.responses)) {
            console.error("[submitResponsesForInscription] 'responses' array is missing or not an array in request body for inscriptionId:", inscriptionId);
            return res.status(400).json({ message: "'responses' array is required in request body and must be an array." });
        }
        if (responsesData.length === 0) {
            console.log("[submitResponsesForInscription] Received empty 'responses' array for inscriptionId:", inscriptionId);

        }


        const inscription = await inscriptionRepository.findOne({
            where: { id_inscription: inscriptionId },
            relations: ['event', 'event.formFields', 'user'] 
        });

        if (!inscription) {
            console.warn(`[submitResponsesForInscription] Inscription not found for ID: ${inscriptionId}`);
            return res.status(404).json({ message: "Inscription not found" });
        }

        const userId = (req as AuthenticatedRequest).user?.id_user;
        if (inscription.id_user !== userId) {
            console.warn(`[submitResponsesForInscription] Forbidden attempt. User ${userId} tried to submit for inscription ${inscriptionId} owned by user ${inscription.id_user}.`);
            return res.status(403).json({ message: "Forbidden: You can only submit responses for your own inscriptions." });
        }

        console.log(`[submitResponsesForInscription] Processing ${responsesData.length} responses for inscription ID: ${inscriptionId}, Event ID: ${inscription.id_event}`);

        const createdOrUpdatedResponses: FieldResponse[] = [];
        const errorsEncountered: string[] = [];

        for (const resData of responsesData) {
            console.log(`[submitResponsesForInscription] Processing response data for field ID ${resData.id_field}:`, JSON.stringify(resData));
            
            if (resData.id_field === undefined || resData.id_field === null) {
                console.warn("[submitResponsesForInscription] Skipped response due to missing id_field:", JSON.stringify(resData));
                errorsEncountered.push(`Response data missing id_field: ${JSON.stringify(resData)}`);
                continue;
            }

            const formField = await formFieldRepository.findOneBy({ id_field: resData.id_field, id_event: inscription.id_event });
            if (!formField) {
                console.warn(`[submitResponsesForInscription] Form field ${resData.id_field} not found for event ${inscription.id_event} or invalid for this inscription. Skipping this response.`);
                errorsEncountered.push(`Form field ${resData.id_field} not found for event ${inscription.id_event}.`);
                continue;
            }

            let existingResponse = await fieldResponseRepository.findOne({
                where: { id_inscription: inscriptionId, id_field: resData.id_field }
            });

            if (existingResponse) {
                console.log(`[submitResponsesForInscription] Updating existing response for inscription ${inscriptionId}, field ${resData.id_field}`);
                existingResponse.response_text = resData.response_text;
                existingResponse.response_file_path = resData.response_file_path; // TODO: file upload logic
                try {
                    await fieldResponseRepository.save(existingResponse);
                    console.log(`[submitResponsesForInscription] Successfully updated response ID: ${existingResponse.id_response}`);
                    createdOrUpdatedResponses.push(existingResponse);
                } catch (dbError) {
                    console.error(`[submitResponsesForInscription] DB Error updating response for field ${resData.id_field}:`, dbError);
                    errorsEncountered.push(`DB Error updating response for field ${resData.id_field}.`);
                }
            } else {
                console.log(`[submitResponsesForInscription] Creating new response for inscription ${inscriptionId}, field ${resData.id_field}`);
                const newResponse = fieldResponseRepository.create({
                    id_inscription: inscriptionId,
                    id_field: resData.id_field,
                    response_text: resData.response_text,
                    response_file_path: resData.response_file_path, 
                });
                try {
                    await fieldResponseRepository.save(newResponse);
                    console.log(`[submitResponsesForInscription] Successfully created new response ID: ${newResponse.id_response}`);
                    createdOrUpdatedResponses.push(newResponse);
                } catch (dbError) {
                    console.error(`[submitResponsesForInscription] DB Error creating new response for field ${resData.id_field}:`, dbError);
                    errorsEncountered.push(`DB Error creating new response for field ${resData.id_field}.`);
                }
            }
        }

        if (errorsEncountered.length > 0) {
            console.warn(`[submitResponsesForInscription] Finished processing for inscription ${inscriptionId} with ${errorsEncountered.length} errors/warnings.`);
            return res.status(207).json({ 
                message: "Responses processed with some issues.", 
                successfulResponses: createdOrUpdatedResponses,
                errors: errorsEncountered 
            });
        }

        console.log(`[submitResponsesForInscription] Successfully processed all responses for inscription ${inscriptionId}.`);
        res.status(201).json({ message: "Responses submitted successfully", responses: createdOrUpdatedResponses });

    } catch (error: any) {
        console.error("[submitResponsesForInscription] Critical error processing responses:", error);
        res.status(500).json({ message: "Error submitting responses", error: error.message });
    }
};

export const getResponsesForInscription = async (req: Request, res: Response) => {
    try {
        const inscriptionId = parseInt(req.params.inscriptionId);
        const responses = await fieldResponseRepository.find({
            where: { id_inscription: inscriptionId },
            relations: ['formField', 'formField.type'] 
        });
        res.status(200).json(responses);
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching responses for inscription", error: error.message });
    }
};

export const getAllResponsesForEvent = async (req: Request, res: Response) => {
   
    try {
        const eventId = parseInt(req.params.eventId);
        const inscriptions = await inscriptionRepository.find({
            where: { id_event: eventId },
            relations: ['fieldResponses', 'fieldResponses.formField', 'user']
        });

        res.status(200).json(inscriptions); 
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching all responses for event", error: error.message });
    }
};
