import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimestampsToCategory1731616800000 implements MigrationInterface {
  name = 'AddTimestampsToCategory1731616800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist before adding them
    const tableColumns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      AND column_name IN ('created_at', 'updated_at')
    `);
    
    const existingColumns = tableColumns.map((row: any) => row.column_name);
    
    if (!existingColumns.includes('created_at')) {
      await queryRunner.query(`
        ALTER TABLE "categories" 
        ADD COLUMN "created_at" TIMESTAMP NOT NULL DEFAULT now()
      `);
    }
    
    if (!existingColumns.includes('updated_at')) {
      await queryRunner.query(`
        ALTER TABLE "categories" 
        ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "updated_at"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "created_at"`);
  }
}