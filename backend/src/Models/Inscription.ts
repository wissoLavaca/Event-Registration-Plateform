import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToMany } from "typeorm";
import { User } from "./User";
import { Event } from "./Event";
import { FieldResponse } from "./FieldResponse";

@Entity("inscription")
export class Inscription {
    @PrimaryGeneratedColumn()
    id_inscription!: number;

    @Column()
    id_user!: number;

    @ManyToOne(() => User, user => user.inscriptions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "id_user" })
    user!: User;

    @Column()
    id_event!: number;

    @ManyToOne(() => Event, event => event.inscriptions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "id_event" })
    event!: Event;

    @CreateDateColumn()
    created_at!: Date;

    @OneToMany(() => FieldResponse, fieldResponse => fieldResponse.inscription)
    fieldResponses!: FieldResponse[];
}