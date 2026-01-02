import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create K-Shopping tables
 *
 * Phase E-1: K-Shopping (여행자 서비스) API Implementation
 * Tables for traveler service participation/application workflow
 * - kshopping_applications: 참여 신청
 * - kshopping_participants: 승인된 참여자
 */
export class CreateKShoppingTables9990000000010 implements MigrationInterface {
  name = 'CreateKShoppingTables9990000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================================
    // 1. Create kshopping_applications table
    // =========================================================================
    await queryRunner.createTable(
      new Table({
        name: 'kshopping_applications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'participant_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: 'store | guide | partner',
          },
          {
            name: 'organization_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'business_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'service_types',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
            comment: 'tax_refund | guide_sales | travel_package',
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'submitted'",
            comment: 'submitted | approved | rejected',
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'submitted_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'decided_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'decided_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
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
      }),
      true
    );

    // Indexes for kshopping_applications
    await queryRunner.createIndex(
      'kshopping_applications',
      new TableIndex({
        name: 'IDX_kshopping_applications_user_id',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'kshopping_applications',
      new TableIndex({
        name: 'IDX_kshopping_applications_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'kshopping_applications',
      new TableIndex({
        name: 'IDX_kshopping_applications_user_status',
        columnNames: ['user_id', 'status'],
      })
    );

    await queryRunner.createIndex(
      'kshopping_applications',
      new TableIndex({
        name: 'IDX_kshopping_applications_participant_type',
        columnNames: ['participant_type'],
      })
    );

    // Foreign key to users table
    await queryRunner.createForeignKey(
      'kshopping_applications',
      new TableForeignKey({
        name: 'FK_kshopping_applications_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // =========================================================================
    // 2. Create kshopping_participants table
    // =========================================================================
    await queryRunner.createTable(
      new Table({
        name: 'kshopping_participants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'participant_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: 'store | guide | partner',
          },
          {
            name: 'organization_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
            comment: 'Unique participant code (KS-xxx, KG-xxx, KP-xxx)',
          },
          {
            name: 'business_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'contact_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
            comment: 'active | inactive | suspended',
          },
          {
            name: 'enabled_services',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
            comment: 'Source of Truth for enabled services',
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
          },
          {
            name: 'application_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Reference to the approved application',
          },
          {
            name: 'metadata',
            type: 'jsonb',
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
      }),
      true
    );

    // Indexes for kshopping_participants
    await queryRunner.createIndex(
      'kshopping_participants',
      new TableIndex({
        name: 'IDX_kshopping_participants_user_id',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'kshopping_participants',
      new TableIndex({
        name: 'IDX_kshopping_participants_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'kshopping_participants',
      new TableIndex({
        name: 'IDX_kshopping_participants_participant_type',
        columnNames: ['participant_type'],
      })
    );

    await queryRunner.createIndex(
      'kshopping_participants',
      new TableIndex({
        name: 'IDX_kshopping_participants_code',
        columnNames: ['code'],
      })
    );

    // Foreign key to users table
    await queryRunner.createForeignKey(
      'kshopping_participants',
      new TableForeignKey({
        name: 'FK_kshopping_participants_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop kshopping_participants
    await queryRunner.dropForeignKey(
      'kshopping_participants',
      'FK_kshopping_participants_user_id'
    );
    await queryRunner.dropIndex(
      'kshopping_participants',
      'IDX_kshopping_participants_code'
    );
    await queryRunner.dropIndex(
      'kshopping_participants',
      'IDX_kshopping_participants_participant_type'
    );
    await queryRunner.dropIndex(
      'kshopping_participants',
      'IDX_kshopping_participants_status'
    );
    await queryRunner.dropIndex(
      'kshopping_participants',
      'IDX_kshopping_participants_user_id'
    );
    await queryRunner.dropTable('kshopping_participants');

    // Drop kshopping_applications
    await queryRunner.dropForeignKey(
      'kshopping_applications',
      'FK_kshopping_applications_user_id'
    );
    await queryRunner.dropIndex(
      'kshopping_applications',
      'IDX_kshopping_applications_participant_type'
    );
    await queryRunner.dropIndex(
      'kshopping_applications',
      'IDX_kshopping_applications_user_status'
    );
    await queryRunner.dropIndex(
      'kshopping_applications',
      'IDX_kshopping_applications_status'
    );
    await queryRunner.dropIndex(
      'kshopping_applications',
      'IDX_kshopping_applications_user_id'
    );
    await queryRunner.dropTable('kshopping_applications');
  }
}
