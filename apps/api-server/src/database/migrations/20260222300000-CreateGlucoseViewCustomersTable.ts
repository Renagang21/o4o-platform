import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGlucoseViewCustomersTable20260222300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS glucoseview_customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        pharmacist_id VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        birth_year INT,
        gender VARCHAR(10),
        kakao_id VARCHAR(100),
        last_visit TIMESTAMP,
        visit_count INT NOT NULL DEFAULT 1,
        sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        last_sync_at TIMESTAMP,
        notes TEXT,
        data_sharing_consent BOOLEAN NOT NULL DEFAULT false,
        consent_date TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes matching entity definition
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_gv_customers_pharmacist_id ON glucoseview_customers (pharmacist_id)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_gv_customers_pharmacist_phone ON glucoseview_customers (pharmacist_id, phone)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_gv_customers_pharmacist_email ON glucoseview_customers (pharmacist_id, email)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS glucoseview_customers`);
  }
}
