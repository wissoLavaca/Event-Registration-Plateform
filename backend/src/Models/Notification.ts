import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Event } from './Event'; 

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
    @JoinColumn({ name: 'id_user' })
    user: User;

    @Column() 
    id_user: number;

    @Column({
        type: 'enum',
        enum: NotificationType,
    })
    type: NotificationType;

    @Column('text')
    message: string;

    @Column({ type: 'int', nullable: true }) 
    related_event_id: number | null; 

    @ManyToOne(() => Event, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'related_event_id' }) 
    relatedEvent?: Event | null; 

    @Column({ default: false })
    is_read: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
