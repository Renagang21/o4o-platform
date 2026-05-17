/**
 * BackfillKpaStoreOwnerForTestUsers
 *
 * WO-O4O-KPA-STOREOWNER-ROLE-BACKFILL-V1
 *
 * pharmacy_owner 인데 kpa:store_owner role 이 부재한 test 사용자 2 명 backfill.
 * IR-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1 의 실측 결과를 입력으로 사용.
 *
 * 정책 결정 입력:
 *   - Q1 = B (bizno 보정 후 backfill — sohae2100 은 별도 fake bizno 로 분리)
 *   - Q2 = B (sohae2100 placeholder businessName "Sohae 약국" 보정)
 *
 * 대상:
 *   1) renagang21@gmail.com — businessNumber 1089999999, businessName "Renagang 약국" (변경 없음)
 *   2) sohae2100@gmail.com  — businessNumber 1089999999 → 2189999999, businessName (empty) → "Sohae 약국"
 *
 * 각각 독립 organization 으로 backfill:
 *   - kpa-pharm-1089999999 (renagang21)
 *   - kpa-pharm-2189999999 (sohae2100)
 *
 * 패턴 출처:
 *   - 자동 부여 chain: member.controller.ts:586-614
 *   - 유사 backfill: 20260331100000-BackfillGlycopharmPharmacyOrganizations
 *
 * 멱등성: 모든 step ON CONFLICT / NOT EXISTS 가드. 재실행 무해.
 * sohae2100 businessInfo 정규화는 현재 drift state (bizno=1089999999) 일 때만 수행.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

interface BackfillTarget {
  email: string;
  expectedBizno: string;    // backfill 후 최종 bizno
  pharmacyName: string;     // backfill 후 최종 businessName
  normalizeFrom?: string;   // 현재 businessNumber 가 이 값이면 expectedBizno 로 정규화
  normalizeNameTo?: string; // 현재 businessName 이 비어있으면 이 값으로 보정
}

const TARGETS: BackfillTarget[] = [
  {
    email: 'renagang21@gmail.com',
    expectedBizno: '1089999999',
    pharmacyName: 'Renagang 약국',
  },
  {
    email: 'sohae2100@gmail.com',
    expectedBizno: '2189999999',
    pharmacyName: 'Sohae 약국',
    normalizeFrom: '1089999999',
    normalizeNameTo: 'Sohae 약국',
  },
];

export class BackfillKpaStoreOwnerForTestUsers20261020000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const t of TARGETS) {
      const [userRow] = await queryRunner.query(
        `SELECT id, "businessInfo" FROM users WHERE email = $1 LIMIT 1`,
        [t.email],
      );
      if (!userRow) {
        console.warn(`[Backfill V1] user not found: ${t.email} — skip`);
        continue;
      }
      const userId: string = userRow.id;

      // Step A — sohae2100: businessInfo 정규화 (drift state 한정 idempotent)
      if (t.normalizeFrom && t.normalizeNameTo) {
        const currentBiz = (userRow.businessInfo && typeof userRow.businessInfo === 'object')
          ? userRow.businessInfo as Record<string, unknown>
          : {};
        const currentBizno = typeof currentBiz.businessNumber === 'string'
          ? currentBiz.businessNumber.replace(/[^0-9]/g, '')
          : '';
        if (currentBizno === t.normalizeFrom) {
          await queryRunner.query(
            `UPDATE users
             SET "businessInfo" = jsonb_set(
                                    jsonb_set(
                                      COALESCE("businessInfo", '{}'::jsonb),
                                      '{businessNumber}', to_jsonb($2::text)
                                    ),
                                    '{businessName}', to_jsonb($3::text)
                                  ),
                 "updatedAt" = NOW()
             WHERE id = $1`,
            [userId, t.expectedBizno, t.normalizeNameTo],
          );
          console.log(`[Backfill V1] ${t.email}: normalized businessInfo (bizno ${t.normalizeFrom} → ${t.expectedBizno})`);
        } else {
          console.log(`[Backfill V1] ${t.email}: businessInfo already normalized or different state (bizno=${currentBizno}) — skip normalize`);
        }
      }

      // Step B — organization ensure (멱등 — code UNIQUE)
      const orgCode = `kpa-pharm-${t.expectedBizno}`;
      const orgInsertResult = await queryRunner.query(
        `INSERT INTO organizations (id, name, code, type, level, path, "isActive", created_by_user_id, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'pharmacy', 0, $3, true, $4, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET "updatedAt" = NOW()
         RETURNING id`,
        [t.pharmacyName, orgCode, `/${orgCode}`, userId],
      );
      const orgId: string = orgInsertResult[0].id;
      console.log(`[Backfill V1] ${t.email}: organization ensure (${orgCode}, id=${orgId})`);

      // Step C — kpa_members.organization_id 보정 (NULL 인 경우만)
      const kmUpdate = await queryRunner.query(
        `UPDATE kpa_members
         SET organization_id = $1, updated_at = NOW()
         WHERE user_id = $2 AND organization_id IS NULL`,
        [orgId, userId],
      );
      if (kmUpdate?.[1] > 0) {
        console.log(`[Backfill V1] ${t.email}: kpa_members.organization_id linked`);
      }

      // Step D — organization_members(role=owner) (멱등 — UQ_org_member_org_user)
      await queryRunner.query(
        `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'owner', false, NOW(), NOW(), NOW())
         ON CONFLICT ON CONSTRAINT "UQ_org_member_org_user" DO NOTHING`,
        [orgId, userId],
      );
      console.log(`[Backfill V1] ${t.email}: organization_members(owner) ensure`);

      // Step E — role_assignments(kpa:store_owner, active) (멱등 — unique_active_role_per_user)
      // assigned_by 는 uuid (nullable) — system migration 이므로 NULL 사용.
      // (WO trail 은 본 마이그레이션 파일명 / commit message 로 추적 가능)
      await queryRunner.query(
        `INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
         VALUES ($1, 'kpa:store_owner', NULL, true, NOW(), NOW(), NOW())
         ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO UPDATE
           SET is_active = true,
               updated_at = NOW(),
               valid_from = COALESCE(role_assignments.valid_from, NOW())`,
        [userId],
      );
      console.log(`[Backfill V1] ${t.email}: role_assignments(kpa:store_owner) ensure`);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Backfill forward-only — revert 없음 (의도적).
    // test 데이터 복원 의미 없음 + 운영 회원의 정상 부여 분과 구분 불가.
  }
}
