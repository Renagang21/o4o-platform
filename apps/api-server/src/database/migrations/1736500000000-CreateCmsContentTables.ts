/**
 * Migration: CreateCmsContentTables
 *
 * WO-P2-IMPLEMENT-CONTENT: Create CmsContent and CmsContentSlot tables
 * for multi-service content management.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCmsContentTables1736500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if cms_contents table already exists
    const hasCmsContents = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'cms_contents'
    `);

    if (hasCmsContents.length === 0) {
      // Create cms_contents table
      await queryRunner.query(`
        CREATE TABLE cms_contents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "organizationId" UUID,
          "serviceKey" VARCHAR(50),
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          summary TEXT,
          body TEXT,
          "imageUrl" VARCHAR(500),
          "linkUrl" VARCHAR(500),
          "linkText" VARCHAR(100),
          status VARCHAR(20) NOT NULL DEFAULT 'draft',
          "publishedAt" TIMESTAMP,
          "expiresAt" TIMESTAMP,
          "sortOrder" INT NOT NULL DEFAULT 0,
          "isPinned" BOOLEAN NOT NULL DEFAULT false,
          "isOperatorPicked" BOOLEAN NOT NULL DEFAULT false,
          metadata JSONB NOT NULL DEFAULT '{}',
          "createdBy" UUID,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for cms_contents
      await queryRunner.query(`
        CREATE INDEX idx_cms_contents_scope ON cms_contents("serviceKey", "organizationId", status)
      `);
      await queryRunner.query(`
        CREATE INDEX idx_cms_contents_type ON cms_contents(type, status)
      `);
      await queryRunner.query(`
        CREATE INDEX idx_cms_contents_published ON cms_contents(status, "publishedAt")
      `);
      await queryRunner.query(`
        CREATE INDEX idx_cms_contents_organization ON cms_contents("organizationId")
      `);
      await queryRunner.query(`
        CREATE INDEX idx_cms_contents_service ON cms_contents("serviceKey")
      `);
    }

    // Check if cms_content_slots table already exists
    const hasCmsContentSlots = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'cms_content_slots'
    `);

    if (hasCmsContentSlots.length === 0) {
      // Create cms_content_slots table
      await queryRunner.query(`
        CREATE TABLE cms_content_slots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "organizationId" UUID,
          "serviceKey" VARCHAR(50),
          "slotKey" VARCHAR(100) NOT NULL,
          "contentId" UUID NOT NULL REFERENCES cms_contents(id) ON DELETE CASCADE,
          "sortOrder" INT NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "startsAt" TIMESTAMP,
          "endsAt" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for cms_content_slots
      await queryRunner.query(`
        CREATE INDEX idx_cms_content_slots_lookup ON cms_content_slots("slotKey", "serviceKey", "isActive")
      `);
      await queryRunner.query(`
        CREATE INDEX idx_cms_content_slots_content ON cms_content_slots("contentId")
      `);
      await queryRunner.query(`
        CREATE INDEX idx_cms_content_slots_organization ON cms_content_slots("organizationId")
      `);
      await queryRunner.query(`
        CREATE INDEX idx_cms_content_slots_service ON cms_content_slots("serviceKey")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop cms_content_slots first (has FK to cms_contents)
    await queryRunner.query(`DROP TABLE IF EXISTS cms_content_slots`);
    await queryRunner.query(`DROP TABLE IF EXISTS cms_contents`);
  }
}
