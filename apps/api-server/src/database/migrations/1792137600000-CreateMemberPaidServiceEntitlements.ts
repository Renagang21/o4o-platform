import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Member-owned service eligibility, distinct from store subscriptions and payment records. */
export class CreateMemberPaidServiceEntitlements1792137600000 implements MigrationInterface {
  name = 'CreateMemberPaidServiceEntitlements1792137600000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE member_paid_service_entitlements (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      active boolean NOT NULL DEFAULT false,
      ends_at timestamptz,
      updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE member_paid_service_entitlements`);
  }
}
