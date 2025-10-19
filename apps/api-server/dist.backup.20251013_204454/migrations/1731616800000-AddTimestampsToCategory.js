"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTimestampsToCategory1731616800000 = void 0;
class AddTimestampsToCategory1731616800000 {
    constructor() {
        this.name = 'AddTimestampsToCategory1731616800000';
    }
    async up(queryRunner) {
        // Check if columns already exist before adding them
        const tableColumns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      AND column_name IN ('created_at', 'updated_at')
    `);
        const existingColumns = tableColumns.map((row) => row.column_name);
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
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "created_at"`);
    }
}
exports.AddTimestampsToCategory1731616800000 = AddTimestampsToCategory1731616800000;
//# sourceMappingURL=1731616800000-AddTimestampsToCategory.js.map