/**
 * RenamePharmacistToPharmacyRole
 *
 * WO-O4O-GLYCOPHARM-PHARMACY-ROLE-ALIGNMENT-V1
 *
 * GlycoPharm 약국 역할을 'pharmacist' → 'pharmacy'로 통일.
 * - role_assignments: pharmacist → pharmacy
 * - service_memberships: pharmacist → pharmacy
 *
 * Idempotent: WHERE role = 'pharmacist' 조건이므로 이미 변경된 경우 no-op.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePharmacistToPharmacyRole20260318110000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. role_assignments: pharmacist → pharmacy
    await queryRunner.query(
      `UPDATE role_assignments SET role = 'pharmacy', updated_at = NOW()
       WHERE role = 'pharmacist'`,
    );

    // 2. service_memberships: pharmacist → pharmacy
    await queryRunner.query(
      `UPDATE service_memberships SET role = 'pharmacy', updated_at = NOW()
       WHERE role = 'pharmacist'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: pharmacy → pharmacist
    await queryRunner.query(
      `UPDATE role_assignments SET role = 'pharmacist', updated_at = NOW()
       WHERE role = 'pharmacy'`,
    );

    await queryRunner.query(
      `UPDATE service_memberships SET role = 'pharmacist', updated_at = NOW()
       WHERE role = 'pharmacist'`,
    );
  }
}
