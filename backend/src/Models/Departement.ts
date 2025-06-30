import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { User } from "./User";

export type DepartementName = 'DDD' | 'DSSI' | 'DRH' | 'DFO';

@Entity("departement")
export class Departement {
    @PrimaryGeneratedColumn()
    id_departement!: number;

    @Column({
        type: "varchar",
        length: 20,
        unique: true, 
    })
    name_departement!: DepartementName;

    @OneToMany(() => User, user => user.departement)
    users!: User[];
}
