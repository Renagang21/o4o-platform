/**
 * Migration: Add FK constraint glycopharm_pharmacies.id → kpa_organizations.id
 *
 * WO-PHARMACY-TREE-PHYSICAL-INTEGRITY-FIX-V1 — Phase 2
 *
 * IR-PHARMACY-HUB-TREE-INTEGRITY-VALIDATION-V1 발견사항 E1 (HIGH):
 * checkout.controller.ts에서 pharmacy.id를 organization_id로 직접 사용하나
 * DB 레벨 보장 없음.
 *
 * PK 공유 구조: glycopharm_pharmacies.id는 반드시 kpa_organizations.id여야 함.
 * ON DELETE CASCADE: organization 제거 시 pharmacy도 제거.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFkPharmacyOrganization20260215300002 implements MigrationInterface {
  name = 'AddFkPharmacyOrganization20260215300002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety: check for pharmacies without matching organization
    const orphans = await queryRunner.query(`
      SELECT p.id, p.name
      FROM glycopharm_pharmacies p
      LEFT JOIN kpa_organizations o ON o.id = p.id
      WHERE o.id IS NULL
    `);

    if (orphans.length > 0) {
      console.warn(
        `[Migration] Found ${orphans.length} pharmacy(ies) without matching kpa_organization:`,
        orphans.map((o: { id: string; name: string }) => `${o.id} (${o.name})`)
      );
      // Do NOT auto-delete pharmacies — this is a critical data issue.
      // Instead, skip FK creation and log clearly.
      console.error(
        '[Migration] SKIPPING FK creation — orphan pharmacies must be resolved manually.'
      );
      return;
    }

    // Check if FK already exists
    const fkExists = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'glycopharm_pharmacies'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'FK_pharmacy_organization'
    `);

    if (fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "glycopharm_pharmacies"
        ADD CONSTRAINT "FK_pharmacy_organization"
        FOREIGN KEY ("id")
        REFERENCES "kpa_organizations"("id")
        ON DELETE CASCADE
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "glycopharm_pharmacies"
      DROP CONSTRAINT IF EXISTS "FK_pharmacy_organization"
    `);
  }
}
