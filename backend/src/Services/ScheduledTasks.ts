import cron from 'node-cron';
import { AppDataSource } from '../config/db';
import { Event } from '../Models/Event';
import { User } from '../Models/User';
import { Inscription } from '../Models/Inscription';
import { createNotification } from '../Controllers/NotificationController'; // Adjust path if NotificationController is elsewhere
import { NotificationType } from '../Models/Notification';
import { LessThanOrEqual, MoreThan, IsNull, Not, Between, Equal, In } from 'typeorm';

const eventRepository = AppDataSource.getRepository(Event);
const userRepository = AppDataSource.getRepository(User);
const inscriptionRepository = AppDataSource.getRepository(Inscription);

/**
 * Updates the status of events based on their start and end dates.
 * (Moved from EventController for better organization of scheduled tasks)
 */
export const updateEventStatuses = async (): Promise<void> => {
    console.log('Running scheduled task to update event statuses...');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

    try {
        // Find events that are currently "À venir" or "En cours"
        const eventsToUpdate = await eventRepository.find({
            where: {
                status: In(['À venir', 'En cours']), // Corrected: Use TypeORM's In operator
            },
        });

        for (const event of eventsToUpdate) {
            let newStatus = event.status; // Start with current status

            // Skip if event is already manually set to a terminal state like "Annulé"
            // (though the query above should already exclude "Annulé" if it's a final state not in Op.or)
            // If "Annulé" can be reverted, this check might need adjustment.
            // For now, assuming "Annulé" is handled manually and this task focuses on date-driven transitions.

            if (event.status !== 'Annulé') { // Double check, though query should handle it
                if (event.registration_start_date && event.registration_end_date) {
                    try {
                        const regStartDate = new Date(event.registration_start_date);
                        regStartDate.setHours(0, 0, 0, 0);

                        const regEndDate = new Date(event.registration_end_date);
                        regEndDate.setHours(0, 0, 0, 0);

                        if (isNaN(regStartDate.getTime()) || isNaN(regEndDate.getTime())) {
                            console.warn(`Event ID ${event.id_event}: Invalid registration dates. Status not changed.`);
                            // Optionally set to a specific error status or leave as is
                            // newStatus = 'Erreur Dates Inscription'; 
                            continue; // Skip update for this event if dates are invalid
                        }

                        // Logic based on registration dates
                        if (regEndDate < today) {
                          newStatus = 'Terminé'; // Registration period is over
                        } else if (regStartDate <= today && regEndDate >= today) {
                          newStatus = 'En cours'; // Registration is active/open
                        } else if (regStartDate > today) {
                          newStatus = 'À venir'; // Registration is in the future
                        }
                        // If none of the above, it means regStartDate is in the past but regEndDate is also in the past (covered by regEndDate < today)
                        // or regStartDate is in the future (covered by regStartDate > today)

                    } catch (parseError) {
                        console.error(`Event ID ${event.id_event}: Error parsing registration dates. Status not changed.`, parseError);
                        continue; // Skip update for this event if dates are unparseable
                    }
                } else {
                  // No registration dates set. What should the status be?
                  // Option 1: Leave as is (current behavior if it was "À venir" or "En cours")
                  // Option 2: Set to a specific status like "Dates Inscription Manquantes"
                  // Option 3: Default to "À venir" if it makes sense
                  console.warn(`Event ID ${event.id_event}: Registration dates not set. Status not changed from '${event.status}'.`);
                  // For now, we'll leave its status as is if no registration dates are found,
                  // assuming it might be managed differently or should remain "À venir".
                  // If you want to force it to "À venir":
                  // newStatus = 'À venir';
                }
            }


            if (newStatus !== event.status) {
                console.log(`Updating event ID ${event.id_event} from ${event.status} to ${newStatus}`);
                await event.update({ status: newStatus });
            }
        }
        console.log('Finished updating event statuses.');
    } catch (error) {
        console.error('Error in scheduled task updateEventStatuses:', error);
    }
};


/**
 * Sends reminders for registration deadlines (using registration_end_date).
 */
