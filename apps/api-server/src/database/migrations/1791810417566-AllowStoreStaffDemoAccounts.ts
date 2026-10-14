import type { MigrationInterface, QueryRunner } from 'typeorm';

/** WO-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1: user-approved third public experience account.
 * Registry classification only. Does not create users, staff relationships, roles or permissions.
 */
export class AllowStoreStaffDemoAccounts1791810417566 implements MigrationInterface {
  name = 'AllowStoreStaffDemoAccounts1791810417566';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE demo_accounts DROP CONSTRAINT chk_demo_accounts_type');
    await queryRunner.query("ALTER TABLE demo_accounts ADD CONSTRAINT chk_demo_accounts_type CHECK (demo_type IN ('STORE_OWNER', 'SUPPLIER', 'STORE_STAFF'))");
    await queryRunner.query("COMMENT ON COLUMN demo_accounts.demo_type IS 'Public Demo classification: STORE_OWNER, SUPPLIER, STORE_STAFF. Authorization remains role and relationship based.'");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query("SELECT 1 FROM demo_accounts WHERE demo_type = 'STORE_STAFF' LIMIT 1");
    if (rows.length) throw new Error('Staff Demo registry exists; review a forward repair before downgrade');
    await queryRunner.query('ALTER TABLE demo_accounts DROP CONSTRAINT chk_demo_accounts_type');
    await queryRunner.query("ALTER TABLE demo_accounts ADD CONSTRAINT chk_demo_accounts_type CHECK (demo_type IN ('STORE_OWNER', 'SUPPLIER'))");
    await queryRunner.query("COMMENT ON COLUMN demo_accounts.demo_type IS '지금은 STORE_OWNER · SUPPLIER 둘뿐. 새 유형은 그 기능이 설계될 때 CHECK 에 추가한다'");
  }
}
