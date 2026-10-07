import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1
 * 설계: docs/design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md §2
 *
 *   neture_pharmacy_memberships   Neture 기본 가입 원장. organization_id UNIQUE = 약국 1 : 매장 1
 *   semi_franchises               세미프랜차이즈 = serviceKey 가 아니라 데이터 행. 'pharmacy' 1행 seed
 *   semi_franchise_memberships    약국 조직 단위 세미프랜차이즈 가입
 *   semi_franchise_operators      운영자 ↔ 담당 세미프랜차이즈 (neture:operator ∧ 활성 행)
 *   supply_proposals              SPO 하위 복수 공급 제안(가격 · 대상 · 승인만)
 *   semi_franchise_contents       세미프랜차이즈 담당 운영자가 게시하는 콘텐츠(가입 약국만 열람 · 내 매장 사본)
 *
 * 기존 테이블:
 *   store_cart_items              + supply_proposal_id, seller_recruitment_id (선택한 제안)
 *   seller_recruitments           + semi_franchise_id, supply_unit_price
 *   seller_recruitment_applications + applicant_organization_id (참여 단위 = 약국 조직)
 *   organization_product_listings idx_org_listing_unique_v2 → **이 migration 에서 바꾸지 않는다**(전체 UNIQUE 유지).
 *                                 WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: 부분 UNIQUE 로 바꾸면 구버전 API 의 predicate 없는
 *                                 `ON CONFLICT (organization_id, service_key, offer_id)` 가 실패해 API 롤백이 불가능해진다.
 *                                 새 API 의 `ON CONFLICT ... WHERE service_key <> 'neture-event-offer'` 는 전체 UNIQUE 로도
 *                                 추론되므로 두 버전이 함께 동작한다. 부분 UNIQUE 전환은 새 API 안정화 뒤 별도 migration(2단계)이며,
 *                                 그때까지 세미프랜차이즈 이벤트 재신청 · 같은 제품 복수 이벤트는 API 가 막는다
 *                                 (semi-franchise-event.service.ts `EVENT_REAPPLY_NOT_YET_SUPPORTED`).
 *
 * 만들지 않는 것: checkout_orders 컬럼 · 독립 *_orders / *_payments · neture_orders / o4o_payments
 * unique 인덱스(멱등은 코드의 advisory lock + 조건부 UPDATE).
 */
