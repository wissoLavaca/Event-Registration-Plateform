import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/db';
import { User } from '../Models/User';
import { Role } from '../Models/Role';
import { Departement } from '../Models/Departement';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';


const userRepository = AppDataSource.getRepository(User);
const roleRepository = AppDataSource.getRepository(Role);
const departementRepository = AppDataSource.getRepository(Departement);


interface AuthenticatedRequest extends Request {
    user?: {
        id_user: number; // Or however your user ID is stored in the token
        // other user properties from token...
    };
     file?: Express.Multer.File;
}

export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // TODO: Add authorization (admin only)
    try {
        const users = await userRepository.find({
            where: { is_deleted: false }, // Only fetch non-deleted users
            relations: ['role', 'departement']
        });
        res.status(200).json(users);
    } catch (error: any) {
        console.error("Error fetching users:", error);
        // res.status(500).json({ message: "Error fetching users", error: error.message });
        next(error);
    }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // TODO: Add authorization (admin or self)
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ message: "Invalid user ID format" });
            return;
        }
        // Fetch only if not deleted.
        // If you need to fetch a soft-deleted user (e.g., for an admin "recycle bin" view),
        // you might have a separate endpoint or a query parameter to allow fetching deleted ones.
        const user = await userRepository.findOne({
            where: { id_user: id, is_deleted: false },
            relations: ['role', 'departement']
        });
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: "User not found or has been deleted" });
        }
    } catch (error: any) {
        console.error("Error fetching user by ID:", error);
        // res.status(500).json({ message: "Error fetching user", error: error.message });
        next(error);
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const {
            first_name,
            last_name,
            birth_date,
            username,
            password, 
            registration_number,
            role: role_name,         
            departement: departement_name 
        } = req.body;

        // --- Basic Validation ---
        if (!username || !password || !first_name || !last_name || !role_name || !departement_name) {
            return res.status(400).json({ message: "Missing required fields: username, password, first_name, last_name, role, departement are required." });
        }

        // --- Check if user already exists ---
        const existingUser = await userRepository.findOneBy({ username });
        if (existingUser) {
            return res.status(409).json({ message: "Username already exists" });
        }

        // --- Find Role Entity ---
        const roleEntity = await roleRepository.findOneBy({ name_role: role_name });
        if (!roleEntity) {
            return res.status(400).json({ message: `Role '${role_name}' not found.` });
        }

        // --- Find Departement Entity ---
        const departementEntity = await departementRepository.findOneBy({ name_departement: departement_name });
        if (!departementEntity) {
            return res.status(400).json({ message: `Departement '${departement_name}' not found.` });
        }

        // --- Hash Password ---
        const hashedPassword = await bcrypt.hash(password, 10); 

        // --- Create New User ---
        const newUser = userRepository.create({
            first_name,
            last_name,
            birth_date: birth_date || null, 
            username,
            password: hashedPassword,
            registration_number: registration_number || null, 
            role: roleEntity,           
            departement: departementEntity,  
            profile_picture_url: null 
        });

        await userRepository.save(newUser);

        // --- Prepare response (exclude password) ---
        const userResponse = {
            id_user: newUser.id_user,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            username: newUser.username,
            registration_number: newUser.registration_number,
            birth_date: newUser.birth_date,
            role: { // Ensure this structure matches frontend expectations
                id_role: roleEntity.id_role,
                name_role: roleEntity.name_role
            },
            departement: { // Ensure this structure matches frontend expectations
                id_departement: departementEntity.id_departement,
                name_departement: departementEntity.name_departement
            }
        };

        res.status(201).json(userResponse);

    } catch (error: any) {
        console.error("Error creating user:", error); // Log the detailed error on the server
        res.status(500).json({ message: "Error creating user", error: error.message });
    }
};

export const changeCurrentUserPassword = async (req: AuthenticatedRequest, res: Response) => {
    // Ensure user is authenticated and id_user is available from token
    if (!req.user || !req.user.id_user) {
        return res.status(401).json({ message: "Authentication required." });
    }

    const userId = req.user.id_user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required." });
    }

    if (newPassword.length < 6) { // Consistent with frontend validation
        return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }

    try {
        const user = await userRepository.findOneBy({ id_user: userId });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect current password." });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await userRepository.save(user);

        res.status(200).json({ message: "Password updated successfully." });

    } catch (error: any) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Error changing password", error: error.message });
    }
};

