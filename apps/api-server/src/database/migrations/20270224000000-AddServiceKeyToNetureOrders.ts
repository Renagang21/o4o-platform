/**
 * AddServiceKeyToNetureOrders
 * WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1
 *
 * 공용 fulfillment 원장 `public.neture_orders` 에 **서비스 경계**를 부여한다.
 *
 * 배경:
 *   공급자 주문 조회·통계는 `spo.supplier_id` 단일 조건이라 서비스 구분이 없다.
 *   Pharmacy-Hub 주문을 bridge 하면 Neture 공급자 화면·통계에 그대로 혼입된다
 *   (IR-PHARMACY-HUB-PAYMENT-AND-FULFILLMENT-BRIDGE-V1 §4).
 *
 * 설계 판단 — metadata 가 아니라 **컬럼**:
 *   - 공급자 목록·카운트·통계 쿼리마다 WHERE 에 들어가는 축이라 인덱스가 필요하다.
 *     jsonb 추출(`metadata->>'serviceKey'`)을 매 쿼리 WHERE 에 두는 것보다 컬럼이 낫다.
 *   - `DEFAULT 'neture'` 가 "미표기 주문 = neture" 규칙을 **구조적으로** 보장한다.
 *     이후 어떤 경로가 값을 세팅하지 않아도 기존 Neture 의미가 유지된다.
 *   - 적용 시점 `public.neture_orders` 는 **0행**이라 backfill 위험이 없다(조사에서 확인).
 *
 * 신규 테이블 0. 기존 주문 상태·배송·결제 계약 무변경.
 * 멱등: 컬럼·인덱스 모두 IF NOT EXISTS.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceKeyToNetureOrders20270224000000 implements MigrationInterface {
  name = 'AddServiceKeyToNetureOrders20270224000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) 서비스 축 컬럼 — 기존/미표기 행은 전부 'neture' 로 해석된다
    await queryRunner.query(`
      ALTER TABLE public.neture_orders
        ADD COLUMN IF NOT EXISTS service_key varchar(50) NOT NULL DEFAULT 'neture'
    `);

    // 2) 혹시 NULL 로 들어간 행이 있으면 'neture' 로 정규화 (방어 — DEFAULT 로 발생하지 않음)
    await queryRunner.query(`
      UPDATE public.neture_orders SET service_key = 'neture' WHERE service_key IS NULL
    `);

    // 3) 공급자 조회는 (service_key, created_at DESC) 로 정렬·필터한다
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_orders_service_key
        ON public.neture_orders (service_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_orders_service_key_created_at
        ON public.neture_orders (service_key, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_neture_orders_service_key_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_neture_orders_service_key`);
    await queryRunner.query(`ALTER TABLE public.neture_orders DROP COLUMN IF EXISTS service_key`);
  }
}
