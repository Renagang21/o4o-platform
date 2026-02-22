import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1
 *
 * Store 중심 Playlist 모델:
 * - store_playlists: 매장 플레이리스트 (SINGLE | LIST)
 * - store_playlist_items: 플레이리스트 항목 (snapshot 기반)
 */
export class CreateStorePlaylistTables20260222600000 implements MigrationInterface {
  name = 'CreateStorePlaylistTables20260222600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── store_playlists ──
    await queryRunner.query(`
      CREATE TABLE "store_playlists" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "playlist_type" varchar(20) NOT NULL DEFAULT 'LIST',
        "publish_status" varchar(20) NOT NULL DEFAULT 'draft',
        "is_active" boolean NOT NULL DEFAULT true,
        "source_playlist_id" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_playlists" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_playlists_org" ON "store_playlists" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_playlists_status" ON "store_playlists" ("publish_status")
        WHERE "is_active" = true
    `);

    // ── store_playlist_items ──
    await queryRunner.query(`
      CREATE TABLE "store_playlist_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "playlist_id" uuid NOT NULL,
        "snapshot_id" uuid NOT NULL,
        "display_order" int NOT NULL DEFAULT 0,
        "is_forced" boolean NOT NULL DEFAULT false,
        "is_locked" boolean NOT NULL DEFAULT false,
        "forced_start_at" timestamp,
        "forced_end_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_playlist_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_store_playlist_items_playlist"
          FOREIGN KEY ("playlist_id") REFERENCES "store_playlists"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_playlist_items_playlist_order"
        ON "store_playlist_items" ("playlist_id", "display_order")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_playlist_items_forced"
        ON "store_playlist_items" ("playlist_id", "is_forced")
        WHERE "is_forced" = true
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_playlist_items_snapshot"
        ON "store_playlist_items" ("snapshot_id")
    `);

    console.log('[CreateStorePlaylistTables] Tables and indexes created successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "store_playlist_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_playlists"`);
  }
}
