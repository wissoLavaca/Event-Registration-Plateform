import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/db';
import { FormField } from '../Models/FormField';
import { FormFieldType, FieldTypeName } from '../Models/FormFieldType';
import { AuthenticatedRequest } from '../types/auth.types';
import { LessThanOrEqual, MoreThanOrEqual, Not, IsNull, Between } from "typeorm"; 
import { Event } from '../Models/Event';
import { createNotification } from './NotificationController';
import { NotificationType } from '../Models/Notification';
import { Inscription } from '../Models/Inscription';
import { User } from '../Models/User';

const eventRepository = AppDataSource.getRepository(Event);
const formFieldRepository = AppDataSource.getRepository(FormField);
const formFieldTypeRepository = AppDataSource.getRepository(FormFieldType);
const userRepository = AppDataSource.getRepository(User); // Added for convenience
const inscriptionRepository = AppDataSource.getRepository(Inscription); // Added for convenience


export const getAllEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const events = await eventRepository.find({
            where: { is_deleted: false }, // Only fetch non-deleted events
            relations: ['formFields', 'formFields.type', 'formFields.dropdownOptions']
        });
        res.status(200).json(events);
    } catch (error: any) {
        next(error);
    }
};

export const getEventById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const idString = req.params.id;
        const id = parseInt(idString, 10);

        if (isNaN(id)) {
            res.status(400).json({ message: "Invalid event ID." });
            return;
        }

        const event = await eventRepository.findOne({
            where: { id_event: id, is_deleted: false }, 
            relations: ['formFields', 'formFields.type', 'formFields.dropdownOptions', 'inscriptions', 'inscriptions.user']
        });

        if (event) {
            res.status(200).json(event);
        } else {
            res.status(404).json({ message: "Event not found or has been deleted" });
        }
    } catch (error: any) {
        next(error);
    }
};

export const createEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const actingUserId = req.user?.id_user;
        const {
            start_date,
            end_date,
            registration_start_date,
            registration_end_date,
            ...otherEventData
        } = req.body;

        if (!start_date || typeof start_date !== 'string' || !end_date || typeof end_date !== 'string') {
            res.status(400).json({ message: "Start date and end date are required and must be strings." });
            return;
        }
        if ((registration_start_date && typeof registration_start_date !== 'string') || (registration_end_date && typeof registration_end_date !== 'string')) {
            res.status(400).json({ message: "Registration dates must be strings if provided." });
            return;
        }

        const eventStartDate = new Date(start_date);
        const eventEndDate = new Date(end_date);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); 

        if (isNaN(eventStartDate.getTime()) || isNaN(eventEndDate.getTime())) {
            res.status(400).json({ message: "Invalid date format for event start or end date." });
            return;
        }
        eventStartDate.setHours(0,0,0,0);
        eventEndDate.setHours(23,59,59,999);


        if (eventStartDate < currentDate) {
            res.status(400).json({ message: "La date de début ne peut pas être antérieure à la date actuelle." });
            return;
        }
        if (eventEndDate < eventStartDate) {
            res.status(400).json({ message: "La date de fin ne peut pas être antérieure à la date de début." });
            return;
        }

        let regStartDateObj: Date | null = null;
        let regEndDateObj: Date | null = null;

        if (registration_start_date) {
            regStartDateObj = new Date(registration_start_date);
            if (isNaN(regStartDateObj.getTime())) {
                res.status(400).json({ message: "Invalid date format for registration start date." });
                return;
            }
            regStartDateObj.setHours(0,0,0,0);
            if (regStartDateObj > eventStartDate) {
                res.status(400).json({ message: "La date de début d'inscription ne peut pas être après la date de début de l'événement." });
                return;
            }
        }
        if (registration_end_date) {
            regEndDateObj = new Date(registration_end_date);
            if (isNaN(regEndDateObj.getTime())) {
                res.status(400).json({ message: "Invalid date format for registration end date." });
                return;
            }
            regEndDateObj.setHours(23,59,59,999);
            if (regStartDateObj && regEndDateObj < regStartDateObj) {
                res.status(400).json({ message: "La date de fin d'inscription ne peut pas être antérieure à sa date de début." });
                return;
            }
            if (regEndDateObj > eventEndDate) { 
                res.status(400).json({ message: "La date de fin d'inscription ne peut pas être après la date de fin de l'événement." });
                return;
            }
        }

        const currentDateForCreate = new Date();
        currentDateForCreate.setHours(0,0,0,0); 

        let initialStatus = 'À venir'; 

        if (regStartDateObj && regEndDateObj) {
            if (currentDateForCreate.getTime() < regStartDateObj.getTime()) {
                initialStatus = "À venir";
            } else if (currentDateForCreate.getTime() >= regStartDateObj.getTime() && currentDateForCreate.getTime() <= regEndDateObj.getTime()) {
                initialStatus = "En cours";
            } else { 
                initialStatus = "Terminé";
            }
        } else {

            if (currentDateForCreate.getTime() < eventStartDate.getTime()) {
                initialStatus = "À venir";
            } else if (currentDateForCreate.getTime() >= eventStartDate.getTime() && currentDateForCreate.getTime() <= eventEndDate.getTime()) {
                initialStatus = "En cours";
            } else {
                initialStatus = "Terminé";
            }
        }

        const eventDataToCreate = {
            ...otherEventData,
            start_date: eventStartDate.toISOString(),
            end_date: eventEndDate.toISOString(),
            registration_start_date: regStartDateObj ? regStartDateObj.toISOString() : null,
            registration_end_date: regEndDateObj ? regEndDateObj.toISOString() : null,
            status: initialStatus,
            created_by_user_id: actingUserId || null
        };

        const newEvent = eventRepository.create(eventDataToCreate as Event);
        await eventRepository.save(newEvent);

        console.log("Event saved, attempting to create notifications...");

        const usersToNotify = await userRepository.find({ where: { role: { id_role: 2 } } }); 
        console.log(`Found ${usersToNotify.length} users to notify.`);

        if (usersToNotify.length > 0) {
            for (const user of usersToNotify) {
                try {
                    await createNotification(
                        user.id_user,
                        NotificationType.EVENT_CREATED,
                        `Nouvel événement disponible : "${newEvent.title_event}". Consultez les détails et inscrivez-vous !`,
                        newEvent.id_event
                    );
                    console.log(`Notification created for user ${user.id_user} for event ${newEvent.id_event}`); 
                } catch (notificationError) {
                    console.error(`Failed to create notification for user ${user.id_user}:`, notificationError); 
                }
            }
        }
        res.status(201).json(newEvent);
    } catch (error: any) {
        next(error);
    }
};

