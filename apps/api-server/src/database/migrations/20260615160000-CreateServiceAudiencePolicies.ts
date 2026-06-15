import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1
 *
 * service_audience_policies — 서비스가 약국 대상 서비스인지 DB 로 관리.
 * 후속 의약품 서비스 연결 gate(WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1)의 기준값.
 *
 * 초기값(정책 확정): kpa-society / glycopharm = 약국 대상(true), k-cosmetics / neture = 비약국(false).
 * 기존 하드코딩 PHARMACY_ALLOWED_SERVICE_KEYS=['glycopharm','kpa-society'] 와 정합. seed 는 idempotent.
 */
export class CreateServiceAudiencePolicies20260615160000
  implements MigrationInterface
{
  name = 'CreateServiceAudiencePolicies20260615160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS service_audience_policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key varchar(50) NOT NULL,
        is_pharmacy_target_service boolean NOT NULL DEFAULT false,
        note text,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_service_audience_policies_service_key'
        ) THEN
          ALTER TABLE service_audience_policies
            ADD CONSTRAINT "UQ_service_audience_policies_service_key" UNIQUE (service_key);
        END IF;
      END $$;
    `);

    // 초기 정책값 seed (idempotent — 기존 row 보존)
    await queryRunner.query(`
      INSERT INTO service_audience_policies (service_key, is_pharmacy_target_service, note)
      VALUES
        ('kpa-society', true,  '약국 대상 서비스 (초기 정책)'),
        ('glycopharm',  true,  '약국 대상 서비스 (초기 정책)'),
        ('k-cosmetics', false, '비약국 대상 서비스 (초기 정책)'),
        ('neture',      false, '비약국 대상 서비스 (초기 정책)')
      ON CONFLICT (service_key) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS service_audience_policies`);
  }
}
