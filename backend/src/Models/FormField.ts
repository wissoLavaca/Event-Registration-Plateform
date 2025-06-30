import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Event } from "./Event";
import { FormFieldType } from "./FormFieldType";
import { DropdownOption } from "./DropdownOption";
import { FieldResponse } from "./FieldResponse";

@Entity("form_field")
export class FormField {
    @PrimaryGeneratedColumn()
    id_field!: number;

    @Column()
    id_event!: number;

    @ManyToOne(() => Event, event => event.formFields, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "id_event" })
    event!: Event;

    @Column({ type: "varchar", length: 255 })
    label!: string;

    @Column()
    id_type!: number;

    @ManyToOne(() => FormFieldType, type => type.formFields, { onDelete: 'NO ACTION' }) 
    @JoinColumn({ name: "id_type" })
    type!: FormFieldType;

    @Column({ type: "boolean" })
    is_required!: boolean;

    @Column({ type: "integer", name: 'sequence' }) 
    sequence!: number;

    @OneToMany(() => DropdownOption, option => option.formField)
    dropdownOptions!: DropdownOption[];

    @OneToMany(() => FieldResponse, fieldResponse => fieldResponse.formField)
    fieldResponses!: FieldResponse[];

    @Column({ type: 'text', nullable: true, name: 'accepted_file_types' })
  acceptedFileTypes: string | null;
}
