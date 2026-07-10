import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-FOUNDATION-V1 (additive, 상태 기반)
 *
 * product_masters 에 상품 이용 상태 컬럼 `status` 추가.
 *   ACTIVE | SUSPENDED | ARCHIVED, 기본값 ACTIVE.
 *
 * 배경:
 *   선행 IR-O4O-ADMIN-PRODUCT-MANAGEMENT-SIMPLE-OPERATIONS-AUDIT-V1 (9a314f4b4) 결과,
 *   ProductMaster 에는 ACTIVE/SUSPENDED/ARCHIVED 를 표현할 필드가 없다(soft-delete·status 부재).
 *   유일한 status 유사 컬럼 `product_data_status` 는 의료기기 정제 파이프라인 마커라 재사용 부적합.
 *   → 의미 충돌 없는 단일 enum 컬럼 신설(B안 채택).
 *
 * 불변 보장:
 *   - additive 컬럼 1개만 추가. DB DEFAULT 'ACTIVE' 로 기존 행 전부 ACTIVE(별도 backfill 스크립트 없음).
 *   - 신규 상품 생성 시 애플리케이션 별도 처리 없이 DB 기본값 사용.
 *   - `product_data_status` 등 기존 컬럼·데이터 무변경. 참여자/타 서비스 데이터 무변경.
 *   - 상태 변경 API·배지·필터·버튼·감사로그는 이 WO 범위 밖(후속 STATUS-ACTIONS WO).
 *   - 멱등(IF NOT EXISTS).
 */
export class AddStatusToProductMasters20261227000000 implements MigrationInterface {
  name = 'AddStatusToProductMasters20261227000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_masters
        ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_masters
        DROP COLUMN IF EXISTS status
    `);
  }
}
