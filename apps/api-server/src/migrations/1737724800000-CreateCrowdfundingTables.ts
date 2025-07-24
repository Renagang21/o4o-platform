import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateCrowdfundingTables1737724800000 implements MigrationInterface {
    name = 'CreateCrowdfundingTables1737724800000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create crowdfunding_projects table
        await queryRunner.createTable(
            new Table({
                name: 'crowdfunding_projects',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'description',
                        type: 'text',
                    },
                    {
                        name: 'target_participant_count',
                        type: 'int',
                    },
                    {
                        name: 'current_participant_count',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'start_date',
                        type: 'date',
                    },
                    {
                        name: 'end_date',
                        type: 'date',
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['recruiting', 'in_progress', 'completed', 'cancelled'],
                        default: "'recruiting'",
                    },
                    {
                        name: 'creator_id',
                        type: 'uuid',
                    },
                    {
                        name: 'forum_link',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create crowdfunding_participations table
        await queryRunner.createTable(
            new Table({
                name: 'crowdfunding_participations',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'project_id',
                        type: 'uuid',
                    },
                    {
                        name: 'vendor_id',
                        type: 'uuid',
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['joined', 'cancelled'],
                        default: "'joined'",
                    },
                    {
                        name: 'joined_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'cancelled_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create indexes
        await queryRunner.createIndex(
            'crowdfunding_projects',
            new Index('IDX_crowdfunding_projects_creator_id', ['creator_id']),
        );

        await queryRunner.createIndex(
            'crowdfunding_projects',
            new Index('IDX_crowdfunding_projects_status', ['status']),
        );

        await queryRunner.createIndex(
            'crowdfunding_projects',
            new Index('IDX_crowdfunding_projects_dates', ['start_date', 'end_date']),
        );

        await queryRunner.createIndex(
            'crowdfunding_participations',
            new Index('IDX_crowdfunding_participations_project_id', ['project_id']),
        );

        await queryRunner.createIndex(
            'crowdfunding_participations',
            new Index('IDX_crowdfunding_participations_vendor_id', ['vendor_id']),
        );

        // Create unique constraint for project_id + vendor_id
        await queryRunner.createIndex(
            'crowdfunding_participations',
            new Index('UQ_crowdfunding_participations_project_vendor', ['project_id', 'vendor_id'], { isUnique: true }),
        );

        // Create foreign keys
        await queryRunner.createForeignKey(
            'crowdfunding_projects',
            new ForeignKey({
                columnNames: ['creator_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'crowdfunding_participations',
            new ForeignKey({
                columnNames: ['project_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'crowdfunding_projects',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'crowdfunding_participations',
            new ForeignKey({
                columnNames: ['vendor_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        const projectsTable = await queryRunner.getTable('crowdfunding_projects');
        const projectsCreatorFk = projectsTable!.foreignKeys.find(fk => fk.columnNames.indexOf('creator_id') !== -1);
        if (projectsCreatorFk) {
            await queryRunner.dropForeignKey('crowdfunding_projects', projectsCreatorFk);
        }

        const participationsTable = await queryRunner.getTable('crowdfunding_participations');
        const participationsProjectFk = participationsTable!.foreignKeys.find(fk => fk.columnNames.indexOf('project_id') !== -1);
        const participationsVendorFk = participationsTable!.foreignKeys.find(fk => fk.columnNames.indexOf('vendor_id') !== -1);
        
        if (participationsProjectFk) {
            await queryRunner.dropForeignKey('crowdfunding_participations', participationsProjectFk);
        }
        if (participationsVendorFk) {
            await queryRunner.dropForeignKey('crowdfunding_participations', participationsVendorFk);
        }

        // Drop indexes
        await queryRunner.dropIndex('crowdfunding_projects', 'IDX_crowdfunding_projects_creator_id');
        await queryRunner.dropIndex('crowdfunding_projects', 'IDX_crowdfunding_projects_status');
        await queryRunner.dropIndex('crowdfunding_projects', 'IDX_crowdfunding_projects_dates');
        await queryRunner.dropIndex('crowdfunding_participations', 'IDX_crowdfunding_participations_project_id');
        await queryRunner.dropIndex('crowdfunding_participations', 'IDX_crowdfunding_participations_vendor_id');
        await queryRunner.dropIndex('crowdfunding_participations', 'UQ_crowdfunding_participations_project_vendor');

        // Drop tables
        await queryRunner.dropTable('crowdfunding_participations');
        await queryRunner.dropTable('crowdfunding_projects');
    }
}