import { Router, Request, Response, NextFunction } from 'express';
import * as UserController from '../Controllers/UserController';
import { authMiddleware } from '../Middleware/authMiddleware';
import { authorizeRole } from '../Middleware/authorizeMiddleware';
import { UserRequest } from '../types/user.types'; // Assuming this is your custom request type
import multer from 'multer'; // Corrected import name
import path from 'path';
import fs from 'fs';

const router = Router();

const profilePictureStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../public/uploads/profile_pictures');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        const err = new Error('Seuls les fichiers image sont autorisés !') as any;
        err.status = 400;
        cb(err, false);
    }
};

const upload = multer({
    storage: profilePictureStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: imageFileFilter
});

// Handler functions with proper error handling (assuming UserRequest is compatible with AuthenticatedRequest)
const getAllUsersHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.getAllUsers(req as UserRequest, res, next);
    } catch (error) {
        next(error);
    }
};

const getUserByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.getUserById(req as UserRequest, res, next );
    } catch (error) {
        next(error);
    }
};

const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.createUser(req as UserRequest, res);
    } catch (error) {
        next(error);
    }
};

const updateUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.updateUser(req as UserRequest, res, next);
    } catch (error) {
        next(error);
    }
};

const deleteUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.deleteUser(req as UserRequest, res, next);
    } catch (error) {
        next(error);
    }
};

const changeCurrentUserPasswordHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.changeCurrentUserPassword(req as UserRequest, res);
    } catch (error) {
        next(error);
    }
};

const uploadProfilePictureHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.uploadProfilePicture(req as UserRequest, res);
    } catch (error) {
        next(error);
    }
};

const deleteProfilePictureHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.deleteProfilePicture(req as UserRequest, res);
    } catch (error) {
        next(error);
    }
};

// --- Define all routes first ---

// Public routes (if any) would go here, before router.use(authMiddleware)

// Apply authentication middleware to all subsequent routes in this router
router.use(authMiddleware);

// Authenticated routes
router.get('/count', authorizeRole(['Admin']), UserController.getUsersCount); // authMiddleware is already applied
router.put('/change-password', changeCurrentUserPasswordHandler); // authMiddleware is already applied
router.post('/profile-picture', upload.single('profilePicture'), uploadProfilePictureHandler); // authMiddleware is already applied
router.delete('/profile-picture', deleteProfilePictureHandler); // authMiddleware is already applied

router.get('/', authorizeRole(['Admin']), getAllUsersHandler); // authMiddleware is already applied
router.get('/:id', getUserByIdHandler); // authMiddleware is already applied, consider adding authorizeRole if needed
router.post('/', authorizeRole(['Admin']), createUserHandler); // authMiddleware is already applied

router.post('/bulk', authorizeRole(['Admin']), UserController.createBulkUsers); // authMiddleware is already applied

router.put('/:id', authorizeRole(['Admin']), updateUserHandler); // authMiddleware is already applied (ensure this is the intended behavior for all users or just admin)
router.delete('/:id', authorizeRole(['Admin']), deleteUserHandler); // authMiddleware is already applied


export default router;