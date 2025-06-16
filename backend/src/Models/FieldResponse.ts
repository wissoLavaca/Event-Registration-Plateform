import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Inscription } from "./Inscription";
import { FormField } from "./FormField";

@Entity("field_response")
export class FieldResponse {
    @PrimaryGeneratedColumn()
    id_response!: number;

    @Column()
    id_inscription!: number;

    @ManyToOne(() => Inscription, inscription => inscription.fieldResponses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "id_inscription" })
    inscription!: Inscription;

    @Column()
    id_field!: number;

    @ManyToOne(() => FormField, formField => formField.fieldResponses, { onDelete: 'NO ACTION' }) // Or RESTRICT
    @JoinColumn({ name: "id_field" })
    formField!: FormField;

    @Column({ type: "text", nullable: true })
    response_text?: string;

    @Column({ type: "text", nullable: true })
    response_file_path?: string; // For file uploads, you'll need handling (e.g., Multer)
}