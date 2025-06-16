import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1746824969360 implements MigrationInterface {
    name = 'InitialSchema1746824969360'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "form_field_type" ("id_type" SERIAL NOT NULL, "field_name" character varying(50) NOT NULL, CONSTRAINT "UQ_603a61ed2ebc17846492284bb6f" UNIQUE ("field_name"), CONSTRAINT "PK_278f58bf2bce8a06daf21ef98d7" PRIMARY KEY ("id_type"))`);
        await queryRunner.query(`CREATE TABLE "dropdown_options" ("id_options" SERIAL NOT NULL, "id_field" integer NOT NULL, "value" character varying(255) NOT NULL, "is_default" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_fa822380696bbb507d7ea879f04" PRIMARY KEY ("id_options"))`);
        await queryRunner.query(`CREATE TABLE "field_response" ("id_response" SERIAL NOT NULL, "id_inscription" integer NOT NULL, "id_field" integer NOT NULL, "response_text" text, "response_file_path" text, CONSTRAINT "PK_2e14a3ec3d153b9c7570bc9d070" PRIMARY KEY ("id_response"))`);
        await queryRunner.query(`CREATE TABLE "form_field" ("id_field" SERIAL NOT NULL, "id_event" integer NOT NULL, "label" character varying(255) NOT NULL, "id_type" integer NOT NULL, "is_required" boolean NOT NULL, "sequence" integer NOT NULL, CONSTRAINT "PK_8ed591e7cb66071060720de5372" PRIMARY KEY ("id_field"))`);
        await queryRunner.query(`ALTER TABLE "dropdown_options" ADD CONSTRAINT "FK_f069e9acd52a153e29f11178b64" FOREIGN KEY ("id_field") REFERENCES "form_field"("id_field") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "field_response" ADD CONSTRAINT "FK_a4c2d51a46a2c7e480c0e1c583b" FOREIGN KEY ("id_inscription") REFERENCES "inscription"("id_inscription") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "field_response" ADD CONSTRAINT "FK_1997f8be3172699210c07a9369c" FOREIGN KEY ("id_field") REFERENCES "form_field"("id_field") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form_field" ADD CONSTRAINT "FK_931ec2d4fcc1236ff2f58420f1d" FOREIGN KEY ("id_event") REFERENCES "event"("id_event") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form_field" ADD CONSTRAINT "FK_4b4f0868c23ba7bd19bb4ce12e2" FOREIGN KEY ("id_type") REFERENCES "form_field_type"("id_type") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "form_field" DROP CONSTRAINT "FK_4b4f0868c23ba7bd19bb4ce12e2"`);
        await queryRunner.query(`ALTER TABLE "form_field" DROP CONSTRAINT "FK_931ec2d4fcc1236ff2f58420f1d"`);
        await queryRunner.query(`ALTER TABLE "field_response" DROP CONSTRAINT "FK_1997f8be3172699210c07a9369c"`);
        await queryRunner.query(`ALTER TABLE "field_response" DROP CONSTRAINT "FK_a4c2d51a46a2c7e480c0e1c583b"`);
        await queryRunner.query(`ALTER TABLE "dropdown_options" DROP CONSTRAINT "FK_f069e9acd52a153e29f11178b64"`);
        await queryRunner.query(`DROP TABLE "form_field"`);
        await queryRunner.query(`DROP TABLE "field_response"`);
        await queryRunner.query(`DROP TABLE "dropdown_options"`);
        await queryRunner.query(`DROP TABLE "form_field_type"`);
    }

}
