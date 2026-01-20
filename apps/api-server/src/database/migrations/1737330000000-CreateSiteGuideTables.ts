import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-SITEGUIDE-DB-MIGRATION-DEPLOY-V1
 *
 * SiteGuide Core Execution 테이블 생성
 * - siteguide_businesses (사업자)
 * - siteguide_api_keys (API 키)
 * - siteguide_usage_summaries (사용량 요약)
 * - siteguide_execution_logs (실행 로그)
 *
 * Schema: siteguide (독립 스키마)
 */
export class CreateSiteGuideTables1737330000000 implements MigrationInterface {
  name = 'CreateSiteGuideTables1737330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create siteguide schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS siteguide`);

    // 2. Create ENUM types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE siteguide.siteguide_business_status AS ENUM ('active', 'suspended', 'inactive');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE siteguide.siteguide_api_key_status AS ENUM ('active', 'suspended', 'revoked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE siteguide.siteguide_execution_type AS ENUM ('query', 'health_check');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE siteguide.siteguide_execution_result AS ENUM ('success', 'blocked', 'error');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Create siteguide_businesses table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS siteguide.siteguide_businesses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        status siteguide.siteguide_business_status NOT NULL DEFAULT 'active',
        allowed_domains JSONB NOT NULL DEFAULT '[]',
        daily_limit INT NOT NULL DEFAULT 100,
        email VARCHAR(200),
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 4. Create siteguide_api_keys table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS siteguide.siteguide_api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL,
        key_hash VARCHAR(64) NOT NULL,
        status siteguide.siteguide_api_key_status NOT NULL DEFAULT 'active',
        label VARCHAR(200),
        last_used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMP,
        CONSTRAINT fk_siteguide_api_keys_business
          FOREIGN KEY (business_id)
          REFERENCES siteguide.siteguide_businesses(id)
          ON DELETE CASCADE
      )
    `);

    // 5. Create siteguide_usage_summaries table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS siteguide.siteguide_usage_summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL,
        date DATE NOT NULL,
        request_count INT NOT NULL DEFAULT 0,
        success_count INT NOT NULL DEFAULT 0,
        blocked_count INT NOT NULL DEFAULT 0,
        error_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_siteguide_usage_summaries_business
          FOREIGN KEY (business_id)
          REFERENCES siteguide.siteguide_businesses(id)
          ON DELETE CASCADE
      )
    `);

    // 6. Create siteguide_execution_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS siteguide.siteguide_execution_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL,
        api_key_id UUID,
        execution_type siteguide.siteguide_execution_type NOT NULL DEFAULT 'query',
        result siteguide.siteguide_execution_result NOT NULL,
        error_code VARCHAR(50),
        request_domain VARCHAR(255),
        response_time_ms INT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 7. Create indexes for siteguide_businesses
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_siteguide_businesses_name
        ON siteguide.siteguide_businesses(name)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_siteguide_businesses_status
        ON siteguide.siteguide_businesses(status)
    `);

    // 8. Create indexes for siteguide_api_keys
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_siteguide_api_keys_business_id
        ON siteguide.siteguide_api_keys(business_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_siteguide_api_keys_key_hash
        ON siteguide.siteguide_api_keys(key_hash)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_siteguide_api_keys_status
        ON siteguide.siteguide_api_keys(status)
    `);

    // 9. Create indexes for siteguide_usage_summaries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_siteguide_usage_summaries_business_id
        ON siteguide.siteguide_usage_summaries(business_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_siteguide_usage_summaries_date
        ON siteguide.siteguide_usage_summaries(date)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_siteguide_usage_summaries_business_date
        ON siteguide.siteguide_usage_summaries(business_id, date)
    `);

    // 10. Create indexes for siteguide_execution_logs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_siteguide_execution_logs_business_id
        ON siteguide.siteguide_execution_logs(business_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_siteguide_execution_logs_result
        ON siteguide.siteguide_execution_logs(result)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_siteguide_execution_logs_created_at
        ON siteguide.siteguide_execution_logs(created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS siteguide.siteguide_execution_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS siteguide.siteguide_usage_summaries`);
    await queryRunner.query(`DROP TABLE IF EXISTS siteguide.siteguide_api_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS siteguide.siteguide_businesses`);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS siteguide.siteguide_execution_result`);
    await queryRunner.query(`DROP TYPE IF EXISTS siteguide.siteguide_execution_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS siteguide.siteguide_api_key_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS siteguide.siteguide_business_status`);

    // Note: We don't drop the schema in case other objects exist
    // await queryRunner.query(`DROP SCHEMA IF EXISTS siteguide`);
  }
}
