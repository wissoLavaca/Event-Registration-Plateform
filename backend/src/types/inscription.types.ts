import { Request } from 'express';
import { User } from '../Models/User';

export interface InscriptionRequest extends Request {
    user: User;
    params: {
        id?: string;
    };
}