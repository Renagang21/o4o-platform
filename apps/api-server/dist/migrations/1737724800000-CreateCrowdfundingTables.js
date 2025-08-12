"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCrowdfundingTables1737724800000 = void 0;
const typeorm_1 = require("typeorm");
class CreateCrowdfundingTables1737724800000 {
    constructor() {
        this.name = 'CreateCrowdfundingTables1737724800000';
    }
    async up(queryRunner) {
        // Create crowdfunding_projects table
        await queryRunner.createTable(new typeorm_1.Table({
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
            indices: [
                {
                    name: 'IDX_crowdfunding_projects_creator_id',
                    columnNames: ['creator_id']
                },
                {
                    name: 'IDX_crowdfunding_projects_status',
                    columnNames: ['status']
                },
                {
                    name: 'IDX_crowdfunding_projects_dates',
                    columnNames: ['start_date', 'end_date']
                }
            ]
        }), true);
        // Create crowdfunding_participations table
        await queryRunner.createTable(new typeorm_1.Table({
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
            indices: [
                {
                    name: 'IDX_crowdfunding_participations_project_id',
                    columnNames: ['project_id']
                },
                {
                    name: 'IDX_crowdfunding_participations_vendor_id',
                    columnNames: ['vendor_id']
                },
                {
                    name: 'UQ_crowdfunding_participations_project_vendor',
                    columnNames: ['project_id', 'vendor_id'],
                    isUnique: true
                }
            ]
        }), true);
        // Indexes are defined in table creation above
        // Create foreign keys
        await queryRunner.createForeignKey('crowdfunding_projects', new typeorm_1.TableForeignKey({
            columnNames: ['creator_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('crowdfunding_participations', new typeorm_1.TableForeignKey({
            columnNames: ['project_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'crowdfunding_projects',
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('crowdfunding_participations', new typeorm_1.TableForeignKey({
            columnNames: ['vendor_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }));
    }
    async down(queryRunner) {
        // Drop foreign keys
        const projectsTable = await queryRunner.getTable('crowdfunding_projects');
        const projectsCreatorFk = projectsTable.foreignKeys.find((fk) => fk.columnNames.indexOf('creator_id') !== -1);
        if (projectsCreatorFk) {
            await queryRunner.dropForeignKey('crowdfunding_projects', projectsCreatorFk);
        }
        const participationsTable = await queryRunner.getTable('crowdfunding_participations');
        const participationsProjectFk = participationsTable.foreignKeys.find((fk) => fk.columnNames.indexOf('project_id') !== -1);
        const participationsVendorFk = participationsTable.foreignKeys.find((fk) => fk.columnNames.indexOf('vendor_id') !== -1);
        if (participationsProjectFk) {
            await queryRunner.dropForeignKey('crowdfunding_participations', participationsProjectFk);
        }
        if (participationsVendorFk) {
            await queryRunner.dropForeignKey('crowdfunding_participations', participationsVendorFk);
        }
        // Indexes are dropped with tables
        // Drop tables
        await queryRunner.dropTable('crowdfunding_participations');
        await queryRunner.dropTable('crowdfunding_projects');
    }
}
exports.CreateCrowdfundingTables1737724800000 = CreateCrowdfundingTables1737724800000;
//# sourceMappingURL=1737724800000-CreateCrowdfundingTables.js.map