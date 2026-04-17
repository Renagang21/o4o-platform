import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-SIGNAGE-DEAD-CODE-CLEANUP-V1
 *
 * Drop signage tables with zero rows and no write paths.
 *
 * Verified dead:
 *   - signage_playlist_shares  : no INSERT path in any service/controller
 *   - signage_analytics        : no INSERT path in any service/controller
 *   - signage_media_tags       : no INSERT path; mediaTags relation removed from SignageMedia
 *
 * Protected (NOT dropped): signage_media, signage_playlists, signage_playlist_items,
 *   signage_schedules, signage_templates, signage_ai_generation_logs, store_playlists
 */
export class DropSignageDeadTables20260417100000 implements MigrationInterface {
  name = 'DropSignageDeadTables20260417100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS signage_playlist_shares CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS signage_analytics CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS signage_media_tags CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Tables were empty — recreation requires re-running original migration:
    // 2026011700001-CreateSignageCoreEntities.ts
    console.warn('DropSignageDeadTables: down() is a no-op. Re-run CreateSignageCoreEntities to recreate.');
  }
}
