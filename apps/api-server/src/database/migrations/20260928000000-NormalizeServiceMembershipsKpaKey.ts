import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NORMALIZE-KPA-SERVICE-MEMBERSHIP-KEY-V1
 *
 * service_memberships.service_key='kpa' 인 legacy row 를 canonical key 'kpa-society' 로 정규화한다.
 *
 * 배경:
 *   - BackfillServiceMembershipsFromRoles20260318100000 가 role_assignments.role 의
 *     prefix(SPLIT_PART(role, ':', 1)) 를 그대로 service_key 로 저장하여 'kpa' 키 row 생성.
 *   - 그러나 frontend MembershipGate(SERVICE_KEY='kpa-society') 와
 *     backend membership-guard(SCOPE_TO_MEMBERSHIP_KEY['kpa']='kpa-society') 는 모두
 *     'kpa-society' 를 canonical key 로 사용 → 'kpa' 키는 가드 통과 불가.
 *   - 결과: 백필로 만들어진 kpa:admin / kpa:operator 계정이 /operator 진입 시
 *     MembershipGate 의 "서비스 가입이 필요합니다" 화면으로 영구 차단.
 *
 * 신규 drift 생성 경로는 WO-O4O-ADMIN-OPERATOR-MEMBERSHIP-CANONICAL-KEY-FIX-V1 (2e533fba8) 에서
 * AdminUserController.ensureServiceMemberships() 에 ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY
 * 매핑 추가로 이미 차단됨. 본 migration 은 기존 잔재 데이터 정리 전용.
 *
 * UNIQUE 제약 주의:
 *   service_memberships 는 (user_id, service_key) UNIQUE 제약 존재 (BackfillServiceMembershipsFromRoles
 *   의 ON CONFLICT (user_id, service_key) DO NOTHING 으로 확인됨).
 *   같은 user 가 'kpa' 와 'kpa-society' 두 row 를 모두 가진 경우 UPDATE 시 충돌 → 사전 DELETE 필요.
 *
 * 절차:
 *   1. 'kpa' 키 row 카운트 (사전 진단)
 *   2. 동일 user 가 이미 'kpa-society' 를 가진 'kpa' row DELETE (충돌 방지)
 *   3. 나머지 'kpa' row 를 'kpa-society' 로 UPDATE
 *   4. 잔존 'kpa' row 검증
 *
 * 정책 유지 (본 migration 변경하지 않는 항목):
 *   - role_assignments 미변경
 *   - kpa_members 미변경
 *   - MembershipGate / membership-guard fallback 추가 없음
 *   - operator/admin bypass 추가 없음
 *   - canonical key 'kpa-society' 표준 유지
 *
 * 멱등성: 재실행 안전. 이미 'kpa' row 가 0건이면 영향 0건.
 *
 * Scope: KPA 전용 (cosmetics 'cosmetics' → 'k-cosmetics' 동일 패턴은 별도 WO).
 */
export class NormalizeServiceMembershipsKpaKey20260928000000 implements MigrationInterface {
  name = 'NormalizeServiceMembershipsKpaKey20260928000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. 사전 진단 ───────────────────────────────────────────
    const beforeRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS legacy_count
      FROM service_memberships
      WHERE service_key = 'kpa'
    `);
    const legacyCount: number = beforeRows[0]?.legacy_count ?? 0;
    console.log(`[Migration] NormalizeServiceMembershipsKpaKey: legacy 'kpa' rows = ${legacyCount}`);

    if (legacyCount === 0) {
      console.log(`[Migration] NormalizeServiceMembershipsKpaKey: no-op (already normalized)`);
      return;
    }

    // ─── 2. 충돌 row 사전 DELETE ────────────────────────────────
    // 동일 user 가 이미 'kpa-society' row 를 가진 경우 'kpa' row 를 삭제
    // (UNIQUE (user_id, service_key) 충돌 방지 + canonical 우선)
    const deleteResult = await queryRunner.query(`
      DELETE FROM service_memberships sm_legacy
      WHERE sm_legacy.service_key = 'kpa'
        AND EXISTS (
          SELECT 1 FROM service_memberships sm_canonical
          WHERE sm_canonical.user_id = sm_legacy.user_id
            AND sm_canonical.service_key = 'kpa-society'
        )
      RETURNING user_id
    `);
    const deletedCount = Array.isArray(deleteResult) ? deleteResult.length : 0;
    console.log(`[Migration] NormalizeServiceMembershipsKpaKey: deleted ${deletedCount} duplicate 'kpa' rows (user already has 'kpa-society')`);

    // ─── 3. 나머지 'kpa' row → 'kpa-society' UPDATE ───────────
    const updateResult = await queryRunner.query(`
      UPDATE service_memberships
      SET service_key = 'kpa-society', updated_at = NOW()
      WHERE service_key = 'kpa'
      RETURNING user_id
    `);
    const updatedCount = Array.isArray(updateResult) ? updateResult.length : 0;
    console.log(`[Migration] NormalizeServiceMembershipsKpaKey: updated ${updatedCount} rows ('kpa' → 'kpa-society')`);

    // ─── 4. 잔존 검증 ──────────────────────────────────────────
    const afterRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS remaining
      FROM service_memberships
      WHERE service_key = 'kpa'
    `);
    const remaining: number = afterRows[0]?.remaining ?? 0;
    console.log(`[Migration] NormalizeServiceMembershipsKpaKey: DONE — deleted=${deletedCount}, updated=${updatedCount}, remaining_kpa=${remaining}`);

    if (remaining > 0) {
      // 정상 흐름에서는 도달 불가 (DELETE + UPDATE 가 모든 'kpa' row 를 처리). 안전 가드.
      console.warn(`[Migration] NormalizeServiceMembershipsKpaKey: WARNING — ${remaining} 'kpa' rows still remain after normalization`);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // down() no-op — 'kpa' 키로 되돌리면 가드가 다시 차단함 (canonical drift 재발생)
    console.log(`[Migration] NormalizeServiceMembershipsKpaKey down: no-op (reverting would reintroduce canonical drift)`);
  }
}
