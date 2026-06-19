import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NETURE-SUPPLIER-REGISTRATION-PROFILE-CREATION-V1
 *
 * 기존 Neture 공급자(service_memberships.role='supplier') 중 neture_suppliers row 가
 * 없는 사용자에게 PENDING 프로필 row 를 보정 생성한다.
 *
 * 배경: 종전에는 회원 승인(step1) 시점에만 neture_suppliers 가 생성되어,
 *       가입~승인 사이(membership=pending)이거나 누락된 사용자는 프로필 row 가 없었다.
 *       가입 write-path 에 즉시 생성을 추가(auth-register.controller)했고, 본 마이그레이션은
 *       기존 누락분을 보정한다.
 *
 * 멱등: NOT EXISTS + ON CONFLICT (user_id) DO NOTHING. 재실행 안전.
 * 기존 승인완료(ACTIVE) 공급자는 건드리지 않는다(이미 row 존재 → skip).
 * seed 는 users.businessInfo snapshot. organization 연동은 본 보정 범위 외(2차 — 승인/프로필 편집 시 연동).
 * status 는 PENDING 으로만 생성(승인 상태를 임의로 부여하지 않음 — 2단계 모델 준수).
 */
export class BackfillNetureSupplierProfiles20260618000000
  implements MigrationInterface
{
  name = 'BackfillNetureSupplierProfiles20260618000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO neture_suppliers (
        user_id, slug, contact_email, contact_phone,
        representative_name, manager_name, manager_phone,
        business_type, tax_invoice_email, status, created_at, updated_at
      )
      SELECT
        u.id,
        'supplier-' || substring(u.id::text, 1, 8),
        u.email,
        u.phone,
        COALESCE(u."businessInfo"->>'representativeName', u."businessInfo"->>'ceoName', u.name),
        u."businessInfo"->>'contactName',
        COALESCE(u."businessInfo"->>'managerPhone', u.phone),
        u."businessInfo"->>'businessType',
        u."businessInfo"->>'taxInvoiceEmail',
        'PENDING', NOW(), NOW()
      FROM service_memberships sm
      JOIN users u ON u.id = sm.user_id
      WHERE sm.service_key = 'neture'
        AND sm.role = 'supplier'
        AND NOT EXISTS (
          SELECT 1 FROM neture_suppliers ns WHERE ns.user_id = u.id
        )
      ON CONFLICT (user_id) DO NOTHING;
    `);
  }

  public async down(): Promise<void> {
    // 보정 생성된 PENDING row 와 정상 생성된 PENDING row 를 구분할 수 없으므로 down 은 no-op.
    // (롤백 시 정상 데이터를 삭제할 위험 회피 — 본 마이그레이션은 누락 보정만 수행)
  }
}
