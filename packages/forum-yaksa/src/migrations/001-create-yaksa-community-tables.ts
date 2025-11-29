import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Forum Yaksa Migration 001 - Create Yaksa Community Tables
 *
 * Creates Yaksa-specific community database tables:
 * - yaksa_forum_community
 * - yaksa_forum_community_member
 */
export class ForumYaksaMigration001CreateCommunityTables implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create yaksa_forum_community table
    await queryRunner.createTable(new Table({
      name: 'yaksa_forum_community',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()',
        },
        {
          name: 'name',
          type: 'varchar',
          length: '200',
        },
        {
          name: 'description',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'type',
          type: 'enum',
          enum: ['personal', 'branch', 'division', 'global'],
          default: "'personal'",
        },
        {
          name: 'ownerUserId',
          type: 'uuid',
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
      foreignKeys: [
        {
          columnNames: ['ownerUserId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    }), true);

    // Create indexes for yaksa_forum_community
    await queryRunner.query(
      `CREATE INDEX "IDX_YAKSA_COMMUNITY_TYPE_OWNER" ON "yaksa_forum_community" ("type", "ownerUserId")`
    );

    // Create yaksa_forum_community_member table
    await queryRunner.createTable(new Table({
      name: 'yaksa_forum_community_member',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()',
        },
        {
          name: 'communityId',
          type: 'uuid',
        },
        {
          name: 'userId',
          type: 'uuid',
        },
        {
          name: 'role',
          type: 'enum',
          enum: ['owner', 'admin', 'member'],
          default: "'member'",
        },
        {
          name: 'joined_at',
          type: 'timestamp',
          default: 'now()',
        },
      ],
      foreignKeys: [
        {
          columnNames: ['communityId'],
          referencedTableName: 'yaksa_forum_community',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
        {
          columnNames: ['userId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    }), true);

    // Create unique index for community membership
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_YAKSA_COMMUNITY_MEMBER_UNIQUE" ON "yaksa_forum_community_member" ("communityId", "userId")`
    );

    // Create index for role-based queries
    await queryRunner.query(
      `CREATE INDEX "IDX_YAKSA_COMMUNITY_MEMBER_ROLE" ON "yaksa_forum_community_member" ("communityId", "role")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('yaksa_forum_community_member');
    await queryRunner.dropTable('yaksa_forum_community');
  }
}
