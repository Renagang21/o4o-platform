import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NORMALIZE-COSMETICS-SERVICE-MEMBERSHIP-KEY-V1
 *
 * service_memberships.service_key='cosmetics' 인 legacy row 를 canonical key 'k-cosmetics' 로 정규화한다.
 *
 * 배경:
 *   - BackfillServiceMembershipsFromRoles20260318100000 가 role_assignments.role 의
 *     prefix(SPLIT_PART(role, ':', 1)) 를 그대로 service_key 로 저장.
 *     'cosmetics:admin' / 'cosmetics:operator' → service_key='cosmetics' row 생성 가능.
 *   - 그러나 backend membership-guard SCOPE_TO_MEMBERSHIP_KEY['cosmetics']='k-cosmetics' 매핑으로
 *     canonical key 는 'k-cosmetics'. 가드는 'k-cosmetics' 검색 → 'cosmetics' 키 row 는 통과 불가.
 *   - 결과: 백필 경로로 만들어진 cosmetics:admin / cosmetics:operator 계정이
 *     MembershipGate "서비스 가입이 필요합니다" 화면으로 차단 가능 (KPA와 동일 메커니즘).
 *
 * 본 migration 은 [20260928000000-NormalizeServiceMembershipsKpaKey.ts] 의 cosmetics 대응판.
 * KPA 사례와 동일 패턴 — IR-O4O-KPA-OPERATOR-ACCESS-GUARD-MEMBERSHIP-AUDIT-V1 §10 후속 WO.
 *
 * 신규 drift 생성 경로는 WO-O4O-ADMIN-OPERATOR-MEMBERSHIP-CANONICAL-KEY-FIX-V1 (2e533fba8) 에서
 * AdminUserController.ensureServiceMemberships() 의 ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY
 * 매핑 추가로 이미 차단됨 ('cosmetics' → 'k-cosmetics' 포함). 본 migration 은 기존 잔재 데이터 정리 전용.
 *
 * UNIQUE 제약 주의:
 *   service_memberships 는 (user_id, service_key) UNIQUE 제약 존재.
 *   같은 user 가 'cosmetics' 와 'k-cosmetics' 두 row 를 모두 가진 경우 UPDATE 시 충돌 → 사전 DELETE 필요.
 *
 * 절차:
 *   1. 'cosmetics' 키 row 카운트 (사전 진단)
 *   2. 동일 user 가 이미 'k-cosmetics' 를 가진 'cosmetics' row DELETE (충돌 방지)
 *   3. 나머지 'cosmetics' row 를 'k-cosmetics' 로 UPDATE
 *   4. 잔존 'cosmetics' row 검증
 *
 * 정책 유지 (본 migration 변경하지 않는 항목):
 *   - role_assignments 미변경
 *   - cosmetics_members 등 도메인 테이블 미변경
 *   - MembershipGate / membership-guard fallback 추가 없음
 *   - cosmetics operator/admin bypass 추가 없음
 *   - canonical key 'k-cosmetics' 표준 유지
 *
 * 멱등성: 재실행 안전. 이미 'cosmetics' row 가 0건이면 영향 0건.
 *
 * Scope: cosmetics 전용. KPA 'kpa' → 'kpa-society' 동일 패턴은
 *        20260928000000-NormalizeServiceMembershipsKpaKey 가 처리.
 */
export class NormalizeServiceMembershipsCosmeticsKey20260929000000 implements MigrationInterface {
  name = 'NormalizeServiceMembershipsCosmeticsKey20260929000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. 사전 진단 ───────────────────────────────────────────
    const beforeRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS legacy_count
      FROM service_memberships
      WHERE service_key = 'cosmetics'
    `);
    const legacyCount: number = beforeRows[0]?.legacy_count ?? 0;
    console.log(`[Migration] NormalizeServiceMembershipsCosmeticsKey: legacy 'cosmetics' rows = ${legacyCount}`);

    if (legacyCount === 0) {
      console.log(`[Migration] NormalizeServiceMembershipsCosmeticsKey: no-op (already normalized)`);
      return;
    }

    // ─── 2. 충돌 row 사전 DELETE ────────────────────────────────
    // 동일 user 가 이미 'k-cosmetics' row 를 가진 경우 'cosmetics' row 를 삭제
    // (UNIQUE (user_id, service_key) 충돌 방지 + canonical 우선)
    const deleteResult = await queryRunner.query(`
      DELETE FROM service_memberships sm_legacy
      WHERE sm_legacy.service_key = 'cosmetics'
        AND EXISTS (
          SELECT 1 FROM service_memberships sm_canonical
          WHERE sm_canonical.user_id = sm_legacy.user_id
            AND sm_canonical.service_key = 'k-cosmetics'
        )
      RETURNING user_id
    `);
    const deletedCount = Array.isArray(deleteResult) ? deleteResult.length : 0;
    console.log(`[Migration] NormalizeServiceMembershipsCosmeticsKey: deleted ${deletedCount} duplicate 'cosmetics' rows (user already has 'k-cosmetics')`);

    // ─── 3. 나머지 'cosmetics' row → 'k-cosmetics' UPDATE ───────
    const updateResult = await queryRunner.query(`
      UPDATE service_memberships
      SET service_key = 'k-cosmetics', updated_at = NOW()
      WHERE service_key = 'cosmetics'
      RETURNING user_id
    `);
    const updatedCount = Array.isArray(updateResult) ? updateResult.length : 0;
    console.log(`[Migration] NormalizeServiceMembershipsCosmeticsKey: updated ${updatedCount} rows ('cosmetics' → 'k-cosmetics')`);

    // ─── 4. 잔존 검증 ──────────────────────────────────────────
    const afterRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS remaining
      FROM service_memberships
      WHERE service_key = 'cosmetics'
    `);
    const remaining: number = afterRows[0]?.remaining ?? 0;
    console.log(`[Migration] NormalizeServiceMembershipsCosmeticsKey: DONE — deleted=${deletedCount}, updated=${updatedCount}, remaining_cosmetics=${remaining}`);

    if (remaining > 0) {
      // 정상 흐름에서는 도달 불가 (DELETE + UPDATE 가 모든 'cosmetics' row 를 처리). 안전 가드.
      console.warn(`[Migration] NormalizeServiceMembershipsCosmeticsKey: WARNING — ${remaining} 'cosmetics' rows still remain after normalization`);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // down() no-op — 'cosmetics' 키로 되돌리면 가드가 다시 차단함 (canonical drift 재발생)
    console.log(`[Migration] NormalizeServiceMembershipsCosmeticsKey down: no-op (reverting would reintroduce canonical drift)`);
  }
}
