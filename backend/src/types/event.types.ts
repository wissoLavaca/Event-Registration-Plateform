import { Request } from 'express';
import { User } from '../Models/User';


export interface EventRequest extends Request {
    user: User;
    params: {
        id?: string;
        eventId?: string;
    };
    body: {
        title_event: string;
        description_event?: string;
        start_date?: Date;
        end_date?: Date;
        status?: string;
    };
}
