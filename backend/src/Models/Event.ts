import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { Inscription } from "./Inscription";
import { FormField } from "./FormField";
import { User } from "./User";

@Entity("event")
export class Event {
    update(arg0: { status: string; }) {
        throw new Error('Method not implemented.');
    }
    @PrimaryGeneratedColumn()
    id_event!: number;

    @Column({ type: "varchar", length: 255 })
    title_event!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "date" })
    start_date!: Date;

    @Column({ type: "date" })
    end_date!: Date;

    @Column({ type: "varchar", length: 50 })
    status!: string; 

    @Column({ type: "date"})
    registration_start_date?: Date;

    @Column({ type: "date" }) 
    registration_end_date?: Date;

    @OneToMany(() => Inscription, inscription => inscription.event)
    inscriptions!: Inscription[];

    @OneToMany(() => FormField, formField => formField.event)
    formFields!: FormField[];

    @Column({ type: 'boolean', default: false })
    is_deleted!: boolean;

    @Column({ type: 'timestamp with time zone', nullable: true })
    deleted_at!: Date | null;

    @Column({ type: 'int', nullable: true })
    deleted_by_user_id!: number | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) 
    @JoinColumn({ name: 'deleted_by_user_id' })
    deleted_by?: User | null;
}