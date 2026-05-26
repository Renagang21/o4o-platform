import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-COSMETICS-ORG-ENROLLMENT-BACKFILL-V1
 *
 * 이미 승인되어 운영 중인 K-Cosmetics 스토어의 organization_service_enrollments 백필.
 *
 * 배경:
 *   - WO-O4O-COSMETICS-ORG-REUSE-AND-ENROLLMENT-V1 (commit f5a5d63c2) 이전에 승인된 cosmetics_stores 는
 *     organization_id 는 보유하지만 organization_service_enrollments 에 'k-cosmetics' 등록이 누락.
 *   - 신규 승인은 reviewApplication 에서 organizationOpsService.enrollService('k-cosmetics') 호출하므로 정상.
 *   - 본 migration 은 기존 운영 데이터에 한정한 1회성 백필.
 *
 * service_code 명칭:
 *   - 'k-cosmetics' (canonical) — service_memberships 정규화(20260929000000) 와 일관성 유지.
 *   - membership-guard 의 SCOPE_TO_MEMBERSHIP_KEY['cosmetics']='k-cosmetics' 매핑 기준.
 *
 * 절차:
 *   1. 사전 진단 — 누락 enrollment 카운트 + organization_id NULL legacy 카운트
 *   2. INSERT...SELECT...WHERE NOT EXISTS — 누락 enrollment 만 추가
 *   3. UNIQUE (organization_id, service_code) + ON CONFLICT DO NOTHING — 멱등 보장
 *   4. 사후 검증 — 잔존 누락 카운트
 *
 * 처리 제외:
 *   - organization_id IS NULL legacy row — 이번 백필에서 무리하게 organization 생성하지 않음 (별도 추적/보고만)
 *   - cosmetics_stores 자체 / role_assignments / service_memberships — 변경 없음
 *
 * 멱등성:
 *   재실행 안전. 이미 모든 enrollment 가 등록되어 있으면 영향 0건.
 *
 * 참조 패턴:
 *   - SeedNetureOrgEnrollments1711444200000 (WHERE NOT EXISTS + INSERT SELECT)
 *   - NormalizeServiceMembershipsCosmeticsKey20260929000000 (진단 카운트 로깅 패턴)
 */
export class BackfillCosmeticsServiceEnrollments20260930000000 implements MigrationInterface {
  name = 'BackfillCosmeticsServiceEnrollments20260930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: cosmetics_stores 테이블 부재 환경(일부 dev DB)에서는 no-op
    const hasTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cosmetics' AND table_name = 'cosmetics_stores'
      ) AS exists
    `);
    if (!hasTable[0]?.exists) {
      console.log('[Migration] BackfillCosmeticsServiceEnrollments: cosmetics.cosmetics_stores not found — no-op');
      return;
    }

    // ─── 1. 사전 진단 ───────────────────────────────────────────
    const missingRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS missing_count
      FROM cosmetics.cosmetics_stores cs
      WHERE cs.status = 'approved'
        AND cs.organization_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM organization_service_enrollments e
          WHERE e.organization_id = cs.organization_id
            AND e.service_code = 'k-cosmetics'
        )
    `);
    const missingCount: number = missingRows[0]?.missing_count ?? 0;

    const orphanRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS orphan_count
      FROM cosmetics.cosmetics_stores cs
      WHERE cs.status = 'approved'
        AND cs.organization_id IS NULL
    `);
    const orphanCount: number = orphanRows[0]?.orphan_count ?? 0;

    console.log(`[Migration] BackfillCosmeticsServiceEnrollments: pre-check — missing=${missingCount}, orphan_null_org_id=${orphanCount}`);

    if (orphanCount > 0) {
      console.warn(
        `[Migration] BackfillCosmeticsServiceEnrollments: ${orphanCount} approved cosmetics_stores have NULL organization_id — NOT backfilled (out of scope, requires separate organization creation)`,
      );
    }

    if (missingCount === 0) {
      console.log('[Migration] BackfillCosmeticsServiceEnrollments: no-op (no missing enrollments)');
      return;
    }

    // ─── 2. INSERT...SELECT...ON CONFLICT DO NOTHING ──────────
    // organization_service_enrollments 의 (organization_id, service_code) UNIQUE 제약 +
    // ON CONFLICT DO NOTHING 으로 멱등 처리. WHERE NOT EXISTS 는 진단 카운트와 일치시키는 사전 필터.
    const insertResult = await queryRunner.query(`
      INSERT INTO organization_service_enrollments (
        organization_id,
        service_code,
        status
      )
      SELECT
        cs.organization_id,
        'k-cosmetics',
        'active'
      FROM cosmetics.cosmetics_stores cs
      WHERE cs.status = 'approved'
        AND cs.organization_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM organization_service_enrollments e
          WHERE e.organization_id = cs.organization_id
            AND e.service_code = 'k-cosmetics'
        )
      ON CONFLICT (organization_id, service_code) DO NOTHING
    `);
    const insertedCount = Array.isArray(insertResult)
      ? insertResult.length
      : (insertResult as { rowCount?: number }).rowCount ?? 0;
    console.log(`[Migration] BackfillCosmeticsServiceEnrollments: inserted ${insertedCount} 'k-cosmetics' enrollment(s)`);

    // ─── 3. 사후 검증 ───────────────────────────────────────────
    const afterRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS remaining
      FROM cosmetics.cosmetics_stores cs
      WHERE cs.status = 'approved'
        AND cs.organization_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM organization_service_enrollments e
          WHERE e.organization_id = cs.organization_id
            AND e.service_code = 'k-cosmetics'
        )
    `);
    const remaining: number = afterRows[0]?.remaining ?? 0;
    console.log(
      `[Migration] BackfillCosmeticsServiceEnrollments: DONE — inserted=${insertedCount}, remaining_missing=${remaining}, orphan_null_org_id=${orphanCount}`,
    );

    if (remaining > 0) {
      // 정상 흐름에서는 도달 불가 (INSERT 가 모든 missing 처리). 안전 가드.
      console.warn(
        `[Migration] BackfillCosmeticsServiceEnrollments: WARNING — ${remaining} approved stores still missing enrollment after backfill`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // down() no-op — 백필이 만든 row 만 정확히 식별할 metadata 가 없고,
    // 임의 DELETE 시 운영 가드 (membership / role guard) 가 다시 차단될 수 있어 안전상 명시적 no-op.
    console.log(
      '[Migration] BackfillCosmeticsServiceEnrollments down: no-op (cannot safely identify backfilled rows without metadata)',
    );
  }
}
