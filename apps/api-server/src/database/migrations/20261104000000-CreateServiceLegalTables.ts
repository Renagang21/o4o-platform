/**
 * CreateServiceLegalTables
 *
 * WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1
 *
 * serviceKey 기준 법정정보(service_legal_profiles) + 정책 문서(service_policy_documents)
 * 저장 구조를 추가한다. additive only — 기존 데이터 파괴 없음, 실값/placeholder seed 없음.
 *
 * 모든 법정정보 컬럼은 nullable (서비스 개시 전 Admin 입력 전제).
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceLegalTables20261104000000 implements MigrationInterface {
  name = 'CreateServiceLegalTables20261104000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── service_legal_profiles (serviceKey 당 1 row) ──
    const hasProfiles = await queryRunner.hasTable('service_legal_profiles');
    if (!hasProfiles) {
      await queryRunner.query(`
        CREATE TABLE service_legal_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service_key VARCHAR(50) NOT NULL,
          company_name VARCHAR(200) NULL,
          representative_name VARCHAR(100) NULL,
          business_registration_number VARCHAR(50) NULL,
          ecommerce_registration_number VARCHAR(100) NULL,
          ecommerce_registration_agency VARCHAR(100) NULL,
          business_address VARCHAR(500) NULL,
          customer_service_phone VARCHAR(50) NULL,
          customer_service_email VARCHAR(255) NULL,
          privacy_officer_name VARCHAR(100) NULL,
          privacy_officer_email VARCHAR(255) NULL,
          privacy_officer_phone VARCHAR(50) NULL,
          hosting_provider VARCHAR(200) NULL,
          business_info_verification_url VARCHAR(500) NULL,
          mail_order_broker_notice TEXT NULL,
          purchase_safety_service_info TEXT NULL,
          additional_legal_notice TEXT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          updated_by UUID NULL,
          created_at TIMESTAMP NOT NULL DEFAULT now(),
          updated_at TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_service_legal_profiles_service_key
        ON service_legal_profiles (service_key)
      `);
    }

    // ── service_policy_documents (serviceKey + document_type 별 버전/게시) ──
    const hasPolicies = await queryRunner.hasTable('service_policy_documents');
    if (!hasPolicies) {
      await queryRunner.query(`
        CREATE TABLE service_policy_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service_key VARCHAR(50) NOT NULL,
          document_type VARCHAR(50) NOT NULL,
          title VARCHAR(200) NOT NULL,
          slug VARCHAR(150) NULL,
          content TEXT NOT NULL DEFAULT '',
          version INT NOT NULL DEFAULT 1,
          status VARCHAR(20) NOT NULL DEFAULT 'draft',
          effective_date TIMESTAMP NULL,
          published_at TIMESTAMP NULL,
          published_by UUID NULL,
          created_by UUID NULL,
          updated_by UUID NULL,
          change_reason TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT now(),
          updated_at TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_service_policy_documents_type_status
        ON service_policy_documents (service_key, document_type, status)
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_service_policy_documents_type_published
        ON service_policy_documents (service_key, document_type, published_at)
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS service_policy_documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS service_legal_profiles`);
  }
}
