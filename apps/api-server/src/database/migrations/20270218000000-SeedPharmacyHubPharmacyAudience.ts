/**
 * SeedPharmacyHubPharmacyAudience
 * WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 §4.6
 *
 * Pharmacy-Hub 를 **약국 대상 서비스**로 등록한다.
 *
 * 왜 필요한가:
 *   규제 상품(의약품 등)은 `service_audience_policies.is_pharmacy_target_service = true`
 *   서비스에만 연결할 수 있다 (offer.service.ts assertPharmacyOnlyServiceKeys /
 *   partner-contract.service.ts DRUG_SERVICE_NOT_PHARMACY_AUDIENCE).
 *   row 가 없으면 resolver 는 DEFAULT_PHARMACY_SERVICE_KEYS(['glycopharm','kpa-society'])
 *   fallback 을 쓰므로 pharmacy-hub → false 로 판정되어, 약국 전문 서비스인데도
 *   의약품 연결이 REGULATED_PRODUCT_NON_PHARMACY_SERVICE 로 거부된다.
 *
 * 형태는 20260615160000-CreateServiceAudiencePolicies 의 초기 seed 4행과 동일하다.
 * DDL 없음 — row 1개만 추가한다.
 *
 * 멱등: UQ_service_audience_policies_service_key 기준 ON CONFLICT DO NOTHING.
 *   이미 행이 있으면(운영자가 admin 화면에서 값을 조정한 경우 포함) 덮어쓰지 않는다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPharmacyHubPharmacyAudience20270218000000 implements MigrationInterface {
  name = 'SeedPharmacyHubPharmacyAudience20270218000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO service_audience_policies (service_key, is_pharmacy_target_service, note)
      VALUES ('pharmacy-hub', true, '약국 대상 서비스 (Pharmacy-Hub — 약국 전문 서비스)')
      ON CONFLICT (service_key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM service_audience_policies WHERE service_key = 'pharmacy-hub'`);
  }
}