export const uploadProfilePicture = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user.id_user) {
        return res.status(401).json({ message: "Authentication required." });
    }
    if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded." });
    }

    const userId = req.user.id_user;

    try {
        const user = await userRepository.findOneBy({ id_user: userId });
        if (!user) {
            // This case should ideally not happen if the token is valid and user exists
            return res.status(404).json({ message: "User not found." });
        }

        // Construct the URL to the uploaded file.
        // This assumes your multer saves files in a way that they are accessible via '/uploads/profile_pictures/'
        // and your app.ts serves static files from this path.
        // req.file.filename is provided by multer's diskStorage.
        const profilePictureUrl = `/uploads/profile_pictures/${req.file.filename}`;
        // For a full URL (optional, frontend can also construct this if needed):
        // const fullProfilePictureUrl = `${req.protocol}://${req.get('host')}${profilePictureUrl}`;

        user.profile_picture_url = profilePictureUrl; // Make sure your User entity has this field
        await userRepository.save(user);

        res.status(200).json({
            message: "Profile picture updated successfully.",
            newProfilePictureUrl: profilePictureUrl // Send the relative URL back
        });

    } catch (error: any) {
        console.error("Error uploading profile picture:", error);
        // Attempt to delete the uploaded file if it exists and an error occurred
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) {
                    console.error("Error deleting orphaned file:", unlinkErr, req.file?.path);
                } else {
                    console.log("Orphaned file deleted successfully:", req.file?.path);
                }
            });
        }
        res.status(500).json({ message: "Error uploading profile picture", error: error.message });
    }
};

export const deleteProfilePicture = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user.id_user) {
        return res.status(401).json({ message: "Authentication required." });
    }

    const userId = req.user.id_user;

    try {
        const user = await userRepository.findOneBy({ id_user: userId });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Remove the file from disk if it exists
        if (user.profile_picture_url) {
            const filePath = path.join(__dirname, '../../public', user.profile_picture_url);
            fs.unlink(filePath, (err) => {
                // Log error but don't fail if file doesn't exist
                if (err && err.code !== 'ENOENT') {
                    console.error("Error deleting profile picture file:", err);
                }
            });
        }

        // Remove the profile picture URL from the user
        user.profile_picture_url = null;
        await userRepository.save(user);

        res.status(200).json({ message: "Profile picture deleted successfully." });
    } catch (error: any) {
        console.error("Error deleting profile picture:", error);
        res.status(500).json({ message: "Error deleting profile picture", error: error.message });
    }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // TODO: Add authorization (admin or self)
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ message: "Invalid user ID format" });
            return;
        }

        // Find non-deleted user to update
        const userToUpdate = await userRepository.findOne({ where: {id_user: id, is_deleted: false }});
        if (!userToUpdate) {
            res.status(404).json({ message: "User not found or has been deleted" });
            return;
        }

        const {
            first_name,
            last_name,
            birth_date,
            username,
            password, // New password, if provided
            registration_number,
            role: role_name,
            departement: departement_name
        } = req.body;

        // Update fields if they are provided
        if (first_name) userToUpdate.first_name = first_name;
        if (last_name) userToUpdate.last_name = last_name;
        if (birth_date) userToUpdate.birth_date = birth_date;
        if (registration_number) userToUpdate.registration_number = registration_number;

        // Handle username update (check for uniqueness if changed)
        if (username && username !== userToUpdate.username) {
            const existingUser = await userRepository.findOneBy({ username });
            if (existingUser) {
                return;
            }
            userToUpdate.username = username;
        }

        // Handle password update
        if (password) {
            userToUpdate.password = await bcrypt.hash(password, 10);
        }

        // Handle role update
        if (role_name) {
            const roleEntity = await roleRepository.findOneBy({ name_role: role_name });
            if (!roleEntity) {
                res.status(400).json({ message: `Role '${role_name}' not found.` });
                return; // Corrected: Exit after sending response
            }
            userToUpdate.role = roleEntity;
        }

        // Handle departement update
        if (departement_name) {
            const departementEntity = await departementRepository.findOneBy({ name_departement: departement_name });
            if (!departementEntity) {
                res.status(400).json({ message: `Departement '${departement_name}' not found.` });
                return; // Corrected: Exit after sending response
            }
            userToUpdate.departement = departementEntity;
        }

        await userRepository.save(userToUpdate);

        // Re-fetch for consistent response
        const updatedUserWithRelations = await userRepository.findOne({
            where: { id_user: id, is_deleted: false },
            relations: ['role', 'departement']
        });
        
        if (!updatedUserWithRelations) {
             res.status(404).json({ message: "Updated user could not be refetched or was deleted during update."});
             return; // Corrected: Exit after sending response
        }

        // Prepare response (exclude password)
        const userResponse = {
            id_user: updatedUserWithRelations.id_user,
            first_name: updatedUserWithRelations.first_name,
            last_name: updatedUserWithRelations.last_name,
            username: updatedUserWithRelations.username,
            // ... include other fields like email, role.name_role, departement.name_departement
            role: updatedUserWithRelations.role ? updatedUserWithRelations.role.name_role : null,
            departement: updatedUserWithRelations.departement ? updatedUserWithRelations.departement.name_departement : null,
            // Ensure all relevant fields are included
        };
        
        res.status(200).json(userResponse);
        // No 'return' needed here if it's the last statement in the try block,
        // or 'return;' if you want to be explicit.

    } catch (error: any) {
        console.error("Error updating user:", error);
        // res.status(500).json({ message: "Error updating user", error: error.message });
        next(error);
    }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const actingAdminId = req.user?.id_user; // Get admin ID from authenticated request

        if (isNaN(id)) {
            res.status(400).json({ message: "Invalid user ID format" });
            return;
        }
        if (!actingAdminId) {
            // This should ideally be caught by authMiddleware if the route is protected
            res.status(401).json({ message: "Admin authentication required to delete user." });
            return;
        }

        const user = await userRepository.findOneBy({ id_user: id, is_deleted: false }); // Ensure we only "delete" non-deleted users

        if (!user) {
            res.status(404).json({ message: "User not found or already deleted" });
            return;
        }

        // Soft delete logic
        user.is_deleted = true;
        user.deleted_at = new Date();
        user.deleted_by_user_id = actingAdminId;

        await userRepository.save(user);

        res.status(200).json({ message: "User soft-deleted successfully" });
    } catch (error: any) {
        console.error("Error soft-deleting user:", error);
        // res.status(500).json({ message: "Error soft-deleting user", error: error.message });
        next(error); // Pass to global error handler
    }
};

