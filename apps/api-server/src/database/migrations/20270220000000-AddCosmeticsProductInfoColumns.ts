import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-COSMETICS-PRODUCTS-500-RECOVERY-V1
 * 선행 감사: WO-O4O-COSMETICS-PRODUCTS-500-ROOT-CAUSE-AUDIT-V1
 *
 * `CosmeticsProduct` entity 가 선언하지만 운영 `cosmetics.cosmetics_products` 에는 없는
 * 10개 컬럼을 추가한다. 없어서 `GET /api/v1/cosmetics/products` 가
 * `QueryFailedError: column product.subtitle does not exist` 로 전부 실패했다.
 *
 * 왜 지금 필요한가:
 *   entity 컬럼과 이를 추가하는 ALTER 는 커밋 e8e3ab0d8(2026-01-29, WO-PRODUCT-DB-CLEANUP-FOR-SITE-V1)
 *   에서 함께 작성됐으나, ALTER 가 `apps/api-server/src/migrations/1738171200000-AddProductInfoFields.ts`
 *   — 즉 **migration 러너가 스캔하지 않는 orphan 디렉터리** — 에 들어가 한 번도 실행되지 않았다.
 *   러너는 `src/database/migrations` 만 스캔한다.
 *
 * 기존 orphan 파일은 이동·수정·삭제하지 않는다(이력 보존). 그 파일의 타임스탬프
 * 1738171200000 은 이미 적용된 다수 migration 보다 앞서 정렬되므로 옮기면 순서가 꼬인다.
 * 대신 최신 타임스탬프로 동등한 forward migration 을 새로 추가한다.
 *
 * 적용 직전 운영 census(read-only, information_schema):
 *   cosmetics_products 컬럼 16개 — 아래 10개는 **전부 부재**.
 *   행 수: products 0 / brands 0 / lines 0 → 데이터 손실 위험 없음.
 *   기존 index: pkey + brand_id/line_id/name/status (sku index 없음).
 *
 * 본 migration 은 cosmetics_products 외의 테이블을 건드리지 않는다.
 * (orphan 파일은 neture_products·glycopharm_products 도 함께 바꿨으나, 두 서비스의 상품 API 는
 *  현재 정상 동작하므로 본 복구 범위에서 제외한다.)
 */
const TABLE = 'cosmetics.cosmetics_products';
const EXPECTED_COLUMNS = [
  'subtitle',
  'short_description',
  'manufacturer',
  'origin_country',
  'legal_category',
  'certification_ids',
  'usage_info',
  'caution_info',
  'sku',
  'barcodes',
];

export class AddCosmeticsProductInfoColumns20270220000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable(TABLE);
    if (!exists) {
      throw new Error(
        `[AddCosmeticsProductInfoColumns] ABORT: ${TABLE} 이 존재하지 않는다. 선행 스키마 확인 필요.`,
      );
    }

    // entity(cosmetics-product.entity.ts) 정의와 타입을 일치시킨다.
    // ADD COLUMN IF NOT EXISTS — 일부/전부 이미 존재하는 환경에서도 안전(멱등).
    await queryRunner.query(`
      ALTER TABLE ${TABLE}
        ADD COLUMN IF NOT EXISTS subtitle VARCHAR(500),
        ADD COLUMN IF NOT EXISTS short_description TEXT,
        ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(200),
        ADD COLUMN IF NOT EXISTS origin_country VARCHAR(100),
        ADD COLUMN IF NOT EXISTS legal_category VARCHAR(100),
        ADD COLUMN IF NOT EXISTS certification_ids JSONB,
        ADD COLUMN IF NOT EXISTS usage_info TEXT,
        ADD COLUMN IF NOT EXISTS caution_info TEXT,
        ADD COLUMN IF NOT EXISTS sku VARCHAR(100),
        ADD COLUMN IF NOT EXISTS barcodes JSONB
    `);

    // entity 의 sku 는 unique + indexed. UNIQUE 를 ADD COLUMN 인라인으로 주면
    // 재실행 시 제약 중복이 생길 수 있어 IF NOT EXISTS 를 쓸 수 있는 index 로 분리한다.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cosmetics_products_sku"
        ON ${TABLE} (sku) WHERE sku IS NOT NULL
    `);

    // 사후 검증: 10개 컬럼이 모두 존재해야 한다.
    const rows: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'cosmetics' AND table_name = 'cosmetics_products'`,
    );
    const present = new Set(rows.map((r) => r.column_name));
    const missing = EXPECTED_COLUMNS.filter((c) => !present.has(c));
    if (missing.length > 0) {
      throw new Error(
        `[AddCosmeticsProductInfoColumns] ABORT: 적용 후에도 컬럼 누락 — ${missing.join(', ')}`,
      );
    }
  }

  /**
   * down: 의도적 no-op.
   *
   * 이 10개 컬럼은 entity 가 항상 SELECT 하는 컬럼이다. 되돌리면 곧바로
   * `column product.subtitle does not exist` 로 상품 조회가 다시 전면 실패한다
   * — 즉 롤백이 결함 재발과 같다.
   *
   * 또한 DROP COLUMN 은 그 사이 적재된 상품 정보(제조사·용법·주의사항·SKU·바코드)를
   * 복구 불가능하게 삭제한다. 광범위한 DROP/CASCADE 는 사용하지 않는다는 원칙에도 어긋난다.
   *
   * 스키마를 되돌려야 한다면 entity 에서 해당 필드를 제거하는 결정이 선행되어야 하며,
   * 그 시점에 별도 forward migration 으로 처리하는 것이 올바른 경로다.
   */
  public async down(): Promise<void> {
    // intentionally irreversible — see docblock
  }
}
