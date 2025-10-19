"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateMediaTable1747000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateMediaTable1747000000000 {
    async up(queryRunner) {
        // Create media table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'media',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()'
                },
                {
                    name: 'filename',
                    type: 'varchar',
                    length: '255'
                },
                {
                    name: 'original_filename',
                    type: 'varchar',
                    length: '255',
                    isNullable: true
                },
                {
                    name: 'url',
                    type: 'text'
                },
                {
                    name: 'thumbnail_url',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'mime_type',
                    type: 'varchar',
                    length: '100',
                    isNullable: true
                },
                {
                    name: 'size',
                    type: 'bigint',
                    isNullable: true
                },
                {
                    name: 'width',
                    type: 'int',
                    isNullable: true
                },
                {
                    name: 'height',
                    type: 'int',
                    isNullable: true
                },
                {
                    name: 'alt_text',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'caption',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'description',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'folder_path',
                    type: 'varchar',
                    length: '255',
                    isNullable: true
                },
                {
                    name: 'user_id',
                    type: 'uuid',
                    isNullable: true
                },
                {
                    name: 'variants',
                    type: 'json',
                    isNullable: true
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()'
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()'
                }
            ]
        }), true);
        // Create indexes
        await queryRunner.createIndex('media', new typeorm_1.TableIndex({
            name: 'IDX_media_user_id',
            columnNames: ['user_id']
        }));
        await queryRunner.createIndex('media', new typeorm_1.TableIndex({
            name: 'IDX_media_folder_path',
            columnNames: ['folder_path']
        }));
        await queryRunner.createIndex('media', new typeorm_1.TableIndex({
            name: 'IDX_media_created_at',
            columnNames: ['created_at']
        }));
        // Add foreign key for user_id
        await queryRunner.createForeignKey('media', new typeorm_1.TableForeignKey({
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL'
        }));
    }
    async down(queryRunner) {
        // Drop foreign key
        const table = await queryRunner.getTable('media');
        const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('user_id') !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey('media', foreignKey);
        }
        // Drop indexes
        await queryRunner.dropIndex('media', 'IDX_media_created_at');
        await queryRunner.dropIndex('media', 'IDX_media_folder_path');
        await queryRunner.dropIndex('media', 'IDX_media_user_id');
        // Drop table
        await queryRunner.dropTable('media');
    }
}
exports.CreateMediaTable1747000000000 = CreateMediaTable1747000000000;
//# sourceMappingURL=1747000000000-CreateMediaTable.js.map