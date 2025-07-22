import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarToUsers1738005000000 implements MigrationInterface {
  name = 'AddAvatarToUsers1738005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add avatar column to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "avatar" varchar(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove avatar column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN "avatar"
    `);
  }
}