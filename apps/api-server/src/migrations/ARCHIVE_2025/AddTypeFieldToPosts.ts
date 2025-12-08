import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTypeFieldToPosts1736500000000 implements MigrationInterface {
    name = 'AddTypeFieldToPosts1736500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the column already exists
        const table = await queryRunner.getTable('posts');
        const typeColumn = table?.findColumnByName('type');
        
        if (!typeColumn) {
            // Add type column to posts table
            await queryRunner.addColumn('posts', new TableColumn({
                name: 'type',
                type: 'varchar',
                length: '50',
                isNullable: false,
                default: "'post'"
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove type column from posts table
        const table = await queryRunner.getTable('posts');
        const typeColumn = table?.findColumnByName('type');
        
        if (typeColumn) {
            await queryRunner.dropColumn('posts', 'type');
        }
    }
}