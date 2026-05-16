import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-REGISTER-CANONICAL-CLEANUP-V1
 *
 * canonical 회원가입 유형 정리:
 *   - 유지: pharmacist_member, pharmacy_student_member (+ legacy alias)
 *   - 제거: external_expert, supplier_staff
 *
 * 본 migration 은 회원가입 유형 제거에 따른 두 프로필 테이블 정리.
 *
 * 안전 절차:
 *   1) 운영 데이터 가정: 두 유형 회원 없음 (사용자 확인 — 회원 데이터 일괄 삭제 후 진행).
 *   2) DROP TABLE IF EXISTS — 멱등 안전.
 *   3) down() 미정의 정책: 회원가입 유형 자체가 제거되었으므로 rollback 불가 — throw.
 */
export class DropKpaExternalExpertAndSupplierStaffProfiles20260930000000 implements MigrationInterface {
  name = 'DropKpaExternalExpertAndSupplierStaffProfiles20260930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_external_expert_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_supplier_staff_profiles`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'DropKpaExternalExpertAndSupplierStaffProfiles is not reversible: ' +
      'membership types external_expert / supplier_staff were removed in WO-O4O-KPA-REGISTER-CANONICAL-CLEANUP-V1.',
    );
  }
}
