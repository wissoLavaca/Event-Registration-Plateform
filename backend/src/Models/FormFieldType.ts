import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { FormField } from "./FormField";

export type FieldTypeName = 'text' | 'number' | 'file' | 'date' | 'checkbox' | 'radio';

@Entity("form_field_type")
export class FormFieldType {
    @PrimaryGeneratedColumn()
    id_type!: number;

    @Column({ type: "varchar", length: 50, unique: true })
    field_name!: FieldTypeName; 

    @OneToMany(() => FormField, formField => formField.type)
    formFields!: FormField[];
}
