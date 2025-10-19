"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateLinkedAccountsTable1736236000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateLinkedAccountsTable1736236000000 {
    async up(queryRunner) {
        // Check if table already exists
        const tableExists = await queryRunner.hasTable('linked_accounts');
        if (tableExists) {
            return;
        }
        // Create linked_accounts table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'linked_accounts',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'gen_random_uuid()'
                },
                {
                    name: 'userId',
                    type: 'uuid',
                    isNullable: false
                },
                {
                    name: 'provider',
                    type: 'varchar',
                    length: '100',
                    isNullable: false
                },
                {
                    name: 'providerId',
                    type: 'varchar',
                    length: '255',
                    isNullable: false
                },
                {
                    name: 'email',
                    type: 'varchar',
                    length: '255',
                    isNullable: true
                },
                {
                    name: 'displayName',
                    type: 'varchar',
                    length: '255',
                    isNullable: true
                },
                {
                    name: 'profileImage',
                    type: 'varchar',
                    length: '500',
                    isNullable: true
                },
                {
                    name: 'isVerified',
                    type: 'boolean',
                    default: false
                },
                {
                    name: 'isPrimary',
                    type: 'boolean',
                    default: false
                },
                {
                    name: 'providerData',
                    type: 'json',
                    isNullable: true
                },
                {
                    name: 'lastUsedAt',
                    type: 'timestamp',
                    isNullable: true
                },
                {
                    name: 'linkedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP'
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP'
                }
            ],
            foreignKeys: [
                {
                    name: 'FK_linked_accounts_user',
                    columnNames: ['userId'],
                    referencedTableName: 'users',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE'
                }
            ]
        }), true);
        // Create indexes
        await queryRunner.createIndex('linked_accounts', new typeorm_1.TableIndex({
            name: 'IDX_linked_accounts_userId',
            columnNames: ['userId']
        }));
        await queryRunner.createIndex('linked_accounts', new typeorm_1.TableIndex({
            name: 'IDX_linked_accounts_provider_providerId',
            columnNames: ['provider', 'providerId'],
            isUnique: true
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropTable('linked_accounts');
    }
}
exports.CreateLinkedAccountsTable1736236000000 = CreateLinkedAccountsTable1736236000000;
//# sourceMappingURL=1736236000000-CreateLinkedAccountsTable.js.map