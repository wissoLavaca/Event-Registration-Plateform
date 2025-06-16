import { Request } from 'express';
import { User } from '../Models/User';

export interface UserRequest extends Request {
    user: User;  // From auth middleware
    params: {
        id?: string;
    };
    body: {
        first_name?: string;
        last_name?: string;
        birth_date?: Date;
        username?: string;
        password?: string;
        registration_number?: string;
        id_role?: number;
        id_departement?: number;
    };
}