import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive only; no production execution is part of the authoring work. */
export class AddStorePlaylistTags1793857542325 implements MigrationInterface {
  name = 'AddStorePlaylistTags1793857542325';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE store_playlists ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE store_playlists ADD COLUMN client_request_id uuid NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IDX_store_playlist_request ON store_playlists (organization_id, client_request_id)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const [row] = await queryRunner.query(`SELECT EXISTS(SELECT 1 FROM store_playlists WHERE cardinality(tags) > 0 OR client_request_id IS NOT NULL) AS used`);
    if (row.used) throw new Error('PLAYLIST_AUTHORING_METADATA_REQUIRES_REVIEW');
    await queryRunner.query(`DROP INDEX IDX_store_playlist_request`);
    await queryRunner.query(`ALTER TABLE store_playlists DROP COLUMN client_request_id`);
    await queryRunner.query(`ALTER TABLE store_playlists DROP COLUMN IF EXISTS tags`);
  }
}
