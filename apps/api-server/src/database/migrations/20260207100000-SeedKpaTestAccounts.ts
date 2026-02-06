/**
 * Migration: SeedKpaTestAccounts
 *
 * WO-KPA-SOCIETY-DATA-SEED-V1.1
 *
 * Creates 70 test accounts for KPA Society alpha testing:
 * - 4 KPA organizations (본회, 지부, 분회 x2)
 * - 65 pharmacist accounts (yaksa01~65@o4o.com)
 * - 5 student accounts (student01~05@o4o.com)
 * - 70 kpa_members linking users to organizations
 *
 * Common password: kpaPass1
 * Idempotent: skips existing accounts/orgs
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

const TEST_PASSWORD = 'kpaPass1';

// Fixed UUIDs for organizations (deterministic for reference consistency)
const ORG_IDS = {
  ASSOCIATION: 'a0000000-0a00-4000-a000-000000000001',   // 대한약사회
  SEOUL_BRANCH: 'a0000000-0a00-4000-a000-000000000002',  // 서울특별시약사회
  JONGNO_GROUP: 'a0000000-0a00-4000-a000-000000000003',  // 종로구약사회
  GANGNAM_GROUP: 'a0000000-0a00-4000-a000-000000000004',  // 강남구약사회
};

interface TestUser {
  email: string;
  name: string;
  roles: string;
  pharmacistFunction: string | null;
  pharmacistRole: string | null;
  orgId: string;
  membershipType: 'pharmacist' | 'student';
  licenseNumber: string | null;
  pharmacyName: string | null;
  pharmacyAddress: string | null;
  universityName: string | null;
  studentYear: number | null;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function generateTestUsers(): TestUser[] {
  const users: TestUser[] = [];

  // yaksa01-15: 개국약사 → 종로구약사회
  for (let i = 1; i <= 15; i++) {
    users.push({
      email: `yaksa${pad(i)}@o4o.com`,
      name: `테스트약사${pad(i)}`,
      roles: `ARRAY['kpa:pharmacist']::text[]`,
      pharmacistFunction: 'pharmacy',
      pharmacistRole: 'pharmacy_owner',
      orgId: ORG_IDS.JONGNO_GROUP,
      membershipType: 'pharmacist',
      licenseNumber: `LIC-2024-${pad(i)}`,
      pharmacyName: `종로약국${pad(i)}`,
      pharmacyAddress: '서울시 종로구',
      universityName: null,
      studentYear: null,
    });
  }

  // yaksa16-30: 개국약사 → 강남구약사회
  for (let i = 16; i <= 30; i++) {
    users.push({
      email: `yaksa${pad(i)}@o4o.com`,
      name: `테스트약사${pad(i)}`,
      roles: `ARRAY['kpa:pharmacist']::text[]`,
      pharmacistFunction: 'pharmacy',
      pharmacistRole: 'pharmacy_owner',
      orgId: ORG_IDS.GANGNAM_GROUP,
      membershipType: 'pharmacist',
      licenseNumber: `LIC-2024-${pad(i)}`,
      pharmacyName: `강남약국${pad(i - 15)}`,
      pharmacyAddress: '서울시 강남구',
      universityName: null,
      studentYear: null,
    });
  }

  // yaksa31-40: 근무약사 → 대한약사회
  for (let i = 31; i <= 40; i++) {
    users.push({
      email: `yaksa${pad(i)}@o4o.com`,
      name: `테스트약사${pad(i)}`,
      roles: `ARRAY['kpa:pharmacist']::text[]`,
      pharmacistFunction: 'pharmacy',
      pharmacistRole: 'general',
      orgId: ORG_IDS.ASSOCIATION,
      membershipType: 'pharmacist',
      licenseNumber: `LIC-2024-${pad(i)}`,
      pharmacyName: null,
      pharmacyAddress: null,
      universityName: null,
      studentYear: null,
    });
  }

  // yaksa41-50: 산업약사 → 대한약사회
  for (let i = 41; i <= 50; i++) {
    users.push({
      email: `yaksa${pad(i)}@o4o.com`,
      name: `테스트약사${pad(i)}`,
      roles: `ARRAY['kpa:pharmacist']::text[]`,
      pharmacistFunction: 'industry',
      pharmacistRole: 'general',
      orgId: ORG_IDS.ASSOCIATION,
      membershipType: 'pharmacist',
      licenseNumber: `LIC-2024-${pad(i)}`,
      pharmacyName: null,
      pharmacyAddress: null,
      universityName: null,
      studentYear: null,
    });
  }

  // yaksa51-60: 병원약사 → 대한약사회
  for (let i = 51; i <= 60; i++) {
    users.push({
      email: `yaksa${pad(i)}@o4o.com`,
      name: `테스트약사${pad(i)}`,
      roles: `ARRAY['kpa:pharmacist']::text[]`,
      pharmacistFunction: 'hospital',
      pharmacistRole: 'hospital',
      orgId: ORG_IDS.ASSOCIATION,
      membershipType: 'pharmacist',
      licenseNumber: `LIC-2024-${pad(i)}`,
      pharmacyName: null,
      pharmacyAddress: null,
      universityName: null,
      studentYear: null,
    });
  }

  // yaksa61-65: 미분류 약사 → 대한약사회
  for (let i = 61; i <= 65; i++) {
    users.push({
      email: `yaksa${pad(i)}@o4o.com`,
      name: `테스트약사${pad(i)}`,
      roles: `ARRAY['kpa:pharmacist']::text[]`,
      pharmacistFunction: null,
      pharmacistRole: null,
      orgId: ORG_IDS.ASSOCIATION,
      membershipType: 'pharmacist',
      licenseNumber: null,
      pharmacyName: null,
      pharmacyAddress: null,
      universityName: null,
      studentYear: null,
    });
  }

  // student01-05: 약대생 → 대한약사회
  for (let i = 1; i <= 5; i++) {
    users.push({
      email: `student${pad(i)}@o4o.com`,
      name: `테스트학생${pad(i)}`,
      roles: `ARRAY['kpa:student']::text[]`,
      pharmacistFunction: null,
      pharmacistRole: null,
      orgId: ORG_IDS.ASSOCIATION,
      membershipType: 'student',
      licenseNumber: null,
      pharmacyName: null,
      pharmacyAddress: null,
      universityName: '서울대학교 약학대학',
      studentYear: 3 + ((i - 1) % 3), // 3, 4, 5, 3, 4
    });
  }

  return users;
}

export class SeedKpaTestAccounts20260207100000 implements MigrationInterface {
  name = 'SeedKpaTestAccounts20260207100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[SEED] KPA Society Test Accounts - Starting...');

    // Step 1: Hash password
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    // Step 2: Seed organizations
    console.log('[SEED] Creating KPA organizations...');
    await queryRunner.query(`
      INSERT INTO kpa_organizations (id, name, type, parent_id, description, is_active, created_at, updated_at)
      VALUES
        ($1, '대한약사회', 'association', NULL, '대한약사회 본회 (테스트)', true, NOW(), NOW()),
        ($2, '서울특별시약사회', 'branch', $1, '서울특별시 지부 (테스트)', true, NOW(), NOW()),
        ($3, '종로구약사회', 'group', $2, '종로구 분회 (테스트)', true, NOW(), NOW()),
        ($4, '강남구약사회', 'group', $2, '강남구 분회 (테스트)', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [ORG_IDS.ASSOCIATION, ORG_IDS.SEOUL_BRANCH, ORG_IDS.JONGNO_GROUP, ORG_IDS.GANGNAM_GROUP]);
    console.log('[SEED] Organizations created (4)');

    // Step 3: Seed users and members
    const testUsers = generateTestUsers();
    let createdUsers = 0;
    let createdMembers = 0;

    for (const user of testUsers) {
      // Check if user already exists
      const existing = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`,
        [user.email]
      );

      let userId: string;

      if (existing.length > 0) {
        userId = existing[0].id;
        console.log(`[SEED] User already exists: ${user.email}, skipping user creation`);
      } else {
        // Create user
        const result = await queryRunner.query(
          `INSERT INTO users (
            id, email, password, name, role, roles, status,
            "isActive", "isEmailVerified", domain, service_key,
            pharmacist_function, pharmacist_role,
            permissions, "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, 'user', ${user.roles}, 'active',
            true, true, 'kpa-society.co.kr', 'kpa-society',
            $4, $5,
            '[]', NOW(), NOW()
          ) RETURNING id`,
          [
            user.email,
            hashedPassword,
            user.name,
            user.pharmacistFunction,
            user.pharmacistRole,
          ]
        );
        userId = result[0].id;
        createdUsers++;
      }

      // Create kpa_member if not exists
      const existingMember = await queryRunner.query(
        `SELECT id FROM kpa_members WHERE user_id = $1 AND organization_id = $2`,
        [userId, user.orgId]
      );

      if (existingMember.length === 0) {
        await queryRunner.query(
          `INSERT INTO kpa_members (
            id, user_id, organization_id, role, status, membership_type,
            license_number, pharmacy_name, pharmacy_address,
            university_name, student_year,
            joined_at, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, 'member', 'active', $3,
            $4, $5, $6,
            $7, $8,
            CURRENT_DATE, NOW(), NOW()
          )`,
          [
            userId,
            user.orgId,
            user.membershipType,
            user.licenseNumber,
            user.pharmacyName,
            user.pharmacyAddress,
            user.universityName,
            user.studentYear,
          ]
        );
        createdMembers++;
      }
    }

    // Step 4: Summary
    console.log('');
    console.log('=== KPA Society Test Accounts Seed Complete ===');
    console.log(`  Organizations: 4`);
    console.log(`  Users created: ${createdUsers} / ${testUsers.length}`);
    console.log(`  Members created: ${createdMembers} / ${testUsers.length}`);
    console.log(`  Password: ${TEST_PASSWORD}`);
    console.log('');
    console.log('  Pharmacists (yaksa01-65@o4o.com):');
    console.log('    - yaksa01-15: 개국약사 → 종로구약사회 (KPA-c ✅)');
    console.log('    - yaksa16-30: 개국약사 → 강남구약사회 (KPA-c ✅)');
    console.log('    - yaksa31-40: 근무약사 → 대한약사회');
    console.log('    - yaksa41-50: 산업약사 → 대한약사회');
    console.log('    - yaksa51-60: 병원약사 → 대한약사회');
    console.log('    - yaksa61-65: 미분류 → 대한약사회');
    console.log('');
    console.log('  Students (student01-05@o4o.com):');
    console.log('    - student01-05: 약대생 → 대한약사회');
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[SEED] Cleaning up KPA test accounts...');

    // 1. Delete kpa_members for test users
    const memberResult = await queryRunner.query(`
      DELETE FROM kpa_members
      WHERE user_id IN (
        SELECT id FROM users
        WHERE email LIKE 'yaksa%@o4o.com' OR email LIKE 'student%@o4o.com'
      )
    `);
    console.log(`[SEED] Deleted kpa_members: ${memberResult?.[1] ?? 0} rows`);

    // 2. Delete test users
    const userResult = await queryRunner.query(`
      DELETE FROM users
      WHERE email LIKE 'yaksa%@o4o.com' OR email LIKE 'student%@o4o.com'
    `);
    console.log(`[SEED] Deleted users: ${userResult?.[1] ?? 0} rows`);

    // 3. Delete test organizations
    const orgResult = await queryRunner.query(`
      DELETE FROM kpa_organizations
      WHERE id IN ($1, $2, $3, $4)
    `, [ORG_IDS.ASSOCIATION, ORG_IDS.SEOUL_BRANCH, ORG_IDS.JONGNO_GROUP, ORG_IDS.GANGNAM_GROUP]);
    console.log(`[SEED] Deleted organizations: ${orgResult?.[1] ?? 0} rows`);

    console.log('[SEED] Cleanup complete');
  }
}
