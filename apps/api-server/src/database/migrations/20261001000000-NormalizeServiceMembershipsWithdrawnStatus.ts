import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1
 *
 * service_memberships.status='inactive' 잔재 데이터를 canonical 'withdrawn' 으로 정규화.
 *
 * 배경:
 *   - MembershipApprovalService.withdrawMembership() 가 Core enum 회피 목적으로 'inactive' 저장
 *     (소스 line 637 + soft delete 분기 line 797).
 *   - 그러나 ServiceMembershipStatus 타입에는 'inactive' 도 'withdrawn' 도 미정의.
 *   - GET /kpa/members 의 status 필터 + frontend tab 카운트는 'withdrawn' 기대.
 *   - 결과: 운영자가 탈퇴 처리한 회원이 관리자 화면의 '탈퇴' 탭에 0건으로 표시 — contract drift.
 *
 * 본 WO 의 코드 변경:
 *   - ServiceMembershipStatus 타입에 'withdrawn' 정식 추가
 *   - withdrawMembership() / soft delete 분기 모두 'inactive' → 'withdrawn'
 *   - handoff.controller.ts 의 reactivation block 가드도 'withdrawn' 으로 정렬
 *
 * 본 migration:
 *   - 운영 DB 에 남아있는 status='inactive' row 를 'withdrawn' 으로 일괄 정규화.
 *   - 'inactive' 는 더 이상 service_memberships 의 유효 status 가 아님.
 *
 * 영향 범위:
 *   - service_memberships.status='inactive' 인 row 만 대상.
 *   - 다른 status (pending/active/suspended/rejected/withdrawn) 는 무영향.
 *   - 다른 테이블 (kpa_members, users, role_assignments) 미영향.
 *
 * 멱등성: 재실행 안전. 'inactive' row 가 0건이면 영향 0건.
 * down(): no-op (canonical drift 재발 방지).
 */
export class NormalizeServiceMembershipsWithdrawnStatus20261001000000 implements MigrationInterface {
  name = 'NormalizeServiceMembershipsWithdrawnStatus20261001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tag = '[Migration] NormalizeServiceMembershipsWithdrawnStatus';

    // 1. 사전 진단
    const beforeRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS legacy_count
      FROM service_memberships
      WHERE status = 'inactive'
    `);
    const legacyCount: number = beforeRows[0]?.legacy_count ?? 0;
    console.log(`${tag}: legacy 'inactive' rows = ${legacyCount}`);

    if (legacyCount === 0) {
      console.log(`${tag}: no-op (already normalized)`);
      return;
    }

    // 2. 충돌 진단 — 동일 user_id+service_key 조합으로 'withdrawn' row 가 이미 존재하는 경우
    //   service_memberships 는 UNIQUE (user_id, service_key) 제약 — 동일 조합 다중 row 불가능하므로
    //   'inactive' row 가 있는 user_id+service_key 에는 다른 row 가 존재할 수 없음.
    //   따라서 UPDATE 시 UNIQUE 충돌 불가능. 확인용 진단만 로그.
    const sampleRows = await queryRunner.query(`
      SELECT user_id, service_key, updated_at
      FROM service_memberships
      WHERE status = 'inactive'
      ORDER BY updated_at DESC
      LIMIT 5
    `);
    console.log(`${tag}: sample 'inactive' rows (max 5):`);
    for (const row of sampleRows as Array<{ user_id: string; service_key: string; updated_at: string }>) {
      console.log(`  - user_id=${row.user_id} service_key=${row.service_key} updated_at=${row.updated_at}`);
    }

    // 3. UPDATE: 'inactive' → 'withdrawn'
    const updateResult = await queryRunner.query(`
      UPDATE service_memberships
      SET status = 'withdrawn', updated_at = NOW()
      WHERE status = 'inactive'
      RETURNING id
    `);
    const updatedCount = Array.isArray(updateResult) ? updateResult.length : 0;
    console.log(`${tag}: updated ${updatedCount} rows ('inactive' → 'withdrawn')`);

    // 4. 사후 검증
    const afterRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS remaining
      FROM service_memberships
      WHERE status = 'inactive'
    `);
    const remaining: number = afterRows[0]?.remaining ?? 0;
    if (remaining > 0) {
      throw new Error(
        `${tag}: post-check failed — ${remaining} 'inactive' row(s) still exist after UPDATE. ` +
        `This indicates a concurrent writer or unexpected DB state.`
      );
    }
    console.log(`${tag}: ✅ remaining 'inactive' rows = 0 (DONE)`);

    // 5. 정보성 — withdrawn row 총 카운트
    const withdrawnRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS withdrawn_count
      FROM service_memberships
      WHERE status = 'withdrawn'
    `);
    const withdrawnCount: number = withdrawnRows[0]?.withdrawn_count ?? 0;
    console.log(`${tag}: total 'withdrawn' rows after migration = ${withdrawnCount}`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // down() no-op — 'inactive' 로 되돌리면 canonical drift 재발 (frontend/타 코드와 미스매치)
    console.log('[Migration] NormalizeServiceMembershipsWithdrawnStatus down: no-op (reverting would reintroduce contract drift)');
  }
}
