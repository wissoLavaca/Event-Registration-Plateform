import { Request } from 'express';
import { User } from '../Models/User';

export type RoleName = 'admin' | 'employee';

export interface RoleRequest extends Request {
    user: User;  // From auth middleware
    params: {
        id?: string;
    };
    body: {
        name_role?: string;
    };
}

export interface Role {
    id_role: number;
    name_role: RoleName;
}