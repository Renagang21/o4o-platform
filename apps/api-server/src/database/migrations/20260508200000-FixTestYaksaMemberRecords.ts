/**
 * Migration: FixTestYaksaMemberRecords
 *
 * WO-KPA-TEST-MEMBER-SEED-FIX-V1
 *
 * test-yaksa04@o4o.com and test-yaksa05@o4o.com have users, role_assignments,
 * and service_memberships, but are missing kpa_members records.
 * This causes the KPA member management UI to show only 2 members.
 *
 * Idempotent: skips accounts without a users row, skips if kpa_members already exists.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

const ORG_JONGNO = 'a0000000-0a00-4000-a000-000000000003'; // 종로구약사회
const ORG_GANGNAM = 'a0000000-0a00-4000-a000-000000000004'; // 강남구약사회

const ACCOUNTS = [
  {
    email: 'test-yaksa04@o4o.com',
    orgId: ORG_JONGNO,
    license: 'TEST-P-004',
    pharmacyName: '테스트약국04',
    pharmacyAddress: '서울시 종로구',
    activityType: 'pharmacy_owner',
  },
  {
    email: 'test-yaksa05@o4o.com',
    orgId: ORG_GANGNAM,
    license: 'TEST-P-005',
    pharmacyName: '테스트약국05',
    pharmacyAddress: '서울시 강남구',
    activityType: 'pharmacy_owner',
  },
];

export class FixTestYaksaMemberRecords20260508200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    let created = 0;

    for (const account of ACCOUNTS) {
      const users = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [account.email],
      );
      if (users.length === 0) {
        console.log(`[FixTestYaksaMemberRecords] ${account.email} not found, skipping`);
        continue;
      }

      const userId = users[0].id;

      // UNIQUE constraint "UQ_kpa_members_user_id" — 1인 1회원
      const existing = await queryRunner.query(
        `SELECT id FROM kpa_members WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      if (existing.length > 0) {
        console.log(`[FixTestYaksaMemberRecords] ${account.email} already has kpa_members, skipping`);
        continue;
      }

      await queryRunner.query(
        `INSERT INTO kpa_members (
          user_id, organization_id, role, status, membership_type,
          license_number, pharmacy_name, pharmacy_address, activity_type,
          joined_at, created_at, updated_at
        ) VALUES ($1, $2, 'member', 'active', 'pharmacist', $3, $4, $5, $6, CURRENT_DATE, NOW(), NOW())
        ON CONFLICT ("user_id") DO NOTHING`,
        [userId, account.orgId, account.license, account.pharmacyName, account.pharmacyAddress, account.activityType],
      );
      created++;
      console.log(`[FixTestYaksaMemberRecords] Created kpa_members for ${account.email}`);
    }

    console.log(`[FixTestYaksaMemberRecords] Done. Records created: ${created}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const account of ACCOUNTS) {
      await queryRunner.query(
        `DELETE FROM kpa_members
         WHERE user_id = (SELECT id FROM users WHERE email = $1 LIMIT 1)`,
        [account.email],
      );
    }
  }
}
