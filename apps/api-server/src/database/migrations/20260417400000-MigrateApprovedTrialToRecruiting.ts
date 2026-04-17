import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-CLEANUP-3: APPROVED 상태 완전 제거
 *
 * DB 현황 (2026-04-17):
 *   - status = 'approved' row: 1건
 *   - id: 71a195b1-d430-4660-a993-16fb23318d85
 *   - title: Phase1 Verify (2026-03-20 생성, 개발 검증용 테스트 데이터)
 *   - 배경: WO-MARKET-TRIAL-NETURE-SINGLE-APPROVAL-TRANSITION-V1(2026-04-06) 이전에
 *           approve1st()가 SUBMITTED → APPROVED로 전환했으나, 서비스별 2차 승인이
 *           이루어지지 않아 RECRUITING으로 진행되지 못한 row.
 *
 * 전환 근거:
 *   - 운영자가 이미 1차 승인 완료 → 현재 단일 승인 구조에서 RECRUITING이 올바른 상태
 *   - 모집 기간(fundingEndAt: 2026-04-20)이 아직 유효함
 *   - 보수적 관점: approved = 이미 승인됨 = recruiting으로 전환이 가장 안전
 */
export class MigrateApprovedTrialToRecruiting20260417400000 implements MigrationInterface {
  name = 'MigrateApprovedTrialToRecruiting20260417400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // approved 상태 row를 recruiting으로 전환 (idempotent)
    await queryRunner.query(`
      UPDATE market_trials
      SET    status     = 'recruiting',
             "updatedAt" = NOW()
      WHERE  status     = 'approved'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: Phase1 Verify trial을 approved로 복원 (UUID 명시)
    await queryRunner.query(`
      UPDATE market_trials
      SET    status     = 'approved',
             "updatedAt" = NOW()
      WHERE  id = '71a195b1-d430-4660-a993-16fb23318d85'
    `);
  }
}
