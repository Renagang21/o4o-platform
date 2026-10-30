import type { MigrationInterface, QueryRunner } from 'typeorm';

/** One business authority, reusing the existing consent/records rather than a second ledger. */
export class AddAssistantStorageAuthority1793322213345 implements MigrationInterface {
  name = 'AddAssistantStorageAuthority1793322213345';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE assistant_work_data_consents
      ADD COLUMN storage_mode varchar(16) NOT NULL DEFAULT 'local'
        CHECK(storage_mode IN ('local','transferring','server','stopped')),
      ADD COLUMN source_device_id uuid,
      ADD COLUMN transfer_error varchar(64)`);
    // Old mirrors require an explicit source selection, never assume they are complete.
    await q.query(`UPDATE assistant_work_data_consents SET storage_mode='transferring' WHERE enabled=true`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('LOCK TABLE assistant_work_data_consents IN ACCESS EXCLUSIVE MODE');
    if ((await q.query(`SELECT 1 FROM assistant_work_data_consents WHERE storage_mode<>'local' LIMIT 1`)).length) {
      throw new Error('Server authority exists; rollback requires a reviewed data migration.');
    }
    await q.query('ALTER TABLE assistant_work_data_consents DROP COLUMN source_device_id, DROP COLUMN storage_mode, DROP COLUMN transfer_error');
  }
}
