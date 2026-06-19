import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1
 *
 * 판매자 모집(neture_partner_recruitments)을 "서비스당 1 row" 모델로 확장한다.
 * 기존 UNIQUE(product_id, seller_id) → UNIQUE(product_id, seller_id, service_id).
 * 같은 상품×판매자라도 서비스별로 독립 모집 row(각자 exposure_status) 를 가질 수 있게 한다.
 *
 * - 기존 UNIQUE 는 마이그레이션 2026020100001 에서 이름 미지정(auto-gen)으로 생성됨 →
 *   pg_constraint 에서 (product_id, seller_id) 정확 일치 UNIQUE 를 동적으로 찾아 drop.
 * - 신규 3-컬럼 UNIQUE 추가(이름 고정). service_id NULL 은 Postgres 상 distinct 이나
 *   신규/기존 row 는 service_id 가 항상 설정되어 영향 없음.
 * - 멱등: drop 은 존재 시에만, add 는 미존재 시에만.
 * - 기존 데이터 충돌 없음: 종전 UNIQUE(product_id, seller_id) 로 (product,seller) 당 최대 1 row.
 */
export class ExpandRecruitmentUniqueToService20260619000000
  implements MigrationInterface
{
  name = 'ExpandRecruitmentUniqueToService20260619000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) 기존 UNIQUE(product_id, seller_id) 동적 탐색 후 drop
    await queryRunner.query(`
      DO $$
      DECLARE cname text;
      BEGIN
        SELECT con.conname INTO cname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'neture_partner_recruitments'
          AND con.contype = 'u'
          AND (
            SELECT array_agg(att.attname ORDER BY att.attname)
            FROM pg_attribute att
            WHERE att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
          ) = ARRAY['product_id','seller_id']
        LIMIT 1;
        IF cname IS NOT NULL THEN
          EXECUTE format('ALTER TABLE neture_partner_recruitments DROP CONSTRAINT %I', cname);
        END IF;
      END $$;
    `);

    // 2) 신규 UNIQUE(product_id, seller_id, service_id) 추가 (멱등)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'UQ_neture_partner_recruitments_product_seller_service'
        ) THEN
          ALTER TABLE neture_partner_recruitments
            ADD CONSTRAINT UQ_neture_partner_recruitments_product_seller_service
            UNIQUE (product_id, seller_id, service_id);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 3-컬럼 UNIQUE 제거 후 원래 2-컬럼 UNIQUE 복원
    await queryRunner.query(`
      ALTER TABLE neture_partner_recruitments
        DROP CONSTRAINT IF EXISTS UQ_neture_partner_recruitments_product_seller_service;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'neture_partner_recruitments' AND con.contype = 'u'
            AND (
              SELECT array_agg(att.attname ORDER BY att.attname)
              FROM pg_attribute att
              WHERE att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
            ) = ARRAY['product_id','seller_id']
        ) THEN
          ALTER TABLE neture_partner_recruitments
            ADD CONSTRAINT UQ_neture_partner_recruitments_product_seller
            UNIQUE (product_id, seller_id);
        END IF;
      END $$;
    `);
  }
}
