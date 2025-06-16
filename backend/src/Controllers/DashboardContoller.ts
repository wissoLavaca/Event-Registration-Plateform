import { Request, Response } from 'express';
import { Event } from '../Models/Event';
import { Inscription } from '../Models/Inscription';
import { User } from '../Models/User';
import { Departement } from '../Models/Departement';
import { AppDataSource } from '../config/db';

export class DashboardController {
    static async getRegistrationsPerEvent(req: Request, res: Response) {
        try {
            const eventRepository = AppDataSource.getRepository(Event);
            const data = await eventRepository.createQueryBuilder("event")
                .leftJoin("event.inscriptions", "inscription")
                .select("event.title_event", "eventName")
                .addSelect("COUNT(inscription.id_inscription)", "registrationcount") // Changed to lowercase
                .groupBy("event.id_event")
                .addGroupBy("event.title_event")
                .orderBy("registrationcount", "DESC") // Changed to lowercase
                .getRawMany();

            res.json(data);
        } catch (error) {
            console.error("Error in getRegistrationsPerEvent:", error);
            res.status(500).json({ message: "Failed to fetch registrations per event" });
        }
    }

    static async getRegistrationsOverTime(req: Request, res: Response) {
        try {
            const inscriptionRepository = AppDataSource.getRepository(Inscription);
            const data = await inscriptionRepository.createQueryBuilder("inscription")
                .select("DATE(inscription.created_at)", "date")
                .addSelect("COUNT(inscription.id_inscription)", "registrationcount") // Changed to lowercase for consistency, though not strictly necessary here as it's not ordered by this
                .groupBy("DATE(inscription.created_at)")
                .orderBy("date", "ASC")
                .getRawMany();

            res.json(data);
        } catch (error) {
            console.error("Error in getRegistrationsOverTime:", error);
            res.status(500).json({ message: "Failed to fetch registrations over time" });
        }
    }

    static async getRegistrationsByDepartment(req: Request, res: Response) {
        try {
            const inscriptionRepository = AppDataSource.getRepository(Inscription);
            const data = await inscriptionRepository.createQueryBuilder("inscription")
                .innerJoin("inscription.user", "user")
                .innerJoin("user.departement", "departement")
                .select("departement.name_departement", "departmentName")
                .addSelect("COUNT(inscription.id_inscription)", "registrationcount") // Changed to lowercase
                .groupBy("departement.id_departement")
                .addGroupBy("departement.name_departement")
                .orderBy("registrationcount", "DESC") // Changed to lowercase
                .getRawMany();

            res.json(data);
        } catch (error) {
            console.error("Error in getRegistrationsByDepartment:", error);
            res.status(500).json({ message: "Failed to fetch registrations by department" });
        }
    }
}