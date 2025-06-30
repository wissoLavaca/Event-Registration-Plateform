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

    })
    name_role!: RoleName;

    @OneToMany(() => User, user => user.role)
    users!: User[];
}
