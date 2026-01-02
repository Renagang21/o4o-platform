import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateKpaTables9990000000000 implements MigrationInterface {
  name = 'CreateKpaTables9990000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. KPA Organizations
    await queryRunner.createTable(
      new Table({
        name: 'kpa_organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'type', type: 'varchar', length: '50' },  // association, branch, group
          { name: 'parent_id', type: 'uuid', isNullable: true },
          { name: 'description', type: 'varchar', length: '500', isNullable: true },
          { name: 'address', type: 'varchar', length: '200', isNullable: true },
          { name: 'phone', type: 'varchar', length: '50', isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    // Self-referencing FK for organization hierarchy
    await queryRunner.createForeignKey(
      'kpa_organizations',
      new TableForeignKey({
        columnNames: ['parent_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'kpa_organizations',
        onDelete: 'SET NULL',
      })
    );

    // 2. KPA Members
    await queryRunner.createTable(
      new Table({
        name: 'kpa_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'organization_id', type: 'uuid' },
          { name: 'role', type: 'varchar', length: '50', default: "'member'" },  // member, operator, admin
          { name: 'status', type: 'varchar', length: '50', default: "'pending'" },  // pending, active, suspended, withdrawn
          { name: 'license_number', type: 'varchar', length: '100', isNullable: true },
          { name: 'pharmacy_name', type: 'varchar', length: '200', isNullable: true },
          { name: 'pharmacy_address', type: 'varchar', length: '300', isNullable: true },
          { name: 'joined_at', type: 'date', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'kpa_members',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'kpa_organizations',
        onDelete: 'CASCADE',
      })
    );

    // 3. KPA Applications
    await queryRunner.createTable(
      new Table({
        name: 'kpa_applications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'organization_id', type: 'uuid' },
          { name: 'type', type: 'varchar', length: '50' },  // membership, service, other
          { name: 'payload', type: 'jsonb', default: "'{}'" },
          { name: 'status', type: 'varchar', length: '50', default: "'submitted'" },  // submitted, approved, rejected, cancelled
          { name: 'note', type: 'text', isNullable: true },
          { name: 'reviewer_id', type: 'uuid', isNullable: true },
          { name: 'review_comment', type: 'text', isNullable: true },
          { name: 'reviewed_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'kpa_applications',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'kpa_organizations',
        onDelete: 'CASCADE',
      })
    );

    // Indexes
    await queryRunner.query(`
      CREATE INDEX idx_kpa_organizations_type ON kpa_organizations(type);
      CREATE INDEX idx_kpa_organizations_parent ON kpa_organizations(parent_id);
      CREATE INDEX idx_kpa_members_user ON kpa_members(user_id);
      CREATE INDEX idx_kpa_members_org ON kpa_members(organization_id);
      CREATE INDEX idx_kpa_members_status ON kpa_members(status);
      CREATE UNIQUE INDEX idx_kpa_members_user_unique ON kpa_members(user_id) WHERE status != 'withdrawn';
      CREATE INDEX idx_kpa_applications_user ON kpa_applications(user_id);
      CREATE INDEX idx_kpa_applications_org ON kpa_applications(organization_id);
      CREATE INDEX idx_kpa_applications_status ON kpa_applications(status);
      CREATE INDEX idx_kpa_applications_type ON kpa_applications(type);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('kpa_applications', true);
    await queryRunner.dropTable('kpa_members', true);
    await queryRunner.dropTable('kpa_organizations', true);
  }
}