export const updateEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const idString = req.params.id;
        const id = parseInt(idString, 10);
        const actingUserId = req.user?.id_user; 

        if (isNaN(id)) {
            res.status(400).json({ message: "Invalid event ID format." });
            return;
        }

        const eventToUpdate = await eventRepository.findOneBy({ id_event: id, is_deleted: false });
        if (!eventToUpdate) {
            res.status(404).json({ message: "Event not found or has been deleted" });
            return;
        }

        const oldStatus = eventToUpdate.status;
        const oldTitle = eventToUpdate.title_event;

        const { start_date, end_date, registration_start_date, registration_end_date, status, ...otherEventData } = req.body;
        const updatePayload: Partial<Event> = { ...otherEventData };

        // Apply date changes
        if (start_date) updatePayload.start_date = new Date(start_date);
        if (end_date) updatePayload.end_date = new Date(end_date);
        if (registration_start_date) updatePayload.registration_start_date = new Date(registration_start_date);
        if (registration_end_date) updatePayload.registration_end_date = new Date(registration_end_date);

        eventRepository.merge(eventToUpdate, updatePayload);

        const todayForStatus = new Date();
        todayForStatus.setHours(0,0,0,0); 

        let newCalculatedStatus = eventToUpdate.status; 

        if (status && ['À venir', 'En cours', 'Terminé', 'Annulé'].includes(status)) {
            newCalculatedStatus = status;
        } else if (eventToUpdate.status !== 'Annulé') { 
            const regStartDateFromUpdate = eventToUpdate.registration_start_date ? new Date(eventToUpdate.registration_start_date) : null;
            const regEndDateFromUpdate = eventToUpdate.registration_end_date ? new Date(eventToUpdate.registration_end_date) : null;
            
            const eventStartDateFromUpdate = new Date(eventToUpdate.start_date);
            const eventEndDateFromUpdate = new Date(eventToUpdate.end_date);

            if (regStartDateFromUpdate && regEndDateFromUpdate) {
                // Status based on registration dates
                if (todayForStatus.getTime() < regStartDateFromUpdate.getTime()) {
                    newCalculatedStatus = "À venir";
                } else if (todayForStatus.getTime() >= regStartDateFromUpdate.getTime() && todayForStatus.getTime() <= regEndDateFromUpdate.getTime()) {
                    newCalculatedStatus = "En cours";
                } else { 
                    newCalculatedStatus = "Terminé";
                }
            } else {
                if (todayForStatus.getTime() < eventStartDateFromUpdate.getTime()) {
                    newCalculatedStatus = "À venir";
                } else if (todayForStatus.getTime() >= eventStartDateFromUpdate.getTime() && todayForStatus.getTime() <= eventEndDateFromUpdate.getTime()) {
                    newCalculatedStatus = "En cours";
                } else { 
                    newCalculatedStatus = "Terminé";
                }
            }
        }
        eventToUpdate.status = newCalculatedStatus;
        
        eventToUpdate.updated_at = new Date();
        eventToUpdate.updated_by_user_id = actingUserId || null;

        const updatedEvent = await eventRepository.save(eventToUpdate);

        const registrations = await inscriptionRepository.find({
            where: { event: { id_event: updatedEvent.id_event } },
            relations: ['user']
        });

        let notificationMessage = `L'événement "${updatedEvent.title_event}" auquel vous êtes inscrit a été mis à jour.`;
        let notificationType = NotificationType.EVENT_UPDATED;

        if (oldStatus !== updatedEvent.status && updatedEvent.status === 'Annulé') {
            notificationType = NotificationType.EVENT_CANCELLED;
            notificationMessage = `L'événement "${updatedEvent.title_event}" auquel vous êtes inscrit a été annulé.`;
        } else if (oldStatus !== updatedEvent.status) {
            notificationMessage = `Le statut de l'événement "${updatedEvent.title_event}" auquel vous êtes inscrit est maintenant : ${updatedEvent.status}.`;
        } else if (oldTitle !== updatedEvent.title_event) {
            notificationMessage = `Les détails de l'événement "${oldTitle}" (maintenant "${updatedEvent.title_event}") ont été mis à jour.`;
        }

        for (const reg of registrations) {
            if (reg.user && reg.user.id_user) {
                await createNotification(
                    reg.user.id_user,
                    notificationType,
                    notificationMessage,
                    updatedEvent.id_event
                );
            }
        }
        res.status(200).json(updatedEvent);
    } catch (error: any) {
        next(error);
    }
};

