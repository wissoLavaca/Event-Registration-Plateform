import { Request } from 'express';
import { User } from '../Models/User';

// Register request type
export interface RegisterRequest extends Request {
    body: {
        first_name: string;
        last_name: string;
        birth_date: Date;
        username: string;
        password: string;
        registration_number: string;
        profile_picture_url?: string;
        id_role: number;
        id_departement: number;
    }
}

// Login request type
export interface LoginRequest extends Request {
    body: {
        username: string;
        password: string;
    }
}

// Base authenticated request interface
export interface AuthenticatedRequest extends Request {
    user?: {
        id_user: number;
        id_role: number; 
        username: string;
        profile_picture_url: string | null;
        first_name: string;
        last_name: string;
        id_departement: number;
        
    };
}

export interface RoleRequest extends Request {
    user: User;  // From auth middleware
    params: {
        id?: string;
    };
    body: {
        name_role?: string;
    };
}