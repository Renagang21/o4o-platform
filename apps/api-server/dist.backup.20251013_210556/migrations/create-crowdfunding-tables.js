"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCrowdfundingTables1700000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateCrowdfundingTables1700000000000 {
    async up(queryRunner) {
        // Create funding_projects table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'funding_projects',
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
                    name: 'slug',
                    type: 'varchar',
                    length: '255',
                    isUnique: true,
                },
                {
                    name: 'description',
                    type: 'text',
                },
                {
                    name: 'shortDescription',
                    type: 'varchar',
                    length: '500',
                },
                {
                    name: 'category',
                    type: 'varchar',
                    length: '50',
                },
                {
                    name: 'tags',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'creatorId',
                    type: 'uuid',
                },
                {
                    name: 'creatorName',
                    type: 'varchar',
                    length: '255',
                },
                {
                    name: 'creatorDescription',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'targetAmount',
                    type: 'decimal',
                    precision: 12,
                    scale: 2,
                },
                {
                    name: 'currentAmount',
                    type: 'decimal',
                    precision: 12,
                    scale: 2,
                    default: 0,
                },
                {
                    name: 'minimumAmount',
                    type: 'decimal',
                    precision: 12,
                    scale: 2,
                    isNullable: true,
                },
                {
                    name: 'startDate',
                    type: 'timestamp',
                },
                {
                    name: 'endDate',
                    type: 'timestamp',
                },
                {
                    name: 'estimatedDeliveryDate',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'backerCount',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'viewCount',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'likeCount',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'shareCount',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'updateCount',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'status',
                    type: 'varchar',
                    length: '20',
                    default: "'draft'",
                },
                {
                    name: 'isVisible',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'isFeatured',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'isStaffPick',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'mainImage',
                    type: 'varchar',
                    length: '500',
                    isNullable: true,
                },
                {
                    name: 'images',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'videoUrl',
                    type: 'varchar',
                    length: '500',
                    isNullable: true,
                },
                {
                    name: 'story',
                    type: 'text',
                },
                {
                    name: 'risks',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'allowComments',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'allowAnonymousBacking',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'showBackerList',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'approvedAt',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'approvedBy',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'rejectionReason',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()',
                },
            ],
        }), true);
        // Create indexes for funding_projects
        await queryRunner.query(`CREATE INDEX "IDX_FUNDING_PROJECTS_STATUS_END_DATE" ON "funding_projects" ("status", "endDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_FUNDING_PROJECTS_CREATOR" ON "funding_projects" ("creatorId")`);
        await queryRunner.query(`CREATE INDEX "IDX_FUNDING_PROJECTS_CATEGORY" ON "funding_projects" ("category")`);
        // Create funding_rewards table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'funding_rewards',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'projectId',
                    type: 'uuid',
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
                    name: 'price',
                    type: 'decimal',
                    precision: 10,
                    scale: 2,
                },
                {
                    name: 'earlyBirdPrice',
                    type: 'decimal',
                    precision: 10,
                    scale: 2,
                    isNullable: true,
                },
                {
                    name: 'earlyBirdLimit',
                    type: 'int',
                    isNullable: true,
                },
                {
                    name: 'totalQuantity',
                    type: 'int',
                    isNullable: true,
                },
                {
                    name: 'remainingQuantity',
                    type: 'int',
                    isNullable: true,
                },
                {
                    name: 'estimatedDeliveryDate',
                    type: 'timestamp',
                },
                {
                    name: 'shippingRequired',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'shippingRegions',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'images',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'includesItems',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'options',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'isActive',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'isHidden',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'maxPerBacker',
                    type: 'int',
                    default: 1,
                },
                {
                    name: 'minimumBackers',
                    type: 'int',
                    isNullable: true,
                },
                {
                    name: 'sortOrder',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()',
                },
            ],
            foreignKeys: [
                {
                    columnNames: ['projectId'],
                    referencedTableName: 'funding_projects',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                },
            ],
        }), true);
        await queryRunner.query(`CREATE INDEX "IDX_FUNDING_REWARDS_PROJECT_SORT" ON "funding_rewards" ("projectId", "sortOrder")`);
        // Create funding_backings table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'funding_backings',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'projectId',
                    type: 'uuid',
                },
                {
                    name: 'backerId',
                    type: 'uuid',
                },
                {
                    name: 'amount',
                    type: 'decimal',
                    precision: 10,
                    scale: 2,
                },
                {
                    name: 'currency',
                    type: 'varchar',
                    length: '3',
                    default: "'KRW'",
                },
                {
                    name: 'paymentMethod',
                    type: 'varchar',
                    length: '20',
                },
                {
                    name: 'paymentStatus',
                    type: 'varchar',
                    length: '20',
                    default: "'pending'",
                },
                {
                    name: 'paymentId',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'paidAt',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'status',
                    type: 'varchar',
                    length: '20',
                    default: "'active'",
                },
                {
                    name: 'isAnonymous',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'displayName',
                    type: 'varchar',
                    length: '100',
                    isNullable: true,
                },
                {
                    name: 'backerMessage',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'isMessagePublic',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'cancelledAt',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'cancellationReason',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'refundedAt',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'refundAmount',
                    type: 'decimal',
                    precision: 10,
                    scale: 2,
                    isNullable: true,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()',
                },
            ],
            foreignKeys: [
                {
                    columnNames: ['projectId'],
                    referencedTableName: 'funding_projects',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                },
                {
                    columnNames: ['backerId'],
                    referencedTableName: 'users',
                    referencedColumnNames: ['id'],
                },
            ],
        }), true);
        await queryRunner.query(`CREATE INDEX "IDX_FUNDING_BACKINGS_PROJECT_BACKER" ON "funding_backings" ("projectId", "backerId")`);
        await queryRunner.query(`CREATE INDEX "IDX_FUNDING_BACKINGS_STATUS" ON "funding_backings" ("status")`);
        // Create backer_rewards table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'backer_rewards',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'backingId',
                    type: 'uuid',
                },
                {
                    name: 'rewardId',
                    type: 'uuid',
                },
                {
                    name: 'quantity',
                    type: 'int',
                    default: 1,
                },
                {
                    name: 'selectedOptions',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'shippingAddress',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'shippingRegion',
                    type: 'varchar',
                    length: '100',
                    isNullable: true,
                },
                {
                    name: 'totalPrice',
                    type: 'decimal',
                    precision: 10,
                    scale: 2,
                },
                {
                    name: 'status',
                    type: 'varchar',
                    length: '20',
                    default: "'pending'",
                },
                {
                    name: 'trackingNumber',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'shippedAt',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'deliveredAt',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()',
                },
            ],
            foreignKeys: [
                {
                    columnNames: ['backingId'],
                    referencedTableName: 'funding_backings',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                },
                {
                    columnNames: ['rewardId'],
                    referencedTableName: 'funding_rewards',
                    referencedColumnNames: ['id'],
                },
            ],
        }), true);
        await queryRunner.query(`CREATE INDEX "IDX_BACKER_REWARDS_BACKING" ON "backer_rewards" ("backingId")`);
        // Create funding_updates table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'funding_updates',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'projectId',
                    type: 'uuid',
                },
                {
                    name: 'title',
                    type: 'varchar',
                    length: '255',
                },
                {
                    name: 'content',
                    type: 'text',
                },
                {
                    name: 'isPublic',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'author',
                    type: 'varchar',
                    length: '255',
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()',
                },
            ],
            foreignKeys: [
                {
                    columnNames: ['projectId'],
                    referencedTableName: 'funding_projects',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                },
            ],
        }), true);
        await queryRunner.query(`CREATE INDEX "IDX_FUNDING_UPDATES_PROJECT_DATE" ON "funding_updates" ("projectId", "created_at")`);
    }
    async down(queryRunner) {
        // Drop tables in reverse order
        await queryRunner.dropTable('funding_updates');
        await queryRunner.dropTable('backer_rewards');
        await queryRunner.dropTable('funding_backings');
        await queryRunner.dropTable('funding_rewards');
        await queryRunner.dropTable('funding_projects');
    }
}
exports.CreateCrowdfundingTables1700000000000 = CreateCrowdfundingTables1700000000000;
//# sourceMappingURL=create-crowdfunding-tables.js.map