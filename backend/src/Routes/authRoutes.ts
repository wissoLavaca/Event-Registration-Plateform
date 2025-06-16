import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import * as AuthController from '../Controllers/AuthController';
import { authMiddleware } from '../Middleware/authMiddleware';
import { RegisterRequest, LoginRequest, AuthenticatedRequest } from '../types/auth.types';

const router = Router();

// Handler wrapper to ensure Promise<void> return type
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
};

// Define route handlers
const registerHandler = asyncHandler(async (req: Request, res: Response) => {
    await AuthController.registerUser(req as RegisterRequest, res);
});

const loginHandler = asyncHandler(async (req: Request, res: Response) => {
    await AuthController.loginUser(req as LoginRequest, res);
});

const getMeHandler = asyncHandler(async (req: Request, res: Response) => {
    await AuthController.getMe(req as AuthenticatedRequest, res);
});

// Route wrapped handlers
router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.get('/me', authMiddleware, getMeHandler);

export default router;