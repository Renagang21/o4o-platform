/**
 * Migration: AlignHubSlotKeys
 *
 * WO-O4O-HUB-CMS-SLOT-STRUCTURE-ALIGNMENT-V1
 *
 * Unifies service-specific Hub slot keys into common keys.
 * serviceKey on each row is preserved → service-level filtering still works.
 *
 * Before: kpa-hub-hero, glycopharm-hub-hero, kcos-hub-hero
 * After:  hub-hero (all three rows, distinguished by serviceKey)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignHubSlotKeys1708682400000 implements MigrationInterface {
  name = 'AlignHubSlotKeys1708682400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Unify hero slot keys
    await queryRunner.query(`
      UPDATE cms_content_slots
      SET "slotKey" = 'hub-hero'
      WHERE "slotKey" IN ('kpa-hub-hero', 'glycopharm-hub-hero', 'kcos-hub-hero')
    `);

    // Unify promo slot keys
    await queryRunner.query(`
      UPDATE cms_content_slots
      SET "slotKey" = 'hub-promotion'
      WHERE "slotKey" IN ('kpa-hub-promo', 'glycopharm-hub-promo', 'kcos-hub-promo')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore service-specific hero slot keys
    await queryRunner.query(`
      UPDATE cms_content_slots
      SET "slotKey" = 'kpa-hub-hero'
      WHERE "slotKey" = 'hub-hero' AND "serviceKey" = 'kpa'
    `);
    await queryRunner.query(`
      UPDATE cms_content_slots
      SET "slotKey" = 'glycopharm-hub-hero'
      WHERE "slotKey" = 'hub-hero' AND "serviceKey" = 'glycopharm'
    `);
    await queryRunner.query(`
      UPDATE cms_content_slots
      SET "slotKey" = 'kcos-hub-hero'
      WHERE "slotKey" = 'hub-hero' AND "serviceKey" = 'cosmetics'
    `);

    // Restore service-specific promo slot keys
    await queryRunner.query(`
      UPDATE cms_content_slots
      SET "slotKey" = 'kpa-hub-promo'
      WHERE "slotKey" = 'hub-promotion' AND "serviceKey" = 'kpa'
    `);
    await queryRunner.query(`
      UPDATE cms_content_slots
      SET "slotKey" = 'glycopharm-hub-promo'
      WHERE "slotKey" = 'hub-promotion' AND "serviceKey" = 'glycopharm'
    `);
    await queryRunner.query(`
      UPDATE cms_content_slots
      SET "slotKey" = 'kcos-hub-promo'
      WHERE "slotKey" = 'hub-promotion' AND "serviceKey" = 'cosmetics'
    `);
  }
}
