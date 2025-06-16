import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Event } from './Event'; // Make sure Event is imported

export enum NotificationType {
    EVENT_CREATED = 'EVENT_CREATED',
    EVENT_UPDATED = 'EVENT_UPDATED',
    EVENT_CANCELLED = 'EVENT_CANCELLED',
    EVENT_REMINDER = 'EVENT_REMINDER',
    REGISTRATION_DEADLINE_REMINDER = 'REGISTRATION_DEADLINE_REMINDER',
    REGISTRATION_CONFIRMATION = 'REGISTRATION_CONFIRMATION',
}

@Entity('notification')
export class Notification {
    @PrimaryGeneratedColumn()
    id_notification: number;

    @ManyToOne(() => User, user => user.notifications, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_user' }) // Assuming 'id_user' is the FK column name in 'notification' table
    user: User;

    @Column() // This column stores the actual foreign key value
    id_user: number;

    @Column({
        type: 'enum',
        enum: NotificationType,
    })
    type: NotificationType;

    @Column('text')
    message: string;

    @Column({ type: 'int', nullable: true }) // Ensure type is 'int' if id_event is integer
    related_event_id: number | null; // This is the foreign key column

    @ManyToOne(() => Event, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'related_event_id' }) // <<< THIS IS IMPORTANT
    relatedEvent?: Event | null; // The actual related Event object

    @Column({ default: false })
    is_read: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}