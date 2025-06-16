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
            where: { id_event: id, is_deleted: false }, // Only fetch non-deleted
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
        currentDate.setHours(0, 0, 0, 0); // Normalize current date

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
            if (regEndDateObj > eventEndDate) { // Registration should end before or on the event end date
                res.status(400).json({ message: "La date de fin d'inscription ne peut pas être après la date de fin de l'événement." });
                return;
            }
        }

        const currentDateForCreate = new Date();
        currentDateForCreate.setHours(0,0,0,0); // Normalized current date for comparison

        let initialStatus = 'À venir'; // Default

        if (regStartDateObj && regEndDateObj) {
            // Status based on registration dates
            if (currentDateForCreate.getTime() < regStartDateObj.getTime()) {
                initialStatus = "À venir";
            } else if (currentDateForCreate.getTime() >= regStartDateObj.getTime() && currentDateForCreate.getTime() <= regEndDateObj.getTime()) {
                initialStatus = "En cours";
            } else { // currentDateForCreate.getTime() > regEndDateObj.getTime()
                initialStatus = "Terminé";
            }
        } else {
            // Fallback: Status based on event dates
            // Given eventStartDate cannot be in the past due to validation,
            // it will usually be "À venir" or "En cours" at creation if no reg dates.
            if (currentDateForCreate.getTime() < eventStartDate.getTime()) {
                initialStatus = "À venir";
            } else if (currentDateForCreate.getTime() >= eventStartDate.getTime() && currentDateForCreate.getTime() <= eventEndDate.getTime()) {
                initialStatus = "En cours";
            } else { // Should be rare due to eventStartDate validation
                initialStatus = "Terminé";
            }
        }

        const eventDataToCreate = {
            ...otherEventData,
            start_date: eventStartDate.toISOString(),
            end_date: eventEndDate.toISOString(),
            registration_start_date: regStartDateObj ? regStartDateObj.toISOString() : null,
            registration_end_date: regEndDateObj ? regEndDateObj.toISOString() : null,
            status: initialStatus // Use the determined initial status
        };

        const newEvent = eventRepository.create(eventDataToCreate as Event);
        await eventRepository.save(newEvent);

        console.log("Event saved, attempting to create notifications..."); // DEBUG LOG

        const usersToNotify = await userRepository.find({ where: { role: { id_role: 2 } } }); // Example: students
        console.log(`Found ${usersToNotify.length} users to notify.`); // DEBUG LOG

        if (usersToNotify.length > 0) {
            for (const user of usersToNotify) {
                try {
                    await createNotification(
                        user.id_user,
                        NotificationType.EVENT_CREATED,
                        `Nouvel événement disponible : "${newEvent.title_event}". Consultez les détails et inscrivez-vous !`,
                        newEvent.id_event
                    );
                    console.log(`Notification created for user ${user.id_user} for event ${newEvent.id_event}`); // DEBUG LOG
                } catch (notificationError) {
                    console.error(`Failed to create notification for user ${user.id_user}:`, notificationError); // IMPORTANT
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

        // Determine status based on (potentially new) dates, unless a status is explicitly provided and valid
        const todayForStatus = new Date();
        todayForStatus.setHours(0,0,0,0); // Normalized current date

        let newCalculatedStatus = eventToUpdate.status; 

        if (status && ['À venir', 'En cours', 'Terminé', 'Annulé'].includes(status)) {
            // If status is explicitly passed in request body, use it (admin override)
            newCalculatedStatus = status;
        } else if (eventToUpdate.status !== 'Annulé') { // Don't override 'Annulé' unless explicitly changed
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
                } else { // todayForStatus.getTime() > regEndDateFromUpdate.getTime()
                    newCalculatedStatus = "Terminé";
                }
            } else {
                // Fallback: Status based on event dates
                if (todayForStatus.getTime() < eventStartDateFromUpdate.getTime()) {
                    newCalculatedStatus = "À venir";
                } else if (todayForStatus.getTime() >= eventStartDateFromUpdate.getTime() && todayForStatus.getTime() <= eventEndDateFromUpdate.getTime()) {
                    newCalculatedStatus = "En cours";
                } else { // todayForStatus.getTime() > eventEndDateFromUpdate.getTime()
                    newCalculatedStatus = "Terminé";
                }
            }
        }
        eventToUpdate.status = newCalculatedStatus;
        
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

        // Notify registered users before soft deleting
        const registrations = await inscriptionRepository.find({
            where: { event: { id_event: id } },
            relations: ['user']
        });
        for (const reg of registrations) {
            if (reg.user && reg.user.id_user) {
                await createNotification(
                    reg.user.id_user,
                    NotificationType.EVENT_CANCELLED, // Or a new type like EVENT_SOFT_DELETED
                    `L'événement "${eventToDelete.title_event}" auquel vous étiez inscrit a été retiré.`,
                    id
                );
            }
        }

        // Soft delete logic
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
        const eventIdString = req.params.id_event || req.params.id || req.params.eventId; // Be flexible
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
    const { id_event } = req.params; // Assuming route is /:id_event/fields
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
    const { id_event } = req.params; // Assuming route is /:id_event/fields
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
    // todayStart is UTC midnight of the current day, good for comparing date boundaries
    const todayStart = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()));
    
    // For reminders (e.g., 24 hours from now)
    const reminderWindowStart = new Date(currentDate.getTime() + 23 * 60 * 60 * 1000);
    const reminderWindowEnd = new Date(currentDate.getTime() + 25 * 60 * 60 * 1000);   

    // For registration deadline reminders (e.g., 48 hours from now)
    const regDeadlineWindowStart = new Date(currentDate.getTime() + 47 * 60 * 60 * 1000);
    const regDeadlineWindowEnd = new Date(currentDate.getTime() + 49 * 60 * 60 * 1000);


    try {
        const eventsToProcess = await eventRepository.find({
            where: [ // Fetch events whose status might change or need reminders
                { status: "À venir", is_deleted: false },
                { status: "En cours", is_deleted: false },
            ],
            relations: ["inscriptions", "inscriptions.user", "inscriptions.user.role"]
        });

        const usersForGeneralReminders = await userRepository.find({ where: { role: { id_role: 2 } } }); // Example: students

        for (const event of eventsToProcess) {
            let newStatus = event.status; // Default to current status

            // Only update status if not manually set to 'Annulé'
            if (event.status !== 'Annulé') {
                const regStartDate = event.registration_start_date ? new Date(event.registration_start_date) : null;
                const regEndDate = event.registration_end_date ? new Date(event.registration_end_date) : null;
                
                const eventStartDateForLogic = new Date(event.start_date); // For fallback and reminders
                const eventEndDateForLogic = new Date(event.end_date);     // For fallback

                if (regStartDate && regEndDate) {
                    // Primary logic: Status based on registration dates
                    // Dates from DB are already normalized (start_date to 00:00, end_date to 23:59)
                    // and stored as ISO strings (likely UTC). new Date() parses them correctly.
                    // todayStart.getTime() is UTC milliseconds.
                    if (todayStart.getTime() < regStartDate.getTime()) {
                        newStatus = "À venir";
                    } else if (todayStart.getTime() >= regStartDate.getTime() && todayStart.getTime() <= regEndDate.getTime()) {
                        newStatus = "En cours";
                    } else { // todayStart.getTime() > regEndDate.getTime()
                        newStatus = "Terminé";
                    }
                } else {
                    // Fallback logic: Status based on event's actual start and end dates
                    if (todayStart.getTime() < eventStartDateForLogic.getTime()) {
                        newStatus = "À venir";
                    } else if (todayStart.getTime() >= eventStartDateForLogic.getTime() && todayStart.getTime() <= eventEndDateForLogic.getTime()) {
                        newStatus = "En cours";
                    } else { // todayStart.getTime() > eventEndDateForLogic.getTime()
                        newStatus = "Terminé";
                    }
                }
            }

            if (newStatus !== event.status) {
                console.log(`Updating Event ID ${event.id_event} (${event.title_event}): old status "${event.status}", new status "${newStatus}".`);
                event.status = newStatus;
                await eventRepository.save(event);

                let statusChangeMessage = "";
                // Customize messages if needed to reflect registration status
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

            // --- Reminder Logic ---
            // The reminder logic should still primarily use event.start_date for event reminders,
            // and registration_end_date for registration deadline reminders.
            // The event.status (which now reflects registration) can be used as a condition.

            const eventActualStartDate = new Date(event.start_date); // Use actual event start for event reminder
            const registrationActualEndDate = event.registration_end_date ? new Date(event.registration_end_date) : null;

            // 2. "Registrations Open" Notification
            // This notification logic might need adjustment if event.status already reflects this.
            // For example, you might send it when status changes to "En cours" (registration) for the first time.
            // The current logic sends it if registration_start_date is today and status is "À venir" (registration-wise).
            // This might still be valid if "À venir" means registration starts later today.
            const registrationActualStartDate = event.registration_start_date ? new Date(event.registration_start_date) : null;
            if (event.status === "À venir" && registrationActualStartDate && registrationActualStartDate.getTime() <= todayStart.getTime()) {
                 // (Potentially redundant if status update to "En cours" handles this, or adjust condition)
                console.log(`Considering "Registrations Open" notification for Event ID ${event.id_event}`);
                // ... your existing notification logic ...
            }

            // 3. EVENT_REMINDER Notification (uses event's actual start_date)
            // Condition on event.status might be: if registration is 'En cours' or 'À venir' (meaning event itself is still upcoming or ongoing)
            if ((event.status === "À venir" || event.status === "En cours") && 
                eventActualStartDate >= reminderWindowStart && eventActualStartDate <= reminderWindowEnd) {
                console.log(`Sending EVENT_REMINDER for Event ID ${event.id_event}`);
                // ... your existing notification logic ...
            }

            // 4. REGISTRATION_DEADLINE_REMINDER Notification (uses registration_end_date)
            if (registrationActualEndDate && 
                (event.status === "À venir" || event.status === "En cours") && // Registration is still open or about to open
                registrationActualEndDate >= regDeadlineWindowStart && registrationActualEndDate <= regDeadlineWindowEnd) {
                console.log(`Sending REGISTRATION_DEADLINE_REMINDER for Event ID ${event.id_event}`);
                // ... your existing notification logic ...
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

        // Fetch only non-deleted events.
        const allSystemEvents = await eventRepository.find({
            where: { is_deleted: false } 
        });

        const upcoming: Event[] = [];
        const ongoing: Event[] = [];
        const finished: Event[] = [];
        const cancelled: Event[] = [];

        for (const event of allSystemEvents) {
            // Directly use the status from the database.
            const effectiveStatus = event.status;

            // The logic to create a new eventForResponse instance if status changed
            // is no longer necessary, as effectiveStatus will always be event.status.
            // We can directly use 'event' in the switch statement.

            switch (effectiveStatus) { // This is equivalent to switch (event.status)
                case 'Annulé': 
                    cancelled.push(event);
                    break;
                case 'Terminé': // This will now count events where registration is 'Terminé'
                    finished.push(event);
                    break;
                case 'En cours': // This will now count events where registration is 'En cours'
                    ongoing.push(event);
                    break;
                case 'À venir': // This will now count events where registration is 'À venir'
                    upcoming.push(event);
                    break;
                default:
                    console.warn(`Event ID ${event.id_event} has an unhandled status: ${event.status}`);
                    break;
            }
        }
        
        // Sorting logic (can remain the same)
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
            relations: ['event'], // event relation is enough here
            order: { event: { start_date: "ASC" } }
        });

        const registeredEventsDetails = registrations.map(reg => ({
            eventId: reg.event.id_event,
            title_event: reg.event.title_event, // Good to include for display
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
