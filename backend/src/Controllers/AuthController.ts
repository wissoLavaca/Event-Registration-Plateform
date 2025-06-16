import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../Models/User';
import { Role } from '../Models/Role'; 
import { Departement } from '../Models/Departement'; 
import { RegisterRequest, AuthenticatedRequest } from '../types/auth.types';

const userRepository = AppDataSource.getRepository(User);
const roleRepository = AppDataSource.getRepository(Role); 
const departementRepository = AppDataSource.getRepository(Departement); 

export const registerUser = async (req: RegisterRequest, res: Response) => {
    try {
        const { first_name, last_name, birth_date, username, password, registration_number, id_role, id_departement } = req.body;

        // TODO: Check if username or registration_number already exists
        const existingUser = await userRepository.findOne({
            where: [
                { username },
                { registration_number }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                message: existingUser.username === username ? 
                    "Username already exists" : 
                    "Registration number already exists"
            });
        }

        // TODO: Hash the password using bcryptjs
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        const newUser = userRepository.create({
            first_name,
            last_name,
            birth_date,
            username,
            password: hashedPassword,
            registration_number,
            id_role,
            id_departement
        });

        await userRepository.save(newUser);
        // TODO: Optionally generate a JWT token upon successful registration

        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({ message: "User registered successfully", userId: newUser.id_user });
    } catch (error: any) {
        console.error("Registration error:", error);
        // TODO: Handle specific errors like unique constraint violations (e.g., username taken)
        res.status(500).json({ message: "Error registering user", error: error.message });
    }
};

export const loginUser = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        // Input validation
        if (!username || !password) {
            return res.status(400).json({ 
                message: "Username and password are required" 
            });
        }

        // Find user
        const user = await userRepository.findOne({ 
            where: { username }
        });

        if (!user) {
            return res.status(401).json({ 
                message: "Invalid credentials" 
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: "Invalid credentials" 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id_user, 
                roleId: user.id_role,
                username: user.username,
                profilePictureUrl: user.profile_picture_url
            },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '7d' }
        );

        res.status(200).json({ 
            message: "Login successful",
            token,
            userId: user.id_user,
            roleId: user.id_role,
            username: user.username,
            profilePictureUrl: user.profile_picture_url
        });
    } catch (error: any) {
        console.error("Login error:", error);
        res.status(500).json({ 
            message: "Error logging in", 
            error: error.message 
        });
    }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ 
                message: "User not authenticated" 
            });
        }

        // Return user data with correct property names
        res.status(200).json({ 
            id: user.id_user,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            roleId: user.id_role,
            departementId: user.id_departement
        });
    } catch (error: any) {
        console.error("GetMe error:", error);
        res.status(500).json({ 
            message: "Error fetching user profile", 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
};