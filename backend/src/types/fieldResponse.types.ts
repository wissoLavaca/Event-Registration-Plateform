import { Request } from 'express';
import { User } from '../Models/User';

export interface FieldResponseRequest extends Request {
    user: User;
    params: {
        inscriptionId?: string;
        eventId?: string;
    };
}