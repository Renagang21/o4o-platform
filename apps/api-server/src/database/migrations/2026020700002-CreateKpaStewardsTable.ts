import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1
 *
 * Creates kpa_stewards table for managing Steward assignments.
 * Steward = service-internal assignment (NOT an RBAC role)
 */
export class CreateKpaStewardsTable2026020700002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'kpa_stewards'
      ) AS "exists";
    `);

    if (tableExists[0]?.exists) {
      console.log('[CreateKpaStewardsTable] kpa_stewards table already exists, skipping.');
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'kpa_stewards',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'member_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'scope_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'scope_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'note',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'assigned_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'revoked_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'revoked_at',
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
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'kpa_stewards',
      new TableIndex({
        name: 'IDX_kpa_stewards_org_scope_active',
        columnNames: ['organization_id', 'scope_type', 'is_active'],
      })
    );

    await queryRunner.createIndex(
      'kpa_stewards',
      new TableIndex({
        name: 'IDX_kpa_stewards_member_active',
        columnNames: ['member_id', 'is_active'],
      })
    );

    console.log('[CreateKpaStewardsTable] kpa_stewards table created successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('kpa_stewards', true);
    console.log('[CreateKpaStewardsTable] kpa_stewards table dropped.');
  }
}
