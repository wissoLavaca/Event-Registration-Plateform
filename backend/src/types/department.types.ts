import { Request } from 'express';
import { User } from '../Models/User';

export interface DepartmentRequest extends Request {
    user: User;  // From auth middleware
    params: {
        id?: string;
    };
}