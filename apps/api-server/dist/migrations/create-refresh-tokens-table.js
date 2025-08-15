"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRefreshTokensTable1738003200000 = void 0;
const typeorm_1 = require("typeorm");
class CreateRefreshTokensTable1738003200000 {
    constructor() {
        this.name = 'CreateRefreshTokensTable1738003200000';
    }
    async up(queryRunner) {
        // Create refresh_tokens table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'refresh_tokens',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'token',
                    type: 'varchar',
                    isUnique: true,
                },
                {
                    name: 'userId',
                    type: 'uuid',
                },
                {
                    name: 'family',
                    type: 'varchar',
                },
                {
                    name: 'expiresAt',
                    type: 'timestamp',
                },
                {
                    name: 'isRevoked',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'userAgent',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'ipAddress',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Create indexes using query method instead
        await queryRunner.query(`
      CREATE INDEX "IDX_REFRESH_TOKEN_TOKEN" ON "refresh_tokens" ("token")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_REFRESH_TOKEN_USER_FAMILY" ON "refresh_tokens" ("userId", "family")
    `);
        // Add foreign key to users table
        await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ADD CONSTRAINT "FK_refresh_tokens_user" 
      FOREIGN KEY ("userId") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE
    `);
    }
    async down(queryRunner) {
        // Drop foreign key
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user"`);
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_REFRESH_TOKEN_USER_FAMILY"`);
        await queryRunner.query(`DROP INDEX "IDX_REFRESH_TOKEN_TOKEN"`);
        // Drop table
        await queryRunner.dropTable('refresh_tokens');
    }
}
exports.CreateRefreshTokensTable1738003200000 = CreateRefreshTokensTable1738003200000;
//# sourceMappingURL=create-refresh-tokens-table.js.map