import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Departement, DepartementName } from '../Models/Departement';

const departementRepository = AppDataSource.getRepository(Departement);

export const getAllDepartements = async (req: Request, res: Response) => {
    try {
        const departements = await departementRepository.find();
        res.status(200).json(departements);
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching departements", error: error.message });
    }
};

export const getDepartementById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const departement = await departementRepository.findOneBy({ id_departement: id });
        if (departement) {
            res.status(200).json(departement);
        } else {
            res.status(404).json({ message: "Departement not found" });
        }
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching departement", error: error.message });
    }
};


export const createDepartement = async (req: Request, res: Response) => {
    try {
        const { name_departement } = req.body as { name_departement: DepartementName };
         if (!name_departement || !['DDD', 'DSSI', 'DRH', 'DFO'].includes(name_departement)) {
             return res.status(400).json({ message: "Invalid departement name." });
        }
        const newDepartement = departementRepository.create({ name_departement });
        await departementRepository.save(newDepartement);
        res.status(201).json(newDepartement);
    } catch (error: any) {
         if ((error as any).code === '23505') { 
            return res.status(409).json({ message: "Departement name already exists." });
        }
        res.status(500).json({ message: "Error creating departement", error: error.message });
    }
};
