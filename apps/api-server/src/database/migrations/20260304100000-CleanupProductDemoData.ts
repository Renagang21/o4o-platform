import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-LIBRARY-EDIT-V1: 상품 데모 데이터 정리
 *
 * 삭제 대상:
 * 1. seed-demo.controller.ts가 생성한 데모 데이터 (UUID d0000000-de*)
 * 2. seed-sample-products.ts가 생성한 데이터
 *
 * 안전 장치: WHERE 조건으로 데모 데이터만 타겟팅
 * PL/pgSQL EXCEPTION 블록으로 존재하지 않는 테이블/스키마 안전 처리
 */
export class CleanupProductDemoData1709560000000 implements MigrationInterface {
  name = 'CleanupProductDemoData1709560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PL/pgSQL 안전 삭제 — 테이블/스키마 없어도 트랜잭션 유지
    await queryRunner.query(`
      DO $$ BEGIN
        -- 1. seed-demo.controller 데모 데이터 삭제 (UUID 패턴: d0000000-de0X-4000-*)
        BEGIN DELETE FROM checkout_orders WHERE id::text LIKE 'd0000000-de05-4000-%'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM care_coaching_sessions WHERE id::text LIKE 'd0000000-de06-4000-%'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM care_kpi_snapshots WHERE id::text LIKE 'd0000000-de07-4000-%'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM glycopharm_products WHERE id::text LIKE 'd0000000-de04-4000-%'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM glucoseview_customers WHERE id::text LIKE 'd0000000-de03-4000-%'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM pharmacies WHERE id::text LIKE 'd0000000-de01-4000-%'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM organizations WHERE name LIKE '[DEMO]%' AND id::text LIKE 'd0000000-de01-4000-%'; EXCEPTION WHEN OTHERS THEN NULL; END;

        -- 2. seed-sample-products 시드 데이터 삭제 (공급사명 타겟팅)
        BEGIN DELETE FROM glycopharm_products WHERE supplier_name IN ('메디팜코리아','헬스앤뉴트리션','더마케어코스메틱','라이프헬스케어','이노베이션랩'); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM neture.neture_products WHERE supplier_name IN ('메디팜코리아','헬스앤뉴트리션','더마케어코스메틱','라이프헬스케어','이노베이션랩'); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM cosmetics.cosmetics_products WHERE brand_id IN (SELECT id FROM cosmetics.cosmetics_brands WHERE name IN ('메디팜코리아','헬스앤뉴트리션','더마케어코스메틱','라이프헬스케어','이노베이션랩')); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM cosmetics.cosmetics_brands WHERE name IN ('메디팜코리아','헬스앤뉴트리션','더마케어코스메틱','라이프헬스케어','이노베이션랩'); EXCEPTION WHEN OTHERS THEN NULL; END;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 데모 데이터 복원 불필요 — 시드 스크립트 자체를 삭제함
  }
}
