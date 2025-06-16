import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/db';
import { User } from '../Models/User'; 
import { AuthenticatedRequest } from '../types/auth.types'; 

const userRepository = AppDataSource.getRepository(User);


export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized: No token provided or malformed token' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

        const user = await userRepository.findOne({ where: { id_user: decoded.userId }, relations: ['role'] });

        if (!user) {
            res.status(401).json({ message: 'Unauthorized: User not found' });
            return;
        }

        req.user = {
           id_user: user.id_user,
            id_role: user.id_role,
            username: user.username ?? '', // Assuming user.username exists on your User entity
            profile_picture_url: user.profile_picture_url ?? '', // Or ?? null if your UserType allows string | null
            first_name: user.first_name ?? '',     // Assuming user.first_name exists
            last_name: user.last_name ?? '',       // Assuming user.last_name exists
            id_departement: user.id_departement,   // Assuming user.id_departement exists and is a number
        };
        next();


    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ message: 'Unauthorized: Token expired' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ message: 'Unauthorized: Invalid token' });
            return;
        }
        console.error("Auth middleware error:", error);
        res.status(401).json({ message: 'Unauthorized: Token verification failed' });
        return;
    }
};