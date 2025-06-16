import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Role } from "./Role";
import { Departement } from "./Departement";
import { Inscription } from "./Inscription";
import { Notification } from './Notification';

@Entity("user") 
export class User {
    @PrimaryGeneratedColumn()
    id_user!: number;

    @Column({ type: "varchar", length: 100 })
    first_name!: string;

    @Column({ type: "varchar", length: 100 })
    last_name!: string;

    @Column({ type: "date"})
    birth_date!: Date ;

    @Column({ type: "varchar", length: 50, nullable: true })
    username!: string;

    @Column({ type: "text" })
    password!: string; 

    @Column({ type: "varchar", length: 100, unique: true })
    registration_number!: string;

    @Column()
    id_role!: number;

      @Column({ type: 'varchar', length: 512, nullable: true }) 
  profile_picture_url: string | null;

    @ManyToOne(() => Role, role => role.users, { eager: false, onDelete: 'NO ACTION' }) // Assuming RESTRICT or NO ACTION
    @JoinColumn({ name: "id_role" })
    role!: Role;

    @Column()
    id_departement!: number;

    @ManyToOne(() => Departement, departement => departement.users, { eager: false, onDelete: 'NO ACTION' })
    @JoinColumn({ name: "id_departement" })
    departement!: Departement;

    @OneToMany(() => Inscription, inscription => inscription.user)
    inscriptions!: Inscription[];

    @OneToMany(() => Notification, notification => notification.user)
    notifications: Notification[];

    @Column({ type: 'boolean', default: false })
    is_deleted!: boolean;

    @Column({ type: 'timestamp with time zone', nullable: true })
    deleted_at!: Date | null;

    @Column({ type: 'int', nullable: true })
    deleted_by_user_id!: number | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) // Link to the user who deleted this user
    @JoinColumn({ name: 'deleted_by_user_id' })
    deleted_by?: User | null;
}