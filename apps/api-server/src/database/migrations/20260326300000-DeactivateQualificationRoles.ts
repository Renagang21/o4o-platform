/**
 * WO-KPA-A-ROLE-CLEANUP-V1
 *
 * Soft-deactivate kpa:pharmacist and kpa:student roles in role_assignments.
 * These roles are now replaced by profile tables:
 *   kpa:pharmacist → kpa_pharmacist_profiles
 *   kpa:student    → kpa_student_profiles
 *
 * Soft deactivation (is_active = false) instead of DELETE for audit trail.
 * Reversible: down() reactivates them.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeactivateQualificationRoles20260326300000
  implements MigrationInterface
{
  private readonly ROLES = ['kpa:pharmacist', 'kpa:student'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const role of this.ROLES) {
      const result = await queryRunner.query(
        `UPDATE role_assignments
         SET is_active = false, updated_at = NOW()
         WHERE role = $1 AND is_active = true`,
        [role]
      );
      // eslint-disable-next-line no-console
      console.log(`[Migration] Deactivated role '${role}': ${result?.[1] ?? 0} rows`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const role of this.ROLES) {
      await queryRunner.query(
        `UPDATE role_assignments
         SET is_active = true, updated_at = NOW()
         WHERE role = $1 AND is_active = false`,
        [role]
      );
    }
  }
}
