import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-TIER2-SERVICE-STATE-POLICY-REALIGN-V1
 *
 * product_approval_status_enum에 'revoked' 값 추가.
 *
 * REVOKED 상태:
 * - 관리자가 APPROVED 승인을 철회할 때 사용
 * - Supplier INACTIVE / Product REJECTED 시 자동 캐스케이드
 * - REVOKED 상태에서 재신청 가능
 */
export class AddRevokedApprovalStatus20260226400001
  implements MigrationInterface
{
  name = 'AddRevokedApprovalStatus20260226400001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL: ALTER TYPE ... ADD VALUE IF NOT EXISTS
    // Note: ADD VALUE cannot run inside a transaction block in some PG versions,
    // but IF NOT EXISTS makes it safe for idempotent execution.
    await queryRunner.query(`
      ALTER TYPE "product_approval_status_enum" ADD VALUE IF NOT EXISTS 'revoked';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL enum value removal is complex and rarely needed.
    // Convert any 'revoked' records to 'rejected' for operational cleanup.
    await queryRunner.query(`
      UPDATE product_approvals
      SET approval_status = 'rejected'
      WHERE approval_status = 'revoked';
    `);
  }
}
