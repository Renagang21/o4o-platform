import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContactRequests20260922000000 implements MigrationInterface {
  name = 'CreateContactRequests20260922000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contact_requests (
        id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key     VARCHAR(50)  NOT NULL DEFAULT 'kpa-society',
        type            VARCHAR(50)  NOT NULL,
        organization_name VARCHAR(255),
        name            VARCHAR(100) NOT NULL,
        email           VARCHAR(255) NOT NULL,
        phone           VARCHAR(50),
        subject         VARCHAR(255),
        message         TEXT         NOT NULL,
        status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
        created_by      UUID,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_contact_requests_service_status
         ON contact_requests (service_key, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_contact_requests_type_status
         ON contact_requests (type, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at
         ON contact_requests (created_at DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS contact_requests`);
  }
}
