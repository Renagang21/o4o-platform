"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRolePermissionTables1810000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateRolePermissionTables1810000000000 {
    async up(queryRunner) {
        // Create permissions table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'permissions',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()'
                },
                {
                    name: 'key',
                    type: 'varchar',
                    length: '100',
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: 'description',
                    type: 'varchar',
                    length: '255',
                    isNullable: false
                },
                {
                    name: 'category',
                    type: 'varchar',
                    length: '50',
                    isNullable: false
                },
                {
                    name: 'isActive',
                    type: 'boolean',
                    default: true
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP'
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP'
                }
            ]
        }), true);
        // Create indexes for permissions
        await queryRunner.createIndex('permissions', new typeorm_1.TableIndex({
            name: 'IDX_permissions_key',
            columnNames: ['key'],
            isUnique: true
        }));
        await queryRunner.createIndex('permissions', new typeorm_1.TableIndex({
            name: 'IDX_permissions_category',
            columnNames: ['category']
        }));
        await queryRunner.createIndex('permissions', new typeorm_1.TableIndex({
            name: 'IDX_permissions_isActive',
            columnNames: ['isActive']
        }));
        // Create roles table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'roles',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()'
                },
                {
                    name: 'name',
                    type: 'varchar',
                    length: '50',
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: 'displayName',
                    type: 'varchar',
                    length: '100',
                    isNullable: false
                },
                {
                    name: 'description',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'isActive',
                    type: 'boolean',
                    default: true
                },
                {
                    name: 'isSystem',
                    type: 'boolean',
                    default: false
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP'
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP'
                }
            ]
        }), true);
        // Create indexes for roles
        await queryRunner.createIndex('roles', new typeorm_1.TableIndex({
            name: 'IDX_roles_name',
            columnNames: ['name'],
            isUnique: true
        }));
        await queryRunner.createIndex('roles', new typeorm_1.TableIndex({
            name: 'IDX_roles_isActive',
            columnNames: ['isActive']
        }));
        // Create role_permissions junction table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'role_permissions',
            columns: [
                {
                    name: 'role_id',
                    type: 'uuid',
                    isNullable: false
                },
                {
                    name: 'permission_id',
                    type: 'uuid',
                    isNullable: false
                }
            ],
            foreignKeys: [
                {
                    columnNames: ['role_id'],
                    referencedTableName: 'roles',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE'
                },
                {
                    columnNames: ['permission_id'],
                    referencedTableName: 'permissions',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE'
                }
            ]
        }), true);
        // Create composite primary key for role_permissions
        await queryRunner.createPrimaryKey('role_permissions', ['role_id', 'permission_id']);
        // Create indexes for role_permissions
        await queryRunner.createIndex('role_permissions', new typeorm_1.TableIndex({
            name: 'IDX_role_permissions_role_id',
            columnNames: ['role_id']
        }));
        await queryRunner.createIndex('role_permissions', new typeorm_1.TableIndex({
            name: 'IDX_role_permissions_permission_id',
            columnNames: ['permission_id']
        }));
        // Create user_roles junction table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'user_roles',
            columns: [
                {
                    name: 'user_id',
                    type: 'uuid',
                    isNullable: false
                },
                {
                    name: 'role_id',
                    type: 'uuid',
                    isNullable: false
                }
            ],
            foreignKeys: [
                {
                    columnNames: ['user_id'],
                    referencedTableName: 'users',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE'
                },
                {
                    columnNames: ['role_id'],
                    referencedTableName: 'roles',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE'
                }
            ]
        }), true);
        // Create composite primary key for user_roles
        await queryRunner.createPrimaryKey('user_roles', ['user_id', 'role_id']);
        // Create indexes for user_roles
        await queryRunner.createIndex('user_roles', new typeorm_1.TableIndex({
            name: 'IDX_user_roles_user_id',
            columnNames: ['user_id']
        }));
        await queryRunner.createIndex('user_roles', new typeorm_1.TableIndex({
            name: 'IDX_user_roles_role_id',
            columnNames: ['role_id']
        }));
    }
    async down(queryRunner) {
        // Drop user_roles table
        await queryRunner.dropIndex('user_roles', 'IDX_user_roles_role_id');
        await queryRunner.dropIndex('user_roles', 'IDX_user_roles_user_id');
        await queryRunner.dropTable('user_roles');
        // Drop role_permissions table
        await queryRunner.dropIndex('role_permissions', 'IDX_role_permissions_permission_id');
        await queryRunner.dropIndex('role_permissions', 'IDX_role_permissions_role_id');
        await queryRunner.dropTable('role_permissions');
        // Drop roles table
        await queryRunner.dropIndex('roles', 'IDX_roles_isActive');
        await queryRunner.dropIndex('roles', 'IDX_roles_name');
        await queryRunner.dropTable('roles');
        // Drop permissions table
        await queryRunner.dropIndex('permissions', 'IDX_permissions_isActive');
        await queryRunner.dropIndex('permissions', 'IDX_permissions_category');
        await queryRunner.dropIndex('permissions', 'IDX_permissions_key');
        await queryRunner.dropTable('permissions');
    }
}
exports.CreateRolePermissionTables1810000000000 = CreateRolePermissionTables1810000000000;
//# sourceMappingURL=1810000000000-CreateRolePermissionTables.js.map