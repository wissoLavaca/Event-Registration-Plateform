// filepath: c:\Users\PICOS\Desktop\stage\backend\src\migrations\1749302400000-AddMissingValuesToNotificationTypeEnum.ts
// (Replace 1749302400000 with your actual timestamp)
import { MigrationInterface, QueryRunner } from "typeorm";

// Ensure this class name matches your filename (Timestamp-Name)
export class AddMissingValuesToNotificationTypeEnum1749302400000 implements MigrationInterface {
    // The 'name' property should also match the class name for TypeORM to recognize it properly
    name = 'AddMissingValuesToNotificationTypeEnum1749302400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Use "NotificationType" (quoted) as confirmed by your psql output
        await queryRunner.query(`ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EVENT_CREATED'`);
        await queryRunner.query(`ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EVENT_UPDATED'`);
        await queryRunner.query(`ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EVENT_CANCELLED'`);
        await queryRunner.query(`ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EVENT_REMINDER'`);
        await queryRunner.query(`ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REGISTRATION_DEADLINE_REMINDER'`);
        await queryRunner.query(`ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REGISTRATION_CONFIRMATION'`);
        // Add any other types you added or might need in the future
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.warn(`Reverting 'AddMissingValuesToNotificationTypeEnum1749302400000' does not automatically remove enum values. Manual database intervention would be required if values need to be removed and it's confirmed no data uses them.`);
    }
}