// START - NEW BULK USER CREATION FUNCTION
export const createBulkUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const usersData: any[] = req.body; // Array of user objects from frontend

        if (!Array.isArray(usersData) || usersData.length === 0) {
            // Send response and return to prevent further execution
            res.status(400).json({ message: "Request body must be a non-empty array of users." });
            return; 
        }

        const results = [];
        let successfulCreations = 0;
        let failedCreations = 0;

        for (const userData of usersData) {
            const {
                first_name,
                last_name,
                birth_date,
                username,
                password,
                registration_number,
                role_name,      // Expecting role_name from frontend
                departement_name // Expecting departement_name from frontend
            } = userData;

            // --- Basic Validation for each user ---
            if (!username || !password || !first_name || !last_name || !role_name || !departement_name) {
                results.push({ username: username || 'N/A', status: 'failed', reason: "Missing required fields." });
                failedCreations++;
                continue; // Skip to next user
            }

            // Inner try-catch for individual user creation to allow the loop to continue
            try {
                // --- Check if user already exists ---
                const existingUser = await userRepository.findOneBy({ username });
                if (existingUser) {
                    results.push({ username, status: 'failed', reason: "Username already exists." });
                    failedCreations++;
                    continue;
                }

                // --- Find Role Entity ---
                const roleEntity = await roleRepository.findOneBy({ name_role: role_name });
                if (!roleEntity) {
                    results.push({ username, status: 'failed', reason: `Role '${role_name}' not found.` });
                    failedCreations++;
                    continue;
                }

                // --- Find Departement Entity ---
                const departementEntity = await departementRepository.findOneBy({ name_departement: departement_name });
                if (!departementEntity) {
                    results.push({ username, status: 'failed', reason: `Departement '${departement_name}' not found.` });
                    failedCreations++;
                    continue;
                }

                // --- Hash Password ---
                const hashedPassword = await bcrypt.hash(password, 10);

                // --- Create New User ---
                const newUser = userRepository.create({
                    first_name,
                    last_name,
                    birth_date: birth_date || null,
                    username,
                    password: hashedPassword,
                    registration_number: registration_number || null,
                    role: roleEntity,
                    departement: departementEntity,
                    profile_picture_url: null
                });

                await userRepository.save(newUser);
                results.push({
                    username,
                    status: 'success',
                    id_user: newUser.id_user, // Send back the new user ID
                });
                successfulCreations++;

            } catch (individualError: any) { // Catch errors for individual user creation
                console.error(`Error creating user ${username} in bulk:`, individualError);
                results.push({ username, status: 'failed', reason: `Server error during creation: ${individualError.message}` });
                failedCreations++;
            }
        }

        res.status(201).json({
            message: `Bulk user processing complete. ${successfulCreations} users created, ${failedCreations} failed.`,
            results
        });
        // No explicit return here as res.json() sends the response and ends the function.
        // The function implicitly returns Promise<void>.

    } catch (error) { // Catch errors that occur outside the loop (e.g., req.body parsing issues if not handled by middleware)
        next(error); // Pass error to the Express error handling middleware
    }
};

export const getUsersCount = async (req: Request, res: Response, next: NextFunction) => { // Added next
    try {
        const count = await userRepository.count({ where: { is_deleted: false } });
        res.status(200).json({ count });
    } catch (error: any) {
        console.error("Error fetching user count:", error);
        // res.status(500).json({ message: "Error fetching user count", error: error.message });
        next(error); // Added for consistency
    }
};