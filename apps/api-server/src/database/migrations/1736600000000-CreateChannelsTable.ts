/**
 * Migration: CreateChannelsTable
 *
 * WO-P4-CHANNEL-IMPLEMENT-P0: Create channels table for content distribution
 *
 * Channels represent "where CMS content is displayed" - the output context
 * that connects CMS Slots to physical/virtual destinations (TV, kiosk, web, signage).
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChannelsTable1736600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if channels table already exists
    const hasChannels = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'channels'
    `);

    if (hasChannels.length === 0) {
      // Create channels table
      await queryRunner.query(`
        CREATE TABLE channels (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Scope
          "organizationId" UUID,
          "serviceKey" VARCHAR(50),

          -- Identity
          name VARCHAR(100) NOT NULL,
          code VARCHAR(50),
          description TEXT,

          -- Type
          type VARCHAR(30) NOT NULL,

          -- CMS Binding (loose coupling via slotKey)
          "slotKey" VARCHAR(100) NOT NULL,

          -- Status
          status VARCHAR(20) NOT NULL DEFAULT 'active',

          -- Display Options
          resolution VARCHAR(20),
          orientation VARCHAR(20) DEFAULT 'landscape',
          autoplay BOOLEAN DEFAULT TRUE,
          "refreshIntervalSec" INTEGER,
          "defaultDurationSec" INTEGER DEFAULT 10,

          -- Location
          location VARCHAR(255),

          -- Metadata
          metadata JSONB DEFAULT '{}',

          -- Audit
          "createdBy" UUID,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          -- Constraints
          CONSTRAINT chk_channels_type CHECK (type IN ('tv', 'kiosk', 'signage', 'web')),
          CONSTRAINT chk_channels_status CHECK (status IN ('active', 'inactive', 'maintenance')),
          CONSTRAINT chk_channels_orientation CHECK (orientation IN ('landscape', 'portrait'))
        )
      `);

      // Create indexes
      await queryRunner.query(`
        CREATE INDEX idx_channels_scope ON channels ("serviceKey", "organizationId", status)
      `);
      await queryRunner.query(`
        CREATE INDEX idx_channels_slot ON channels ("slotKey", status)
      `);
      await queryRunner.query(`
        CREATE INDEX idx_channels_type ON channels (type, status)
      `);
      await queryRunner.query(`
        CREATE INDEX idx_channels_code ON channels (code) WHERE code IS NOT NULL
      `);
      await queryRunner.query(`
        CREATE INDEX idx_channels_organization ON channels ("organizationId") WHERE "organizationId" IS NOT NULL
      `);
      await queryRunner.query(`
        CREATE INDEX idx_channels_service ON channels ("serviceKey") WHERE "serviceKey" IS NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS channels`);
  }
}
