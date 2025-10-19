"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRefreshTokenTable1738500000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateRefreshTokenTable1738500000000 {
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
                    default: 'uuid_generate_v4()'
                },
                {
                    name: 'token',
                    type: 'text',
                    isNullable: false
                },
                {
                    name: 'userId',
                    type: 'uuid',
                    isNullable: false
                },
                {
                    name: 'family',
                    type: 'varchar',
                    length: '255',
                    isNullable: false,
                    comment: 'Token family for rotation tracking'
                },
                {
                    name: 'expiresAt',
                    type: 'timestamp',
                    isNullable: false
                },
                {
                    name: 'isRevoked',
                    type: 'boolean',
                    default: false
                },
                {
                    name: 'userAgent',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'ipAddress',
                    type: 'varchar',
                    length: '45',
                    isNullable: true
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP'
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP'
                }
            ],
            foreignKeys: [
                {
                    name: 'FK_refresh_tokens_user',
                    columnNames: ['userId'],
                    referencedTableName: 'users',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE'
                }
            ]
        }), true);
        // Create indexes
        await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_refresh_tokens_token" 
      ON "refresh_tokens" ("token")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_userId_family" 
      ON "refresh_tokens" ("userId", "family")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_family" 
      ON "refresh_tokens" ("family")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_expiresAt" 
      ON "refresh_tokens" ("expiresAt")
    `);
    }
    async down(queryRunner) {
        // Drop indexes
        await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_expiresAt');
        await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_family');
        await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_userId_family');
        await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_token');
        // Drop table
        await queryRunner.dropTable('refresh_tokens');
    }
}
exports.CreateRefreshTokenTable1738500000000 = CreateRefreshTokenTable1738500000000;
//# sourceMappingURL=1738500000000-CreateRefreshTokenTable.js.map