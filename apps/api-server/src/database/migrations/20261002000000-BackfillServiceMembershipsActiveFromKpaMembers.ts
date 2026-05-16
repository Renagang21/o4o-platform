import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-MEMBER-APPROVAL-SM-SYNC-FIX-V1
 *
 * service_memberships.status 잔재 데이터 정리:
 *   `kpa_members.status='active'` 인데 동일 user_id 의
 *   `service_memberships(service_key='kpa-society').status='pending'` 로 남은 row 를
 *   canonical 'active' 로 backfill.
 *
 * 배경:
 *   - PATCH /kpa/members/:id/status 의 pending→active 분기가
 *     `kpa_members` / `users` / `kpa_pharmacist_profiles` 등은 업데이트했으나
 *     `service_memberships` 만 미동기화 → contract drift 누적.
 *   - GET /kpa/members 의 status 필터는 `sm.status` 기준이라 승인 회원이
 *     운영자 화면의 '승인대기' 탭에 계속 표시.
 *   - 본 WO 의 코드 변경(member.controller.ts 의 inline UPDATE 추가) 으로
 *     신규 승인은 정상 동기화되나, 기존 회원의 잔재 'pending' row 는 본 migration 으로 정리.
 *
 * 정책 매칭 가드:
 *   - service_key = 'kpa-society' 한정 (다른 서비스 무영향)
 *   - sm.status = 'pending' AND km.status = 'active' 인 row 만 (이미 active/withdrawn/suspended/rejected 는 제외)
 *   - users 테이블 변경 없음 (코드 흐름이 별도로 처리)
 *   - role_assignments 변경 없음 (KPA 'profile 기반 RBAC role 최소화' 정책 유지)
 *
 * 멱등성: 재실행 안전. 일치하는 row 0건이면 no-op.
 * down(): no-op (canonical drift 재발 방지).
 */
export class BackfillServiceMembershipsActiveFromKpaMembers20261002000000 implements MigrationInterface {
  name = 'BackfillServiceMembershipsActiveFromKpaMembers20261002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tag = '[Migration] BackfillServiceMembershipsActiveFromKpaMembers';

    // 1. 사전 진단
    const beforeRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS drift_count
      FROM service_memberships sm
      JOIN kpa_members km ON km.user_id = sm.user_id
      WHERE sm.service_key = 'kpa-society'
        AND sm.status = 'pending'
        AND km.status = 'active'
    `);
    const driftCount: number = beforeRows[0]?.drift_count ?? 0;
    console.log(`${tag}: drift row count (sm.pending + km.active) = ${driftCount}`);

    if (driftCount === 0) {
      console.log(`${tag}: no-op (no drift rows found)`);
      return;
    }

    // 2. 영향 row 샘플 로그 (max 5)
    const sampleRows = await queryRunner.query(`
      SELECT sm.id AS sm_id, sm.user_id, u.email, km.joined_at, sm.created_at
      FROM service_memberships sm
      JOIN kpa_members km ON km.user_id = sm.user_id
      LEFT JOIN users u ON u.id = sm.user_id
      WHERE sm.service_key = 'kpa-society'
        AND sm.status = 'pending'
        AND km.status = 'active'
      ORDER BY km.joined_at DESC NULLS LAST, sm.created_at DESC
      LIMIT 5
    `);
    console.log(`${tag}: sample drift rows (max 5):`);
    for (const row of sampleRows as Array<{ sm_id: string; user_id: string; email: string | null; joined_at: string | null; created_at: string }>) {
      console.log(`  - sm_id=${row.sm_id} user_id=${row.user_id} email=${row.email ?? '-'} joined_at=${row.joined_at ?? '-'} sm_created=${row.created_at}`);
    }

    // 3. Backfill UPDATE
    //    approved_by / approved_at 은 backfill 식별을 위해 NULL 유지 — 운영자 식별 불가 케이스.
    //    updated_at 만 NOW() 로 갱신.
    const updateResult = await queryRunner.query(`
      UPDATE service_memberships sm
      SET status = 'active', updated_at = NOW()
      FROM kpa_members km
      WHERE sm.user_id = km.user_id
        AND sm.service_key = 'kpa-society'
        AND sm.status = 'pending'
        AND km.status = 'active'
      RETURNING sm.id
    `);
    const updatedCount = Array.isArray(updateResult) ? updateResult.length : 0;
    console.log(`${tag}: updated ${updatedCount} rows (sm.status: 'pending' → 'active')`);

    // 4. 사후 검증 — drift 0 확인
    const afterRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS remaining_drift
      FROM service_memberships sm
      JOIN kpa_members km ON km.user_id = sm.user_id
      WHERE sm.service_key = 'kpa-society'
        AND sm.status = 'pending'
        AND km.status = 'active'
    `);
    const remainingDrift: number = afterRows[0]?.remaining_drift ?? 0;
    if (remainingDrift > 0) {
      throw new Error(
        `${tag}: post-check failed — ${remainingDrift} drift row(s) still exist after UPDATE. ` +
        `This indicates a concurrent writer or unexpected DB state.`
      );
    }
    console.log(`${tag}: ✅ remaining drift rows = 0 (DONE)`);

    // 5. 정보성 — kpa-society sm.status 분포
    const distRows = await queryRunner.query(`
      SELECT status, COUNT(*)::int AS count
      FROM service_memberships
      WHERE service_key = 'kpa-society'
      GROUP BY status
      ORDER BY status
    `);
    console.log(`${tag}: kpa-society sm.status distribution after backfill:`);
    for (const row of distRows as Array<{ status: string; count: number }>) {
      console.log(`  - ${row.status}: ${row.count}`);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // down() no-op — 'pending' 으로 되돌리면 동일 contract drift 재발생
    console.log('[Migration] BackfillServiceMembershipsActiveFromKpaMembers down: no-op (reverting would reintroduce contract drift)');
  }
}