export const deleteEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const idString = req.params.id;
        const id = parseInt(idString, 10);
        const actingAdminId = req.user?.id_user;

        if (isNaN(id)) {
            res.status(400).json({ message: "Invalid event ID format." });
            return;
        }
        if (!actingAdminId) {
            res.status(401).json({ message: "Admin authentication required." });
            return;
        }

        const eventToDelete = await eventRepository.findOneBy({ id_event: id, is_deleted: false });
        if (!eventToDelete) {
            res.status(404).json({ message: "Event not found or already deleted" });
            return;
        }

        const registrations = await inscriptionRepository.find({
            where: { event: { id_event: id } },
            relations: ['user']
        });
        for (const reg of registrations) {
            if (reg.user && reg.user.id_user) {
                await createNotification(
                    reg.user.id_user,
                    NotificationType.EVENT_CANCELLED, 
                    `L'événement "${eventToDelete.title_event}" auquel vous étiez inscrit a été retiré.`,
                    id
                );
            }
        }

        eventToDelete.is_deleted = true;
        eventToDelete.deleted_at = new Date();
        eventToDelete.deleted_by_user_id = actingAdminId;
        await eventRepository.save(eventToDelete);

        res.status(200).json({ message: "Event soft-deleted successfully" });
    } catch (error: any) {
        next(error);
    }
};

export const getEventFields = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const eventIdString = req.params.id_event || req.params.id || req.params.eventId; 
        if (eventIdString === undefined) {
            res.status(400).json({ message: "Event ID is missing in request parameters for getEventFields." });
            return;
        }
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
        res.status(200).json(fields);
    } catch (error: any) {
        next(error);
    }
};

