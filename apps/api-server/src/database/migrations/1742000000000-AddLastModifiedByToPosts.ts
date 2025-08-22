import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastModifiedByToPosts1742000000000 implements MigrationInterface {
  name = 'AddLastModifiedByToPosts1742000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add lastModifiedBy column to posts table
    await queryRunner.query(`
      ALTER TABLE "posts" 
      ADD COLUMN IF NOT EXISTS "lastModifiedBy" uuid
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "posts" 
      ADD CONSTRAINT "FK_posts_lastModifiedBy" 
      FOREIGN KEY ("lastModifiedBy") 
      REFERENCES "users"("id") 
      ON DELETE SET NULL
    `);

    // Create index for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_lastModifiedBy" 
      ON "posts" ("lastModifiedBy")
    `);

    // Set initial value as authorId for existing posts
    await queryRunner.query(`
      UPDATE "posts" 
      SET "lastModifiedBy" = "authorId" 
      WHERE "lastModifiedBy" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_lastModifiedBy"`);
    
    // Drop foreign key constraint
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "FK_posts_lastModifiedBy"`);
    
    // Drop column
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN IF EXISTS "lastModifiedBy"`);
  }
}