export class CreateNeturePharmacyCommerce1791200000000 implements MigrationInterface {
  name = 'CreateNeturePharmacyCommerce1791200000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE neture_pharmacy_memberships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      applicant_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','active','rejected','suspended','terminated')),
      pharmacy_name varchar(255) NOT NULL,
      business_number varchar(20) NOT NULL,
      pharmacist_license_number varchar(30) NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
      decided_at timestamptz,
      reason text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_neture_pharmacy_memberships_org
      ON neture_pharmacy_memberships (organization_id)`);
    // 진행 중인 가입은 사업자번호당 하나.
    await q.query(`CREATE UNIQUE INDEX uq_neture_pharmacy_memberships_bizno_live
      ON neture_pharmacy_memberships (business_number)
      WHERE status IN ('pending','active','suspended')`);
    await q.query(`CREATE INDEX idx_neture_pharmacy_memberships_status
      ON neture_pharmacy_memberships (status)`);
    await q.query(`CREATE INDEX idx_neture_pharmacy_memberships_applicant
      ON neture_pharmacy_memberships (applicant_user_id)`);

    await q.query(`CREATE TABLE semi_franchises (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key varchar(64) NOT NULL,
      name varchar(255) NOT NULL,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
      payment_receiver_key varchar(100),
      community_key varchar(100),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_semi_franchises_key_lower CHECK (key = lower(key))
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_semi_franchises_key ON semi_franchises (key)`);
    await q.query(`CREATE UNIQUE INDEX uq_semi_franchises_org ON semi_franchises (organization_id)`);
    await q.query(`CREATE UNIQUE INDEX uq_semi_franchises_community_key
      ON semi_franchises (community_key) WHERE community_key IS NOT NULL`);

    await q.query(`CREATE TABLE semi_franchise_memberships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      semi_franchise_id uuid NOT NULL REFERENCES semi_franchises(id) ON DELETE CASCADE,
      organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','active','rejected','suspended','terminated')),
      applied_by uuid REFERENCES users(id) ON DELETE SET NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
      decided_at timestamptz,
      reason text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_semi_franchise_memberships_member
      ON semi_franchise_memberships (semi_franchise_id, organization_id)`);
    await q.query(`CREATE INDEX idx_semi_franchise_memberships_org
      ON semi_franchise_memberships (organization_id, status)`);
    await q.query(`CREATE INDEX idx_semi_franchise_memberships_sf
      ON semi_franchise_memberships (semi_franchise_id, status)`);

    await q.query(`CREATE TABLE semi_franchise_operators (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      semi_franchise_id uuid NOT NULL REFERENCES semi_franchises(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
      assigned_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_semi_franchise_operators_active
      ON semi_franchise_operators (semi_franchise_id, user_id) WHERE revoked_at IS NULL`);
    await q.query(`CREATE INDEX idx_semi_franchise_operators_user
      ON semi_franchise_operators (user_id) WHERE revoked_at IS NULL`);

    await q.query(`CREATE TABLE supply_proposals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id uuid NOT NULL REFERENCES supplier_product_offers(id) ON DELETE CASCADE,
      semi_franchise_id uuid NOT NULL REFERENCES semi_franchises(id),
      target_organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
      unit_price integer NOT NULL CHECK (unit_price > 0),
      note text,
      status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','ended')),
      requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
      decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
      decided_at timestamptz,
      reason text,
      ended_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX idx_supply_proposals_offer ON supply_proposals (offer_id)`);
    await q.query(`CREATE INDEX idx_supply_proposals_sf_status ON supply_proposals (semi_franchise_id, status)`);

    await q.query(`CREATE TABLE semi_franchise_contents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      semi_franchise_id uuid NOT NULL REFERENCES semi_franchises(id) ON DELETE CASCADE,
      title varchar(300) NOT NULL,
      summary text,
      body text,
      thumbnail_url text,
      attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
      published_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX idx_semi_franchise_contents_sf_status
      ON semi_franchise_contents (semi_franchise_id, status)`);

    await q.query(`ALTER TABLE store_cart_items
      ADD COLUMN supply_proposal_id uuid,
      ADD COLUMN seller_recruitment_id uuid`);

    await q.query(`ALTER TABLE seller_recruitments
      ADD COLUMN semi_franchise_id uuid REFERENCES semi_franchises(id),
      ADD COLUMN supply_unit_price integer CHECK (supply_unit_price IS NULL OR supply_unit_price > 0)`);
    // 모집 유일성에 대상 세미프랜차이즈를 포함한다(세미프랜차이즈별 모집 1건). NULL 끼리는 같은 값으로 본다.
    await q.query(`ALTER TABLE seller_recruitments DROP CONSTRAINT IF EXISTS uq_seller_recruitments_product_seller_service`);
    await q.query(`CREATE UNIQUE INDEX uq_seller_recruitments_product_seller_service
      ON seller_recruitments (product_id, seller_id, service_id, semi_franchise_id) NULLS NOT DISTINCT`);
    await q.query(`ALTER TABLE seller_recruitment_applications
      ADD COLUMN applicant_organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE`);
    await q.query(`CREATE UNIQUE INDEX uq_seller_recruitment_applications_org
      ON seller_recruitment_applications (recruitment_id, applicant_organization_id)
      WHERE applicant_organization_id IS NOT NULL`);

    // pharmacy 세미프랜차이즈 + 운영 조직(이벤트 원장 소유). 수취 주체 · 커뮤니티는 미정(NULL).
    await q.query(`INSERT INTO organizations (name, code, type, "isActive")
      VALUES ('pharmacy 세미프랜차이즈 운영', 'semi-franchise-pharmacy', 'semi_franchise', true)
      ON CONFLICT (code) DO NOTHING`);
    await q.query(`INSERT INTO semi_franchises (key, name, organization_id)
      SELECT 'pharmacy', 'pharmacy', o.id FROM organizations o WHERE o.code = 'semi-franchise-pharmacy'`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS uq_seller_recruitment_applications_org`);
    await q.query(`ALTER TABLE seller_recruitment_applications DROP COLUMN IF EXISTS applicant_organization_id`);
    await q.query(`DROP INDEX IF EXISTS uq_seller_recruitments_product_seller_service`);
    await q.query(`ALTER TABLE seller_recruitments
      DROP COLUMN IF EXISTS semi_franchise_id, DROP COLUMN IF EXISTS supply_unit_price`);
    await q.query(`ALTER TABLE seller_recruitments
      ADD CONSTRAINT uq_seller_recruitments_product_seller_service UNIQUE (product_id, seller_id, service_id)`);
    await q.query(`ALTER TABLE store_cart_items
      DROP COLUMN IF EXISTS supply_proposal_id, DROP COLUMN IF EXISTS seller_recruitment_id`);
    await q.query(`DROP TABLE IF EXISTS semi_franchise_contents`);
    await q.query(`DROP TABLE IF EXISTS supply_proposals`);
    await q.query(`DROP TABLE IF EXISTS semi_franchise_operators`);
    await q.query(`DROP TABLE IF EXISTS semi_franchise_memberships`);
    await q.query(`DROP TABLE IF EXISTS semi_franchises`);
    await q.query(`DROP TABLE IF EXISTS neture_pharmacy_memberships`);
    await q.query(`DELETE FROM organizations WHERE code = 'semi-franchise-pharmacy'`);
  }
}
