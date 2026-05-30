import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Nullify license_number for already-withdrawn KPA members.
 *
 * WO-O4O-KPA-WITHDRAWN-LICENSE-CLEANUP-V1
 *   기존 withdrawn 회원의 kpa_members.license_number / kpa_pharmacist_profiles.license_number
 *   를 일괄 NULL 처리. 이번 commit 의 MembershipApprovalService 정책 변경은 신규
 *   withdrawn 처리 시점에만 적용되므로, 기존 withdrawn 회원의 잔존 license 는
 *   본 migration 으로 일회성 cleanup.
 *
 *   배경 (IR-O4O-KPA-LICENSE-DUPLICATE-SAME-USER-CROSSSERVICE-AUDIT-V1):
 *     - kpa_members.license_number 가 Partial UNIQUE (NULL/'' 제외)
 *     - /check-license 는 status 무관 unique — withdrawn 회원의 license 도 차단
 *     - production 검증: license 99991 점유자가 withdrawn 회원 (renagang21 본인)
 *       → 본인 재가입 시도 시 차단되는 UX 결함 발견
 *
 *   안전 가드:
 *     - active / pending / suspended / rejected 회원의 license 는 절대 변경 안 함
 *       (WHERE status = 'withdrawn' 명시)
 *     - up()/down() 모두 IDEMPOTENT (재실행 안전)
 *
 *   영향 (예상):
 *     - 99991 (renagang21@gmail.com, kpa_members.id=3965dff9-880d-4171-aa9d-81b88e59ad64)
 *     - 99992 (별도 확인 필요 — 같은 패턴이면 cleanup, 아니면 단독 row 유지)
 *     - 기타 withdrawn 회원의 잔존 license
 */
export class NullifyKpaWithdrawnLicenseNumbers20260530124500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // kpa_members: withdrawn 회원의 license_number 무효화
    await queryRunner.query(`
      UPDATE kpa_members
      SET license_number = NULL, updated_at = NOW()
      WHERE status = 'withdrawn'
        AND license_number IS NOT NULL
    `);

    // kpa_pharmacist_profiles: 같은 user_id 의 잔존 license 도 일관성 정리
    //   (kpa_members 가 SSOT, pharmacist_profiles 는 mirror)
    await queryRunner.query(`
      UPDATE kpa_pharmacist_profiles pp
      SET license_number = NULL, updated_at = NOW()
      FROM kpa_members km
      WHERE pp.user_id = km.user_id
        AND km.status = 'withdrawn'
        AND pp.license_number IS NOT NULL
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 복구 불가능 (원본 license_number 보존 안 함).
    // 의도적으로 no-op — license 무효화는 정책 결정이며 rollback 대상 아님.
    // 실수로 발견되면 별도 IR/WO 로 history 복구.
  }
}
