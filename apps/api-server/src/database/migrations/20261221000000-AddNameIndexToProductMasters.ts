import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-HANDLED-PRODUCTS-STANDARD-PICKER-SERVER-SEARCH-CATEGORY-UX-V1 (P0 성능, additive)
 *
 * product_masters(name) B-tree 인덱스 추가.
 *
 * 배경:
 *   O4O 표준 상품 검색(GET /store/products/search · catalog.service.searchProductMasters)은
 *   검색어가 없을 때 `ORDER BY name ASC LIMIT 20` 으로 조회한다. name 인덱스가 없어
 *   198k 행 전체 seq scan + top-N 정렬이 모달 오픈마다 발생 → 초기 로딩 지연.
 *   name 인덱스가 있으면 empty-q 정렬이 index scan(LIMIT 20)으로 전환된다.
 *
 * 불변 보장:
 *   - 컬럼/데이터 변경 없음 (인덱스만 추가). admin 상품목록(동일 endpoint)에도 동일하게 유익.
 */
export class AddNameIndexToProductMasters20261221000000 implements MigrationInterface {
  name = 'AddNameIndexToProductMasters20261221000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_masters_name
        ON product_masters (name)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_masters_name`);
  }
}
