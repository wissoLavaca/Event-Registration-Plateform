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
        id_user: number; 
    };
     file?: Express.Multer.File;
}

export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const users = await userRepository.find({
            where: { is_deleted: false }, 
            relations: ['role', 'departement']
        });
        res.status(200).json(users);
    } catch (error: any) {
        console.error("Error fetching users:", error);
        next(error);
    }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ message: "Invalid user ID format" });
            return;
        }

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
        next(error);
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const actingUserId = (req as AuthenticatedRequest).user?.id_user;
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

        // Validation 
        if (!username || !password || !first_name || !last_name || !role_name || !departement_name) {
            return res.status(400).json({ message: "Missing required fields: username, password, first_name, last_name, role, departement are required." });
        }

        //  Check if user already exists 
        const existingUser = await userRepository.findOneBy({ username });
        if (existingUser) {
            return res.status(409).json({ message: "Username already exists" });
        }

        // Find Role Entity 
        const roleEntity = await roleRepository.findOneBy({ name_role: role_name });
        if (!roleEntity) {
            return res.status(400).json({ message: `Role '${role_name}' not found.` });
        }

        // Find Departement Entity 
        const departementEntity = await departementRepository.findOneBy({ name_departement: departement_name });
        if (!departementEntity) {
            return res.status(400).json({ message: `Departement '${departement_name}' not found.` });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10); 

        // Create New User
        const newUser = userRepository.create({
            first_name,
            last_name,
            birth_date: birth_date || null, 
            username,
            password: hashedPassword,
            registration_number: registration_number || null, 
            role: roleEntity,           
            departement: departementEntity,  
            profile_picture_url: null,
            created_by_user_id: actingUserId || null
        });

        await userRepository.save(newUser);

        const userResponse = {
            id_user: newUser.id_user,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            username: newUser.username,
            registration_number: newUser.registration_number,
            birth_date: newUser.birth_date,
            role: {
                id_role: roleEntity.id_role,
                name_role: roleEntity.name_role
            },
            departement: { 
                id_departement: departementEntity.id_departement,
                name_departement: departementEntity.name_departement
            }
        };

        res.status(201).json(userResponse);

    } catch (error: any) {
        console.error("Error creating user:", error); 
        res.status(500).json({ message: "Error creating user", error: error.message });
    }
};

export const changeCurrentUserPassword = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.user.id_user) {
        return res.status(401).json({ message: "Authentication required." });
    }

    const userId = req.user.id_user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required." });
    }

    if (newPassword.length < 6) { 
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
            return res.status(404).json({ message: "User not found." });
        }


        const profilePictureUrl = `/uploads/profile_pictures/${req.file.filename}`;
      

        user.profile_picture_url = profilePictureUrl; 
        await userRepository.save(user);

        res.status(200).json({
            message: "Profile picture updated successfully.",
            newProfilePictureUrl: profilePictureUrl 
        });

    } catch (error: any) {
        console.error("Error uploading profile picture:", error);
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
        const actingUserId = req.user?.id_user; 

        if (isNaN(id)) {
            res.status(400).json({ message: "Invalid user ID format" });
            return;
        }

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
            password, 
            registration_number,
            role: role_name,
            departement: departement_name
        } = req.body;

        if (first_name) userToUpdate.first_name = first_name;
        if (last_name) userToUpdate.last_name = last_name;
        if (birth_date) userToUpdate.birth_date = birth_date;
        if (registration_number) userToUpdate.registration_number = registration_number;

        if (username && username !== userToUpdate.username) {
            const existingUser = await userRepository.findOneBy({ username });
            if (existingUser) {
                return;
            }
            userToUpdate.username = username;
        }

        if (password) {
            userToUpdate.password = await bcrypt.hash(password, 10);
        }


        if (role_name) {
            const roleEntity = await roleRepository.findOneBy({ name_role: role_name });
            if (!roleEntity) {
                res.status(400).json({ message: `Role '${role_name}' not found.` });
                return; 
            }
            userToUpdate.role = roleEntity;
        }

        if (departement_name) {
            const departementEntity = await departementRepository.findOneBy({ name_departement: departement_name });
            if (!departementEntity) {
                res.status(400).json({ message: `Departement '${departement_name}' not found.` });
                return; 
            }
            userToUpdate.departement = departementEntity;
        }

        userToUpdate.updated_at = new Date();
        userToUpdate.updated_by_user_id = actingUserId || null;

        await userRepository.save(userToUpdate);

        const updatedUserWithRelations = await userRepository.findOne({
            where: { id_user: id, is_deleted: false },
            relations: ['role', 'departement']
        });
        
        if (!updatedUserWithRelations) {
             res.status(404).json({ message: "Updated user could not be refetched or was deleted during update."});
             return; 
        }

        const userResponse = {
            id_user: updatedUserWithRelations.id_user,
            first_name: updatedUserWithRelations.first_name,
            last_name: updatedUserWithRelations.last_name,
            username: updatedUserWithRelations.username,
            registration_number: updatedUserWithRelations.registration_number,
            birth_date: updatedUserWithRelations.birth_date,
            profile_picture_url: updatedUserWithRelations.profile_picture_url,
            role: updatedUserWithRelations.role,
            departement: updatedUserWithRelations.departement,
        };
        
        res.status(200).json(userResponse);


    } catch (error: any) {
        console.error("Error updating user:", error);
        next(error);
    }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const actingAdminId = req.user?.id_user; 

        if (isNaN(id)) {
            res.status(400).json({ message: "Invalid user ID format" });
            return;
        }
        if (!actingAdminId) {
            res.status(401).json({ message: "Admin authentication required to delete user." });
            return;
        }

        const user = await userRepository.findOneBy({ id_user: id, is_deleted: false }); // Ensure we only "delete" non-deleted users

        if (!user) {
            res.status(404).json({ message: "User not found or already deleted" });
            return;
        }

        user.is_deleted = true;
        user.deleted_at = new Date();
        user.deleted_by_user_id = actingAdminId;

        await userRepository.save(user);

        res.status(200).json({ message: "User soft-deleted successfully" });
    } catch (error: any) {
        console.error("Error soft-deleting user:", error);
        next(error); 
    }
};

