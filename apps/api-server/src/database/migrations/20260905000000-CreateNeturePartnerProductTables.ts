import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-ENTITY-CREATE-MIGRATION-PHASE1-V1
 *
 * Production 누락 테이블 복구:
 *   - neture.neture_partners    (NeturePartner entity 기준)
 *   - neture.neture_products    (NetureProduct entity 기준)
 *   - neture.neture_product_logs (NetureProductLog entity 기준)
 *
 * 배경:
 *   `neture` schema는 20260902500000-CreateNetureOrders 에서 이미 생성됨.
 *   세 테이블은 CREATE TABLE 마이그레이션이 존재하지 않아 Production에서
 *   "relation neture.neture_partners does not exist" 오류가 반복 발생 중.
 *
 * 설계 원칙:
 *   - 모든 DDL은 IF NOT EXISTS — 재실행 시 멱등
 *   - FK 제약 없음 — 관련 테이블 정합성이 완전하지 않으므로 Phase 2에서 검토
 *   - TypeORM enum 타입 미사용 — varchar + DEFAULT로 처리 (배포 순서 독립성)
 *   - neture schema는 IF NOT EXISTS 재생성으로 안전하게 포함
 */
export class CreateNeturePartnerProductTables20260905000000 implements MigrationInterface {
  name = 'CreateNeturePartnerProductTables20260905000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ────────────────────────────────────────────────────────────────────────
    // 0. neture schema (이미 존재할 수 있으므로 IF NOT EXISTS)
    // ────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS neture`);

    // ────────────────────────────────────────────────────────────────────────
    // 1. neture.neture_partners
    //    Entity: routes/neture/entities/neture-partner.entity.ts
    //    Enums (varchar 저장): type → 'seller'|'supplier'|'partner'
    //                         status → 'pending'|'active'|'suspended'|'inactive'
    // ────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture.neture_partners (
        id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        name          varchar(200) NOT NULL,
        business_name varchar(200),
        business_number varchar(50),
        type          varchar(20)  NOT NULL DEFAULT 'partner',
        status        varchar(20)  NOT NULL DEFAULT 'pending',
        description   text,
        logo          varchar(500),
        website       varchar(255),
        contact       jsonb,
        address       jsonb,
        metadata      jsonb,
        user_id       uuid,
        created_by    uuid,
        updated_by    uuid,
        created_at    timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // neture_partners 인덱스 — entity @Index() 컬럼
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_partners_name
        ON neture.neture_partners (name)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_partners_business_number
        ON neture.neture_partners (business_number)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_partners_type
        ON neture.neture_partners (type)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_partners_status
        ON neture.neture_partners (status)
    `);

    // ────────────────────────────────────────────────────────────────────────
    // 2. neture.neture_products
    //    Entity: routes/neture/entities/neture-product.entity.ts
    //    Enums (varchar 저장): category → 'healthcare'|'beauty'|'food'|'lifestyle'|'other'
    //                         status   → 'draft'|'visible'|'hidden'|'sold_out'
    //                         currency → 'KRW'|'USD'
    //    sku: UNIQUE (entity에 unique: true 명시)
    // ────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture.neture_products (
        id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id        uuid,
        name              varchar(200) NOT NULL,
        subtitle          varchar(500),
        description       text,
        short_description text,
        manufacturer      varchar(200),
        origin_country    varchar(100),
        legal_category    varchar(100),
        certification_ids jsonb,
        usage_info        text,
        caution_info      text,
        category          varchar(30)  NOT NULL DEFAULT 'other',
        status            varchar(20)  NOT NULL DEFAULT 'draft',
        base_price        int          NOT NULL DEFAULT 0,
        sale_price        int,
        currency          varchar(10)  NOT NULL DEFAULT 'KRW',
        stock             int          NOT NULL DEFAULT 0,
        sku               varchar(100) UNIQUE,
        barcodes          jsonb,
        images            jsonb,
        tags              jsonb,
        metadata          jsonb,
        is_featured       boolean      NOT NULL DEFAULT false,
        view_count        int          NOT NULL DEFAULT 0,
        created_by        uuid,
        updated_by        uuid,
        created_at        timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at        timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // neture_products 인덱스 — entity @Index() 컬럼
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_products_partner_id
        ON neture.neture_products (partner_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_products_name
        ON neture.neture_products (name)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_products_category
        ON neture.neture_products (category)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_products_status
        ON neture.neture_products (status)
    `);
    // sku UNIQUE 제약은 CREATE TABLE 내 UNIQUE 키워드로 처리됨
    // (TypeORM @Index() + unique:true → 별도 CREATE UNIQUE INDEX 불필요)

    // ────────────────────────────────────────────────────────────────────────
    // 3. neture.neture_product_logs
    //    Entity: routes/neture/entities/neture-product-log.entity.ts
    //    Enum (varchar 저장): action → 'create'|'update'|'status_change'|'price_change'|'delete'
    //    created_at 전용 (updated_at 없음 — audit log 특성)
    // ────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture.neture_product_logs (
        id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id   uuid         NOT NULL,
        action       varchar(30)  NOT NULL,
        before       jsonb,
        after        jsonb,
        note         text,
        performed_by uuid,
        ip_address   varchar(50),
        created_at   timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // neture_product_logs 인덱스 — entity @Index() 컬럼
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_product_logs_product_id
        ON neture.neture_product_logs (product_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_product_logs_action
        ON neture.neture_product_logs (action)
    `);

    console.log(
      '[Migration] Created neture.neture_partners + neture.neture_products + neture.neture_product_logs (with indexes)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS neture.neture_product_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS neture.neture_products`);
    await queryRunner.query(`DROP TABLE IF EXISTS neture.neture_partners`);
    // neture schema는 다른 테이블(neture_order_items 등)이 사용하므로 DROP SCHEMA 하지 않음
  }
}
