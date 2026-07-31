import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-FEATURED-PRODUCTS-TABLE-RECOVERY-V1
 * 선행 감사: WO-O4O-API-SERVER-ORPHANED-MIGRATIONS-RISK-CLASSIFICATION-V1 (P0)
 *
 * 운영 DB 에 없는 `glycopharm_featured_products` 를 복구한다.
 *   GET /api/v1/glycopharm/operator/featured-products?service=..&context=..
 *   → 500 `relation "public.glycopharm_featured_products" does not exist`
 *
 * entity `GlycopharmFeaturedProduct` 는 entities.ts 에 등록되어 있고 라우트도 mount 되어
 * 있으나, 테이블 생성 migration 이 `apps/api-server/src/migrations/`
 * (= 러너 미스캔 orphan 디렉터리) 에 있어 실행된 적이 없다.
 *   orphan: 1738296000000-CreateGlycopharmFeaturedProducts.ts
 *
 * orphan 파일은 이동·수정·삭제하지 않는다(타임스탬프가 적용완료분보다 앞서 정렬됨).
 * 정의는 orphan 복사가 아니라 **현재 활성 entity** 기준으로 맞췄다.
 * id 기본값만 orphan 의 `uuid_generate_v4()`(uuid-ossp 의존) → `gen_random_uuid()`.
 *
 * 적용 직전 운영 census(read-only):
 *   테이블 부재(부분 컬럼 0) · 동명 index/constraint 0 · typeorm_migrations 기록 0 ·
 *   FK 대상 glycopharm_products.id = uuid(호환) · gen_random_uuid() 가용.
 *
 * FK: entity 가 @ManyToOne('GlycopharmProduct') + @JoinColumn({name:'product_id'}) 를
 * 선언하므로 orphan 과 동일하게 glycopharm_products(id) 로 FK 를 만든다.
 * ON DELETE CASCADE — 큐레이션 행은 상품에 종속된 부가 데이터이고, 상품이 사라지면
 * 그 상품을 가리키는 추천 항목도 의미를 잃는다(고아 추천 방지).
 *
 * seed/backfill 없음. INSERT·UPDATE·DELETE 0건. 다른 테이블 무접촉.
 */
const TABLE = 'glycopharm_featured_products';

const EXPECTED_COLUMNS = [
  'id', 'service', 'context', 'product_id', 'position', 'is_active',
  'created_by_user_id', 'created_by_user_name', 'created_at', 'updated_at',
];
const EXPECTED_INDEXES = [
  'IDX_glycopharm_featured_unique',
  'IDX_glycopharm_featured_order',
];
const FK_NAME = 'FK_glycopharm_featured_product';

export class CreateGlycopharmFeaturedProductsTable20270222000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 안전 가드: 이미 존재하는데 현재 entity 와 구조가 어긋나면 자동 ALTER 하지 않고 중지.
    const existing: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1`,
      [TABLE],
    );
    if (existing.length > 0) {
      const present = new Set(existing.map((r) => r.column_name));
      const missing = EXPECTED_COLUMNS.filter((c) => !present.has(c));
      if (missing.length > 0) {
        throw new Error(
          `[CreateGlycopharmFeaturedProductsTable] ABORT: "${TABLE}" 이 이미 존재하지만 컬럼 누락 — ` +
            `${missing.join(', ')}. 자동 ALTER 하지 않는다. 구조 충돌 확인 후 재판단 필요.`,
        );
      }
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glycopharm_featured_products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "service" character varying(50) NOT NULL DEFAULT 'glycopharm',
        "context" character varying(100) NOT NULL DEFAULT 'store-home',
        "product_id" uuid NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by_user_id" uuid,
        "created_by_user_name" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_glycopharm_featured_products" PRIMARY KEY ("id")
      )
    `);

    // entity @Index(['service','context','product_id'], { unique: true })
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_glycopharm_featured_unique"
         ON "glycopharm_featured_products" ("service", "context", "product_id")`,
    );
    // entity @Index(['service','context','position'])
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_glycopharm_featured_order"
         ON "glycopharm_featured_products" ("service", "context", "position")`,
    );

    // FK 는 ADD CONSTRAINT IF NOT EXISTS 를 지원하지 않으므로 존재 확인 후 조건부 생성(멱등).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = '${FK_NAME}'
        ) THEN
          ALTER TABLE "glycopharm_featured_products"
            ADD CONSTRAINT "${FK_NAME}"
            FOREIGN KEY ("product_id") REFERENCES "glycopharm_products"("id")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // 사후 검증: 컬럼 / index / FK 가 실제로 존재해야 한다.
    const after: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1`,
      [TABLE],
    );
    const present = new Set(after.map((r) => r.column_name));
    const missingCols = EXPECTED_COLUMNS.filter((c) => !present.has(c));
    if (missingCols.length > 0) {
      throw new Error(
        `[CreateGlycopharmFeaturedProductsTable] ABORT: 적용 후 컬럼 누락 — ${missingCols.join(', ')}`,
      );
    }

    const idx: Array<{ indexname: string }> = await queryRunner.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1)`,
      [EXPECTED_INDEXES],
    );
    const haveIdx = new Set(idx.map((r) => r.indexname));
    const missingIdx = EXPECTED_INDEXES.filter((i) => !haveIdx.has(i));
    if (missingIdx.length > 0) {
      throw new Error(
        `[CreateGlycopharmFeaturedProductsTable] ABORT: index 누락 — ${missingIdx.join(', ')}`,
      );
    }

    const [fk] = await queryRunner.query(
      `SELECT count(*)::int AS c FROM pg_constraint WHERE conname = $1 AND contype = 'f'`,
      [FK_NAME],
    );
    if (fk.c !== 1) {
      throw new Error(
        `[CreateGlycopharmFeaturedProductsTable] ABORT: FK "${FK_NAME}" 미생성.`,
      );
    }
  }

  /**
   * down: 의도적 no-op.
   *
   * DROP 하면 ① featured-products API 가 즉시 다시 500 으로 회귀하고,
   * ② 운영자가 지정한 추천 상품 큐레이션(노출 순서·활성 상태·지정자 이력)이
   * 복구 불가능하게 사라진다. 롤백이 곧 장애 재발 + 운영 데이터 파괴다.
   * CASCADE 는 어떤 경우에도 쓰지 않는다.
   *
   * 이 기능을 폐기하려면 entity·라우트 제거 결정이 선행되어야 하며,
   * 그 시점에 별도 forward migration 으로 처리하는 것이 올바른 경로다.
   */
  public async down(): Promise<void> {
    // intentionally irreversible — see docblock
  }
}
