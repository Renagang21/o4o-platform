"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddLastModifiedByToPosts1742000000000 = void 0;
class AddLastModifiedByToPosts1742000000000 {
    constructor() {
        this.name = 'AddLastModifiedByToPosts1742000000000';
    }
    async up(queryRunner) {
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
      SET "lastModifiedBy" = "author_id" 
      WHERE "lastModifiedBy" IS NULL
    `);
    }
    async down(queryRunner) {
        // Drop index
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_lastModifiedBy"`);
        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "FK_posts_lastModifiedBy"`);
        // Drop column
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN IF EXISTS "lastModifiedBy"`);
    }
}
exports.AddLastModifiedByToPosts1742000000000 = AddLastModifiedByToPosts1742000000000;
//# sourceMappingURL=1742000000000-AddLastModifiedByToPosts.js.map