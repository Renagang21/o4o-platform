import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlaylistTagsColumn20260425100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add tags column
    await queryRunner.query(
      `ALTER TABLE signage_playlists ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'`
    );

    // 2. Backfill from metadata->'tags' where available
    await queryRunner.query(`
      UPDATE signage_playlists
      SET tags = ARRAY(SELECT jsonb_array_elements_text(metadata->'tags'))
      WHERE metadata ? 'tags'
        AND jsonb_typeof(metadata->'tags') = 'array'
        AND jsonb_array_length(metadata->'tags') > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE signage_playlists DROP COLUMN IF EXISTS tags`
    );
  }
}
