import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class CreateForumPostLikeTable2026020600001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Skip if table already exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'forum_post_like'
      ) AS "exists";
    `);
    if (tableExists[0]?.exists) {
      console.log('[CreateForumPostLikeTable] Table already exists, skipping.');
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'forum_post_like',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'post_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'forum_post_like',
      new TableIndex({ columnNames: ['post_id'] }),
    );

    await queryRunner.createIndex(
      'forum_post_like',
      new TableIndex({ columnNames: ['user_id'] }),
    );

    await queryRunner.createUniqueConstraint(
      'forum_post_like',
      new TableUnique({ columnNames: ['post_id', 'user_id'] }),
    );

    console.log('[CreateForumPostLikeTable] Created forum_post_like table.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('forum_post_like', true);
  }
}