export const updateEventFields = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { id_event } = req.params; 
    const fieldsData = req.body;

    if (!Array.isArray(fieldsData)) {
        res.status(400).json({ message: "Request body must be an array of fields." });
        return;
    }

    const eventIdNum = parseInt(id_event, 10);
    if (isNaN(eventIdNum)) {
        res.status(400).json({ message: "Invalid event ID." });
        return;
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const event = await queryRunner.manager.findOneBy(Event, { id_event: eventIdNum });
        if (!event) {
            await queryRunner.rollbackTransaction();
            res.status(404).json({ message: `Event with ID ${eventIdNum} not found.` });
            return;
        }
        await queryRunner.manager.delete(FormField, { id_event: eventIdNum });

        const newFields = [];
        for (const fieldDef of fieldsData) {
            if (!fieldDef.label || (!fieldDef.type && !fieldDef.id_form_field_type)) {
                console.warn('Skipping field due to missing label or type identifier:', fieldDef);
                continue;
            }

            let typeEntity: FormFieldType | null = null;
            if (fieldDef.id_form_field_type) {
                typeEntity = await queryRunner.manager.findOneBy(FormFieldType, { id_type: fieldDef.id_form_field_type });
            } else if (fieldDef.type && typeof fieldDef.type === 'string') {
                typeEntity = await queryRunner.manager.findOneBy(FormFieldType, { field_name: fieldDef.type as FieldTypeName });
            }

            if (!typeEntity) {
                await queryRunner.rollbackTransaction();
                res.status(400).json({ message: `Invalid or missing form field type for field '${fieldDef.label}'.` });
                return;
            }

            const newFieldData: Partial<FormField> = {
                id_event: eventIdNum,
                label: fieldDef.label,
                id_type: typeEntity.id_type,
                is_required: fieldDef.isRequired === undefined ? false : fieldDef.isRequired,
                sequence: fieldDef.sequence,
            };
            const newField = queryRunner.manager.create(FormField, newFieldData);
            const savedField = await queryRunner.manager.save(newField);
            newFields.push(savedField);
        }

        await queryRunner.commitTransaction();
        res.status(200).json({ message: `Fields for event ${eventIdNum} updated successfully.`, fields: newFields });

    } catch (error: any) {
        await queryRunner.rollbackTransaction();
        next(error);
    } finally {
        await queryRunner.release();
    }
};

export const deleteEventFields = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { id_event } = req.params; 
    const eventIdNum = parseInt(id_event, 10);

    if (isNaN(eventIdNum)) {
        res.status(400).json({ message: "Invalid event ID." });
        return;
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const event = await queryRunner.manager.findOneBy(Event, { id_event: eventIdNum });
        if (!event) {
            await queryRunner.rollbackTransaction();
            res.status(404).json({ message: `Event with ID ${eventIdNum} not found.` });
            return;
        }

        await queryRunner.manager.delete(FormField, { id_event: eventIdNum });
        await queryRunner.commitTransaction();
        res.status(200).json({ message: `All fields for event ${eventIdNum} deleted successfully.` });
    } catch (error: any) {
        await queryRunner.rollbackTransaction();
        next(error);
    } finally {
        await queryRunner.release();
    }
};


export const getEventsCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const count = await eventRepository.count({ where: { is_deleted: false } });
        res.status(200).json({ count });
    } catch (error) {
        console.error("Error fetching event count:", error);
        next(error);
    }
};

