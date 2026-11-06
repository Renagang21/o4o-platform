import type {MigrationInterface,QueryRunner} from 'typeorm';
/** Additive credential metadata only. Existing permanent credentials remain unchanged. */
export class AddTemporaryPasswordExpiry1793750400000 implements MigrationInterface {
  name='AddTemporaryPasswordExpiry1793750400000';
  async up(q:QueryRunner):Promise<void>{await q.query('ALTER TABLE user_password_credentials ADD COLUMN temporary_expires_at timestamptz NULL');}
  async down(q:QueryRunner):Promise<void>{
    // Never turn an expiring operator-issued password into a permanent credential on rollback.
    const [row]=await q.query('SELECT EXISTS(SELECT 1 FROM user_password_credentials WHERE temporary_expires_at IS NOT NULL) AS temporary');
    if(row.temporary)throw new Error('TEMPORARY_CREDENTIALS_REQUIRE_REVIEW');
    await q.query('ALTER TABLE user_password_credentials DROP COLUMN temporary_expires_at');
  }
}
