import { Request } from 'express';
import { User } from '../Models/User';

export interface FormFieldTypeRequest extends Request {
    user?: User;
}