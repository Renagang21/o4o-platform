/**
 * GrantPharmacyHubInitialOperator
 * WO-PHARMACY-HUB-DEPLOY-BOOTSTRAP-AND-MEMBERSHIP-E2E-V1 §2
 *
 * Pharmacy-Hub 최초 운영자(bootstrap operator) 1명을 부여한다.
 *
 * 왜 migration 인가:
 *   가입 승인을 수행할 `pharmacy-hub:operator` 가 최소 1명 존재해야 승인 콘솔이 동작한다.
 *   그러나 operator 는 자가 신청 경로가 없다 (auth-register 의 PHARMACY_HUB_SIGNUP_ROLE_REQUIRED
 *   게이트가 store_owner|supplier 만 허용). 따라서 최초 1명은 admin grant flow 로만 부여 가능하며,
 *   RBAC-RUNBOOK-V1 §3 의 SQL 을 git 이력·CI/CD 절차 안에 남기기 위해 migration 으로 수행한다.
 *
 * 부여 범위 (이 2행 외 어떤 write 도 하지 않는다):
 *   1) service_memberships — (user, 'pharmacy-hub', status='active', role='pharmacy-hub:operator')
 *   2) role_assignments    — 'pharmacy-hub:operator'
 *
 * 명시적 비수행:
 *   - 대상 계정이 없으면 아무 행도 만들지 않는다 (SELECT ... WHERE email 기반 INSERT → 0 rows).
 *   - 타 서비스 membership / role 변경 없음 (WHERE 절이 service_key='pharmacy-hub' / role 리터럴로 한정).
 *   - 기존 역할 삭제·교체 없음 (UPDATE / DELETE 문 자체가 없음, 전부 INSERT ... DO NOTHING).
 *   - users 테이블 미수정 (대상은 이미 active 인 기존 플랫폼 계정).
 *   - 상품 · 주문 · 콘텐츠 권한 부여 없음.
 *
 * 멱등: 두 INSERT 모두 ON CONFLICT ... DO NOTHING — 재실행 시 추가 행 0.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

const OPERATOR_EMAIL = 'sohae2100@gmail.com';
const SERVICE_KEY = 'pharmacy-hub';
const OPERATOR_ROLE = 'pharmacy-hub:operator';

export class GrantPharmacyHubInitialOperator20270217000000 implements MigrationInterface {
  name = 'GrantPharmacyHubInitialOperator20270217000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 대상 계정 확인 — 없으면 no-op + 보고 (실패시키지 않는다: 배포 파이프라인 전체를 막을 사유가 아니다)
    const target: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      [OPERATOR_EMAIL],
    );

    if (target.length === 0) {
      console.warn(
        `[GrantPharmacyHubInitialOperator] SKIPPED — user not found: ${OPERATOR_EMAIL}. ` +
          `No rows written. Grant the bootstrap operator manually per RBAC-RUNBOOK-V1 §3.`,
      );
      return;
    }

    // 1) service_memberships — 이미 있으면 그대로 둔다 (status 덮어쓰기 금지)
    await queryRunner.query(
      `INSERT INTO service_memberships (user_id, service_key, status, role, approved_at, created_at, updated_at)
       SELECT id, $2, 'active', $3, NOW(), NOW(), NOW()
       FROM users WHERE email = $1
       ON CONFLICT (user_id, service_key) DO NOTHING`,
      [OPERATOR_EMAIL, SERVICE_KEY, OPERATOR_ROLE],
    );

    // 2) role_assignments — RBAC SSOT. 기존 active row 가 있으면 손대지 않는다.
    await queryRunner.query(
      `INSERT INTO role_assignments (id, user_id, role, is_active, valid_from, assigned_at, scope_type, created_at, updated_at)
       SELECT gen_random_uuid(), id, $2, true, NOW(), NOW(), 'global', NOW(), NOW()
       FROM users WHERE email = $1
       ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING`,
      [OPERATOR_EMAIL, OPERATOR_ROLE],
    );

    console.log(
      `[GrantPharmacyHubInitialOperator] granted ${OPERATOR_ROLE} to ${OPERATOR_EMAIL} (idempotent)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 이 migration 이 만든 2행만 제거한다.
    await queryRunner.query(
      `DELETE FROM role_assignments
       WHERE role = $2 AND user_id IN (SELECT id FROM users WHERE email = $1)`,
      [OPERATOR_EMAIL, OPERATOR_ROLE],
    );
    await queryRunner.query(
      `DELETE FROM service_memberships
       WHERE service_key = $2 AND role = $3 AND user_id IN (SELECT id FROM users WHERE email = $1)`,
      [OPERATOR_EMAIL, SERVICE_KEY, OPERATOR_ROLE],
    );
  }
}