export const createBulkUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const actingUserId = (req as AuthenticatedRequest).user?.id_user;
        const usersData: any[] = req.body;

        if (!Array.isArray(usersData) || usersData.length === 0) {
            res.status(400).json({ message: "Request body must be a non-empty array of users." });
            return;
        }

        const results = [];
        let created = 0;
        let updated = 0;
        let failed = 0;

        for (const userData of usersData) {
            const {
                first_name,
                last_name,
                birth_date,
                username,
                password,
                registration_number,
                role_name,
                departement_name
            } = userData;

            if (!registration_number || !first_name || !last_name || !role_name || !departement_name) {
                results.push({ registration_number: registration_number || 'N/A', status: 'failed', reason: "Missing required fields." });
                failed++;
                continue;
            }

            try {
                const roleEntity = await roleRepository.findOneBy({ name_role: role_name });
                if (!roleEntity) {
                    results.push({ registration_number, status: 'failed', reason: `Role '${role_name}' not found.` });
                    failed++;
                    continue;
                }
                const departementEntity = await departementRepository.findOneBy({ name_departement: departement_name });
                if (!departementEntity) {
                    results.push({ registration_number, status: 'failed', reason: `Departement '${departement_name}' not found.` });
                    failed++;
                    continue;
                }

                let user = await userRepository.findOne({ where: { registration_number } });

                if (user) {
                    //  UPDATE EXISTING USER 
                    user.first_name = first_name;
                    user.last_name = last_name;
                    user.birth_date = birth_date || null;
                    user.username = username || user.username;
                    user.role = roleEntity;
                    user.departement = departementEntity;
                    if (password) {
                        user.password = await bcrypt.hash(password, 10);
                    }

                    user.updated_at = new Date();
                    user.updated_by_user_id = actingUserId || null;
                    
                    await userRepository.save(user);
                    results.push({ registration_number, status: 'updated', id_user: user.id_user });
                    updated++;
                } else {
                    // CREATE NEW USER 
                    if (!username || !password) {
                        results.push({ registration_number, status: 'failed', reason: "Missing username or password for new user." });
                        failed++;
                        continue;
                    }
                    const hashedPassword = await bcrypt.hash(password, 10);
                    const newUser = userRepository.create({
                        first_name,
                        last_name,
                        birth_date: birth_date || null,
                        username,
                        password: hashedPassword,
                        registration_number,
                        role: roleEntity,
                        departement: departementEntity,
                        profile_picture_url: null,
                        created_by_user_id: actingUserId || null
                    });
                    await userRepository.save(newUser);
                    results.push({ registration_number, status: 'created', id_user: newUser.id_user });
                    created++;
                }
            } catch (individualError: any) {
                console.error(`Error processing user with registration_number ${registration_number}:`, individualError);
                results.push({ registration_number, status: 'failed', reason: `Server error: ${individualError.message}` });
                failed++;
            }
        }

        res.status(201).json({
            message: `Traitement terminé : ${created} créé(s), ${updated} mis à jour, ${failed} échec(s).`,
            results
        });

    } catch (error) {
        next(error);
    }
};

export const getUsersCount = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        const count = await userRepository.count({ where: { is_deleted: false } });
        res.status(200).json({ count });
    } catch (error: any) {
        console.error("Error fetching user count:", error);
        next(error); 
    }
};
