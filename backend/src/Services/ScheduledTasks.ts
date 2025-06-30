import cron from 'node-cron';
import { AppDataSource } from '../config/db';
import { Event } from '../Models/Event';
import { User } from '../Models/User';
import { Inscription } from '../Models/Inscription';
import { createNotification } from '../Controllers/NotificationController'; 
import { NotificationType } from '../Models/Notification';
import { LessThanOrEqual, MoreThan, IsNull, Not, Between, Equal, In } from 'typeorm';

const eventRepository = AppDataSource.getRepository(Event);
const userRepository = AppDataSource.getRepository(User);
const inscriptionRepository = AppDataSource.getRepository(Inscription);


export const updateEventStatuses = async (): Promise<void> => {
    console.log('Running scheduled task to update event statuses...');
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    try {
        const eventsToUpdate = await eventRepository.find({
            where: {
                status: In(['À venir', 'En cours']), 
            },
        });

        for (const event of eventsToUpdate) {
            let newStatus = event.status; // Start with current status



            if (event.status !== 'Annulé') { 
                if (event.registration_start_date && event.registration_end_date) {
                    try {
                        const regStartDate = new Date(event.registration_start_date);
                        regStartDate.setHours(0, 0, 0, 0);

                        const regEndDate = new Date(event.registration_end_date);
                        regEndDate.setHours(0, 0, 0, 0);

                        if (isNaN(regStartDate.getTime()) || isNaN(regEndDate.getTime())) {
                            console.warn(`Event ID ${event.id_event}: Invalid registration dates. Status not changed.`);

                            continue; 
                        }

                        // Logic based on registration dates
                        if (regEndDate < today) {
                          newStatus = 'Terminé'; // Registration period is over
                        } else if (regStartDate <= today && regEndDate >= today) {
                          newStatus = 'En cours'; // Registration is active
                        } else if (regStartDate > today) {
                          newStatus = 'À venir'; // Registration is in the future
                        }


                    } catch (parseError) {
                        console.error(`Event ID ${event.id_event}: Error parsing registration dates. Status not changed.`, parseError);
                        continue; 
                    }
                } else {

                  console.warn(`Event ID ${event.id_event}: Registration dates not set. Status not changed from '${event.status}'.`);

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

export const sendRegistrationDeadlineReminders = async (): Promise<void> => {
    console.log('Running scheduled task to send registration end date reminders...');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Start of today 

    const twoDaysFromNowStart = new Date(today); 


    const twoDaysFromNowEnd = new Date(today);
    twoDaysFromNowEnd.setUTCDate(today.getUTCDate() + 2); 
    twoDaysFromNowEnd.setUTCHours(23, 59, 59, 999);

    try {

        const upcomingEventsWithApproachingEndDates = await eventRepository.find({
            where: {
                registration_end_date: Between(today, twoDaysFromNowEnd), 
                registration_start_date: LessThanOrEqual(today), // Registration period has started
                status: Equal("À venir") 
            }
        });

        if (upcomingEventsWithApproachingEndDates.length === 0) {
            console.log('No events with approaching registration end dates found for today, tomorrow, or the day after.');
            return;
        }

        const allPotentiallyInterestedUsers = await userRepository.find({ where: { id_role: 2 } }); 

        for (const event of upcomingEventsWithApproachingEndDates) {
            if (!event.registration_end_date) continue; 

            const registrationEndDate = new Date(event.registration_end_date);
            registrationEndDate.setUTCHours(0,0,0,0);

            if (registrationEndDate < today) continue; 

            // Calculate remaining days until registration_end_date
            const diffTime = registrationEndDate.getTime() - today.getTime(); 
            let daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (registrationEndDate.getTime() === today.getTime()) {
                daysRemaining = 0; // Deadline is today
            }


            for (const user of allPotentiallyInterestedUsers) {
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
                        preposition = ""; 
                    }
                    
                    const message = preposition ? 
                        `N'oubliez pas ! La période d'inscription pour "${event.title_event}" se termine ${preposition} ${daysRemaining} ${dayString} (${registrationEndDate.toLocaleDateString('fr-FR', { timeZone: 'UTC' })}).` :
                        `N'oubliez pas ! La période d'inscription pour "${event.title_event}" se termine ${dayString} (${registrationEndDate.toLocaleDateString('fr-FR', { timeZone: 'UTC' })}).`;

                    await createNotification(
                        user.id_user,
                        NotificationType.REGISTRATION_DEADLINE_REMINDER, 
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
                status: Equal("À venir")
            },
            relations: ["inscriptions", "inscriptions.user"] 
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


export const initScheduledTasks = () => {
    console.log('Initializing scheduled tasks...');

    cron.schedule('0 1 * * *', () => { // Runs daily at 1:00 AM 
        console.log('Scheduler: Triggering updateEventStatuses...');
        updateEventStatuses();
    });

    // Schedule sendRegistrationDeadlineReminders to run
    cron.schedule('0 2 * * *', () => { // Runs daily at 2:00 AM 
        console.log('Scheduler: Triggering sendRegistrationDeadlineReminders...');
        sendRegistrationDeadlineReminders();
    });

    cron.schedule('0 3 * * *', () => { // Runs daily at 3:00 AM
        console.log('Scheduler: Triggering sendEventReminders...');
        sendEventReminders();
    });

    console.log('Scheduled tasks initialized.');
