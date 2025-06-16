import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { User } from "./User";

export type RoleName = 'admin' | 'employee';

@Entity("role")
export class Role {
    @PrimaryGeneratedColumn()
    id_role!: number;

    @Column({
        type: "varchar",
        length: 20,
        unique: true, 
        // The CHECK constraint is handled by the DB schema.
        // For application-level validation, you'd use class-validator or similar.
    })
    name_role!: RoleName;

    @OneToMany(() => User, user => user.role)
    users!: User[];
}