export const updateEventStatusesScheduled = async (): Promise<void> => {
    console.log('Running scheduled task to update event statuses and send reminders...');
    const currentDate = new Date();
    const todayStart = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()));
    
    const reminderWindowStart = new Date(currentDate.getTime() + 23 * 60 * 60 * 1000);
    const reminderWindowEnd = new Date(currentDate.getTime() + 25 * 60 * 60 * 1000);   

    const regDeadlineWindowStart = new Date(currentDate.getTime() + 47 * 60 * 60 * 1000);
    const regDeadlineWindowEnd = new Date(currentDate.getTime() + 49 * 60 * 60 * 1000);


    try {
        const eventsToProcess = await eventRepository.find({
            where: [ 
                { status: "À venir", is_deleted: false },
                { status: "En cours", is_deleted: false },
            ],
            relations: ["inscriptions", "inscriptions.user", "inscriptions.user.role"]
        });

        const usersForGeneralReminders = await userRepository.find({ where: { role: { id_role: 2 } } }); 

        for (const event of eventsToProcess) {
            let newStatus = event.status; 

            if (event.status !== 'Annulé') {
                const regStartDate = event.registration_start_date ? new Date(event.registration_start_date) : null;
                const regEndDate = event.registration_end_date ? new Date(event.registration_end_date) : null;
                
                const eventStartDateForLogic = new Date(event.start_date); 
                const eventEndDateForLogic = new Date(event.end_date);    

                if (regStartDate && regEndDate) {

                    if (todayStart.getTime() < regStartDate.getTime()) {
                        newStatus = "À venir";
                    } else if (todayStart.getTime() >= regStartDate.getTime() && todayStart.getTime() <= regEndDate.getTime()) {
                        newStatus = "En cours";
                    } else {
                        newStatus = "Terminé";
                    }
                } else {
                    if (todayStart.getTime() < eventStartDateForLogic.getTime()) {
                        newStatus = "À venir";
                    } else if (todayStart.getTime() >= eventStartDateForLogic.getTime() && todayStart.getTime() <= eventEndDateForLogic.getTime()) {
                        newStatus = "En cours";
                    } else { 
                        newStatus = "Terminé";
                    }
                }
            }

            if (newStatus !== event.status) {
                console.log(`Updating Event ID ${event.id_event} (${event.title_event}): old status "${event.status}", new status "${newStatus}".`);
                event.status = newStatus;

                event.updated_at = new Date();
                event.updated_by_user_id = null; 

                await eventRepository.save(event);

                let statusChangeMessage = "";
                if (newStatus === "En cours") statusChangeMessage = `Les inscriptions pour l'événement "${event.title_event}" sont maintenant ouvertes (ou l'événement est en cours si pas de dates d'inscription).`;
                else if (newStatus === "Terminé") statusChangeMessage = `Les inscriptions pour l'événement "${event.title_event}" sont maintenant fermées (ou l'événement est terminé si pas de dates d'inscription).`;
                
                if (statusChangeMessage && event.inscriptions && event.inscriptions.length > 0) {
                    for (const reg of event.inscriptions) {
                        if (reg.user && reg.user.id_user) {
                            await createNotification(reg.user.id_user, NotificationType.EVENT_UPDATED, statusChangeMessage, event.id_event);
                        }
                    }
                }
            }



            const eventActualStartDate = new Date(event.start_date); 
            const registrationActualEndDate = event.registration_end_date ? new Date(event.registration_end_date) : null;
            const registrationActualStartDate = event.registration_start_date ? new Date(event.registration_start_date) : null;
            if (event.status === "À venir" && registrationActualStartDate && registrationActualStartDate.getTime() <= todayStart.getTime()) {
                console.log(`Considering "Registrations Open" notification for Event ID ${event.id_event}`);
            }

            if ((event.status === "À venir" || event.status === "En cours") && 
                eventActualStartDate >= reminderWindowStart && eventActualStartDate <= reminderWindowEnd) {
                console.log(`Sending EVENT_REMINDER for Event ID ${event.id_event}`);
            }

            if (registrationActualEndDate && 
                (event.status === "À venir" || event.status === "En cours") && 
                registrationActualEndDate >= regDeadlineWindowStart && registrationActualEndDate <= regDeadlineWindowEnd) {
                console.log(`Sending REGISTRATION_DEADLINE_REMINDER for Event ID ${event.id_event}`);
            }
        }
        console.log('Finished scheduled task for event statuses and reminders.');
    } catch (error) {
        console.error("Error in scheduled task updateEventStatusesScheduled:", error);
    }
};


export const getMyEventsSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.id_user;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated." });
            return;
        }

        const allSystemEvents = await eventRepository.find({
            where: { is_deleted: false } 
        });

        const upcoming: Event[] = [];
        const ongoing: Event[] = [];
        const finished: Event[] = [];
        const cancelled: Event[] = [];

        for (const event of allSystemEvents) {
            const effectiveStatus = event.status;

           

            switch (effectiveStatus) { 
                case 'Annulé': 
                    cancelled.push(event);
                    break;
                case 'Terminé':
                    finished.push(event);
                    break;
                case 'En cours': 
                    ongoing.push(event);
                    break;
                case 'À venir': 
                    upcoming.push(event);
                    break;
                default:
                    console.warn(`Event ID ${event.id_event} has an unhandled status: ${event.status}`);
                    break;
            }
        }
        
        const sortByStartDateAsc = (a: Event, b: Event) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        const sortByStartDateDesc = (a: Event, b: Event) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime();

        upcoming.sort(sortByStartDateAsc);
        ongoing.sort(sortByStartDateAsc);
        finished.sort(sortByStartDateDesc);
        cancelled.sort(sortByStartDateAsc);

        res.status(200).json({
            upcomingEvents: upcoming,
            ongoingEvents: ongoing,
            finishedEvents: finished,
            cancelledEvents: cancelled,
        });

    } catch (error) {
        console.error("Error in getMyEventsSummary:", error);
        next(error); 
    }
};

export const getMyRegisteredEvents = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.id_user;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated." });
            return;
        }

        const registrations = await inscriptionRepository.find({
            where: { user: { id_user: userId } },
            relations: ['event'], 
            order: { event: { start_date: "ASC" } }
        });

        const registeredEventsDetails = registrations.map(reg => ({
            eventId: reg.event.id_event,
            title_event: reg.event.title_event, 
            start_date: reg.event.start_date,
            status: reg.event.status,
            registrationDate: reg.created_at
        }));

        res.status(200).json(registeredEventsDetails);

    } catch (error) {
        console.error("Error in getMyRegisteredEvents:", error);
        next(error);
    }
};
