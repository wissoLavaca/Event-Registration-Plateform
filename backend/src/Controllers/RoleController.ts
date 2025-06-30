import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Role, RoleName } from '../Models/Role';

const roleRepository = AppDataSource.getRepository(Role);

export const getAllRoles = async (req: Request, res: Response) => {
    try {
        const roles = await roleRepository.find();
        res.status(200).json(roles);
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching roles", error: error.message });
    }
};

export const getRoleById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const role = await roleRepository.findOneBy({ id_role: id });
        if (role) {
            res.status(200).json(role);
        } else {
            res.status(404).json({ message: "Role not found" });
        }
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching role", error: error.message });
    }
};


export const createRole = async (req: Request, res: Response) => {
    try {
        const { name_role } = req.body as { name_role: RoleName };
        if (!name_role || !['admin', 'employee'].includes(name_role)) {
             return res.status(400).json({ message: "Invalid role name. Must be 'admin' or 'employee'." });
        }
        const newRole = roleRepository.create({ name_role });
        await roleRepository.save(newRole);
        res.status(201).json(newRole);
    } catch (error: any) {
        if ((error as any).code === '23505') { 
            return res.status(409).json({ message: "Role name already exists." });
        }
        res.status(500).json({ message: "Error creating role", error: error.message });
    }
};

export const updateRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name_role } = req.body;

        const role = await roleRepository.findOne({
            where: { id_role: parseInt(id) }
        });

        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        role.name_role = name_role;
        await roleRepository.save(role);

        return res.status(200).json({
            message: 'Role updated successfully',
            role
        });
    } catch (error) {
        console.error('Update role error:', error);
        return res.status(500).json({
            message: 'Error updating role',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const deleteRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if role exists
        const role = await roleRepository.findOne({
            where: { id_role: parseInt(id) },
            relations: ['users'] 
        });

        if (!role) {
            return res.status(404).json({ 
                message: 'Role not found' 
            });
        }

        if (role.users && role.users.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete role with associated users'
            });
        }

        await roleRepository.remove(role);

        return res.status(200).json({
            message: 'Role deleted successfully'
        });

    } catch (error) {
        console.error('Delete role error:', error);
        return res.status(500).json({
            message: 'Error deleting role',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