export const sendRegistrationDeadlineReminders = async (): Promise<void> => {
    console.log('Running scheduled task to send registration end date reminders...');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Start of today UTC

    // Let's remind users, for example, 2 days before the registration_end_date
    // So we're looking for registration_end_date that falls on "today", "tomorrow", or "day after tomorrow"
    const twoDaysFromNowStart = new Date(today); 
    // No need to add days here, we want to catch deadlines that are today, tomorrow, or the day after.
    // The Between operator will include today.

    const twoDaysFromNowEnd = new Date(today);
    twoDaysFromNowEnd.setUTCDate(today.getUTCDate() + 2); // Target up to 2 days from now
    twoDaysFromNowEnd.setUTCHours(23, 59, 59, 999); // End of the 2nd day from now

    try {
        // Find events where registration is still open (today is before or on registration_end_date)
        // AND registration_end_date is approaching (e.g., today, tomorrow, or the day after)
        // AND event status is "À venir"
        const upcomingEventsWithApproachingEndDates = await eventRepository.find({
            where: {
                registration_end_date: Between(today, twoDaysFromNowEnd), // registration_end_date is today, tomorrow, or the day after
                registration_start_date: LessThanOrEqual(today), // Registration period has started
                status: Equal("À venir") // Only for events that are still upcoming and open for registration
            }
        });

        if (upcomingEventsWithApproachingEndDates.length === 0) {
            console.log('No events with approaching registration end dates found for today, tomorrow, or the day after.');
            return;
        }

        const allPotentiallyInterestedUsers = await userRepository.find({ where: { id_role: 2 } }); // Example: target 'employee' role

        for (const event of upcomingEventsWithApproachingEndDates) {
            if (!event.registration_end_date) continue; // Should not happen if caught by query, but good check

            const registrationEndDate = new Date(event.registration_end_date);
            registrationEndDate.setUTCHours(0,0,0,0); // Compare date part only

            // Ensure the registration period hasn't already passed today if the time part was earlier
            if (registrationEndDate < today) continue; 

            // Calculate remaining days until registration_end_date
            const diffTime = registrationEndDate.getTime() - today.getTime(); // End date is in future or today
            let daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // If deadline is today, daysRemaining will be 0 or 1 depending on exact time, let's ensure it's at least 0
            if (registrationEndDate.getTime() === today.getTime()) {
                daysRemaining = 0; // Deadline is today
            }


            for (const user of allPotentiallyInterestedUsers) {
                // Check if user is already registered for this event
                const existingInscription = await inscriptionRepository.findOne({
                    where: {
                        user: { id_user: user.id_user },
                        event: { id_event: event.id_event }
                    }
                });

                if (!existingInscription) {
                    let dayString = "jours";
                    let preposition = "dans";
                    if (daysRemaining === 1) {
                        dayString = "jour";
                    } else if (daysRemaining === 0) {
                        dayString = "aujourd'hui";
                        preposition = ""; // No "dans" for "aujourd'hui"
                    }
                    
                    const message = preposition ? 
                        `N'oubliez pas ! La période d'inscription pour "${event.title_event}" se termine ${preposition} ${daysRemaining} ${dayString} (${registrationEndDate.toLocaleDateString('fr-FR', { timeZone: 'UTC' })}).` :
                        `N'oubliez pas ! La période d'inscription pour "${event.title_event}" se termine ${dayString} (${registrationEndDate.toLocaleDateString('fr-FR', { timeZone: 'UTC' })}).`;

                    await createNotification(
                        user.id_user,
                        NotificationType.REGISTRATION_DEADLINE_REMINDER, // You can keep this type or create a new one like REGISTRATION_ENDING_SOON
                        message,
                        event.id_event
                    );
                }
            }
        }
        console.log('Finished sending registration end date reminders.');
    } catch (error) {
        console.error("Error sending registration end date reminders:", error);
    }
};

/**
 * Sends reminders for events starting soon (e.g., tomorrow).
 */
export const sendEventReminders = async (): Promise<void> => {
    console.log('Running scheduled task to send event reminders (for tomorrow)...');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrowStart = new Date(today);
    tomorrowStart.setUTCDate(today.getUTCDate() + 1);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setUTCHours(23, 59, 59, 999);

    try {
        // Find events starting tomorrow
        const eventsStartingTomorrow = await eventRepository.find({
            where: {
                start_date: Between(tomorrowStart, tomorrowEnd),
                status: Equal("À venir") // Or "En cours" if it could start mid-day and still be "À venir" at midnight
            },
            relations: ["inscriptions", "inscriptions.user"] // Eager load for efficiency
        });

        if (eventsStartingTomorrow.length === 0) {
            console.log('No events starting tomorrow found.');
            return;
        }

        for (const event of eventsStartingTomorrow) {
            if (event.inscriptions) {
                for (const reg of event.inscriptions) {
                    if (reg.user && reg.user.id_user) {
                        await createNotification(
                            reg.user.id_user,
                            NotificationType.EVENT_REMINDER,
                            `Rappel : L'événement "${event.title_event}" commence demain !`,
                            event.id_event
                        );
                    }
                }
            }
        }
        console.log('Finished sending event reminders for tomorrow.');
    } catch (error) {
        console.error("Error sending event reminders:", error);
    }
};


/**
 * Initializes and schedules all cron jobs.
 */
export const initScheduledTasks = () => {
    console.log('Initializing scheduled tasks...');

    // Schedule updateEventStatuses to run, e.g., every hour
    // cron.schedule('0 * * * *', () => { // Runs at the start of every hour
    // For testing, run more frequently, e.g., every minute: '* * * * *'
    // For production, once or twice a day might be enough, e.g., '0 1 * * *' (1 AM daily)
    cron.schedule('0 1 * * *', () => { // Runs daily at 1:00 AM UTC
        console.log('Scheduler: Triggering updateEventStatuses...');
        updateEventStatuses();
    });

    // Schedule sendRegistrationDeadlineReminders to run, e.g., once a day
    cron.schedule('0 2 * * *', () => { // Runs daily at 2:00 AM UTC
        console.log('Scheduler: Triggering sendRegistrationDeadlineReminders...');
        sendRegistrationDeadlineReminders();
    });

    // Schedule sendEventReminders to run, e.g., once a day
    cron.schedule('0 3 * * *', () => { // Runs daily at 3:00 AM UTC
        console.log('Scheduler: Triggering sendEventReminders...');
        sendEventReminders();
    });

    console.log('Scheduled tasks initialized.');

    // Optionally, run them once on startup for immediate effect if needed (especially during development)
    // console.log('Running tasks once on startup for development...');
    // updateEventStatuses();
    // sendRegistrationDeadlineReminders();
    // sendEventReminders();
};