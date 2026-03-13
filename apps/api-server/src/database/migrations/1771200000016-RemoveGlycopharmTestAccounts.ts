import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove glycopharm/glucoseview @o4o.com test accounts.
 *
 * Target accounts (all @o4o.com):
 * - admin-glycopharm@o4o.com
 * - operator-glycopharm@o4o.com
 * - admin-glucoseview@o4o.com
 * - operator-glucoseview@o4o.com
 * - operator-k-cosmetics@o4o.com
 *
 * Steps: remove role_assignments → remove user records.
 */
export class RemoveGlycopharmTestAccounts1771200000016 implements MigrationInterface {
  private readonly emails = [
    'admin-glycopharm@o4o.com',
    'operator-glycopharm@o4o.com',
    'admin-glucoseview@o4o.com',
    'operator-glucoseview@o4o.com',
    'operator-k-cosmetics@o4o.com',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove role_assignments for these users
    await queryRunner.query(
      `DELETE FROM role_assignments WHERE user_id IN (
        SELECT id FROM users WHERE email = ANY($1)
      )`,
      [this.emails],
    );

    // 2. Remove the user records
    const result = await queryRunner.query(
      `DELETE FROM users WHERE email = ANY($1) RETURNING email`,
      [this.emails],
    );

    const deleted = (result as any[]).map((r: any) => r.email);
    if (deleted.length > 0) {
      // Use queryRunner.connection.logger if available, otherwise silent
      try {
        queryRunner.connection.logger.log('info', `[Migration] Deleted test accounts: ${deleted.join(', ')}`);
      } catch {
        // silent
      }
    }
  }

  public async down(): Promise<void> {
    // Cannot restore deleted accounts — intentional one-way migration
  }
}
