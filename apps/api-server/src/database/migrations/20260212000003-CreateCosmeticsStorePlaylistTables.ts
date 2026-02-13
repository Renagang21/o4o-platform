/**
 * Migration: Create Cosmetics Store Playlist Tables
 *
 * WO-KCOS-STORES-PHASE4-SIGNAGE-INTEGRATION-V1
 *
 * Creates:
 * - cosmetics.cosmetics_store_playlists (store-level signage playlists)
 * - cosmetics.cosmetics_store_playlist_items (playlist item references)
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCosmeticsStorePlaylistTables20260212000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure schema exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS cosmetics`);

    // 1. cosmetics_store_playlists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_store_playlists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_id UUID NOT NULL,
        name VARCHAR(200) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_csp_store FOREIGN KEY (store_id)
          REFERENCES cosmetics.cosmetics_stores(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_csp_store_id ON cosmetics.cosmetics_store_playlists (store_id)`,
    );

    // 2. cosmetics_store_playlist_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_store_playlist_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        playlist_id UUID NOT NULL,
        asset_type VARCHAR(50) NOT NULL,
        reference_id UUID NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_cspi_playlist FOREIGN KEY (playlist_id)
          REFERENCES cosmetics.cosmetics_store_playlists(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_cspi_playlist_id ON cosmetics.cosmetics_store_playlist_items (playlist_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_cspi_playlist_sort ON cosmetics.cosmetics_store_playlist_items (playlist_id, sort_order)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_store_playlist_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_store_playlists`);
  }
}
