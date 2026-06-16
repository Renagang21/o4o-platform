import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1
 *
 * neture_partner_application_status_enum 에 'cancelled' 값 추가.
 *
 * CANCELLED 상태:
 * - 판매자/매장 신청자 본인이 pending 신청을 직접 철회할 때 사용
 * - 공급자 반려(rejected)와 운영 의미가 다름(주체: 신청자 vs 공급자)
 * - approved 이후에는 사용하지 않음(승인 후 종료는 참여 해지/계약 해지 축)
 * - C bridge / contract / allowedSellerIds / OPL 와 무관(pending 단계 철회)
 */
export class AddCancelledApplicationStatus20260616000000
  implements MigrationInterface
{
  name = 'AddCancelledApplicationStatus20260616000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL: ALTER TYPE ... ADD VALUE IF NOT EXISTS (idempotent).
    // 새 값을 같은 트랜잭션에서 참조하지 않으므로 PG12+ 에서 안전.
    await queryRunner.query(`
      ALTER TYPE "neture_partner_application_status_enum" ADD VALUE IF NOT EXISTS 'cancelled';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL enum value 제거는 복잡/위험하므로 미수행.
    // 운영 정리: cancelled 레코드를 rejected 로 환원(상태값 자체는 유지).
    await queryRunner.query(`
      UPDATE neture_partner_applications
      SET status = 'rejected'
      WHERE status = 'cancelled';
    `);
  }
}
