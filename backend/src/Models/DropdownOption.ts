import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { FormField } from "./FormField";

@Entity("dropdown_options")
export class DropdownOption {
    @PrimaryGeneratedColumn()
    id_options!: number;

    @Column()
    id_field!: number;

    @ManyToOne(() => FormField, formField => formField.dropdownOptions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "id_field" })
    formField!: FormField;

    @Column({ type: "varchar", length: 255 })
    value!: string;

    @Column({ type: "boolean", default: false })
    is_default!: boolean;
}