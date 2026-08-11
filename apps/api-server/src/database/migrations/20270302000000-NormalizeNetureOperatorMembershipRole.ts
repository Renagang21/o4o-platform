import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ROLE-DATA-CANONICALIZATION-AND-LEGACY-CLEANUP-V1
 *
 * 은퇴한 Neture 전용 운영자 관리 API(`upsertNetureMembership`)가 남긴
 * `service_memberships(service_key='neture', role='operator')` 1행을 정본 이름으로 바꾼다.
 *
 *   BEFORE  neture / 'operator'
 *   AFTER   neture / 'neture:operator'
 *
 * ## 왜 삭제가 아니라 변환인가
 *
 * 이 행의 주인은 `role_assignments` 에 `neture:admin` · `neture:operator` 를 **실제로 활성 보유**한
 * 정상 운영자다. 멤버십 행을 지우면 `createMembershipScopeGuard` 가
 * `MEMBERSHIP_NOT_FOUND` 로 그 계정의 Neture 접근을 전부 막는다 → 삭제는 회귀다.
 *
 * ## 왜 `neture:operator` 인가 (추정이 아니라 대조)
 *
 *  1. `roles` 카탈로그에 `neture:operator` (service_key='neture', role_key='operator') 가 실재한다.
 *  2. 같은 사용자가 `role_assignments` 에 `neture:operator` 를 활성 보유한다 (SSOT 일치).
 *  3. 프로덕션에 **접두 형태 멤버십 role 선례가 이미 있다** —
 *     `pharmacy-hub / 'pharmacy-hub:operator'`, `pharmacy-hub / 'pharmacy-hub:store_owner'`,
 *     `k-cosmetics / 'cosmetics:store_owner'`.
 *
 * 즉 (service_key='neture', role='operator') → `neture:operator` 는 유일 해석이다.
 *
 * ## 왜 지금 고치는가
 *
 * `MembershipApprovalService.resolveGrantedRole()` 는 멤버십 role 을 그대로
 * `role_assignments.role` 로 부여한다. 이 행이 다시 승인 흐름을 타면
 * **접두 없는 `operator` 역할 행이 새로 생성**된다 (신규 legacy 유입).
 * 이름을 정본으로 맞춰두면 그 경로에서도 SSOT 와 같은 역할만 다뤄진다.
 *
 * ## 영향 범위
 *
 * `service_memberships.role` 은 **인가에 쓰이지 않는다** — 로그인 JWT 의 memberships 클레임은
 * `{ serviceKey, status }` 만 싣고(`refresh-token.service.ts`), scope guard 도 service_key + status
 * 만 본다. 따라서 로그인·권한·서비스 경계에 변화가 없다.
 *
 * 실측(2026-08-11 프로덕션 read-only): 대상 **정확히 1행**. 멱등 — 재실행 시 0행.
 */
export class NormalizeNetureOperatorMembershipRole20270302000000
  implements MigrationInterface
{
  name = 'NormalizeNetureOperatorMembershipRole20270302000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(`
      UPDATE service_memberships
         SET role = 'neture:operator',
             updated_at = NOW()
       WHERE service_key = 'neture'
         AND role = 'operator'
      RETURNING id
    `);
    const affected = Array.isArray(rows) ? rows.length : 0;
    console.log(
      `[NormalizeNetureOperatorMembershipRole] neture/operator -> neture:operator, affected=${affected}`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE service_memberships
         SET role = 'operator',
             updated_at = NOW()
       WHERE service_key = 'neture'
         AND role = 'neture:operator'
    `);
  }
}
