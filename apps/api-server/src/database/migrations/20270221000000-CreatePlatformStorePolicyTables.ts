import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PLATFORM-STORE-POLICY-TABLES-RECOVERY-V1
 * 선행 감사: WO-O4O-API-SERVER-ORPHANED-MIGRATIONS-RISK-CLASSIFICATION-V1 (P0)
 *
 * 운영 DB 에 없는 Platform Store 정책·결제설정 테이블 2개를 복구한다.
 *   - platform_store_policies        → `GET /api/v1/stores/:slug/policies` (공개) 가 500
 *     (`relation "platform_store_policies" does not exist`)
 *   - platform_store_payment_configs → owner 전용 결제설정 조회·저장 경로가 같은 결함군
 *
 * 두 entity 는 `apps/api-server/src/database/entities.ts` 에 등록되어 있고 라우트도 mount 되어
 * 있으나, 테이블을 만드는 migration 이 `apps/api-server/src/migrations/`
 * (= 러너가 스캔하지 않는 orphan 디렉터리) 에 있어 실행된 적이 없다.
 *   orphan: 1771200000003-CreatePlatformStorePolicies.ts
 *           1771200000004-CreatePlatformStorePaymentConfigs.ts
 *
 * orphan 파일은 이동·수정·삭제하지 않는다. 타임스탬프 1771200000003/4 는 이미 적용된 다수
 * migration 보다 앞서 정렬되므로 옮기면 순서가 꼬인다. 대신 최신 타임스탬프로 새로 작성한다.
 * 정의는 orphan 을 그대로 베끼지 않고 **현재 활성 entity** 기준으로 맞췄다
 * (packages/platform-core/src/store-policy/entities/*.entity.ts).
 * 다만 id 기본값은 orphan 의 `uuid_generate_v4()`(uuid-ossp 확장 의존) 대신
 * 프로젝트 최신 관례이자 운영에서 가용 확인된 `gen_random_uuid()` 를 쓴다.
 *
 * 적용 직전 운영 census(read-only):
 *   두 테이블 모두 부재(부분 컬럼 0개) · 동명 index/constraint 0건 ·
 *   typeorm_migrations 기록 0건 · gen_random_uuid() 가용 ·
 *   platform_store_slugs.store_id=uuid, service_key=varchar(50) 로 entity 와 정합.
 *
 * FK 는 만들지 않는다 — 두 entity 모두 relation 을 선언하지 않으며, store_id 는
 * 서비스별 매장 테이블을 가리키는 논리 참조라 단일 FK 대상이 없다(slug 테이블과 동일한 방식).
 * 기본 정책행·결제설정행을 자동 생성하지 않는다. backfill/UPDATE/DELETE 없음.
 */
const TABLES = ['platform_store_policies', 'platform_store_payment_configs'] as const;

const EXPECTED: Record<string, string[]> = {
  platform_store_policies: [
    'id', 'store_id', 'service_key', 'terms_of_service', 'privacy_policy',
    'refund_policy', 'shipping_policy', 'is_active', 'version', 'created_at', 'updated_at',
  ],
  platform_store_payment_configs: [
    'id', 'store_id', 'service_key', 'provider', 'mode', 'merchant_id',
    'api_key', 'api_secret', 'is_active', 'version', 'created_at', 'updated_at',
  ],
};

const EXPECTED_INDEXES = [
  'idx_platform_store_policies_store_service',
  'idx_platform_store_policies_is_active',
  'idx_platform_store_payment_configs_store_service',
  'idx_platform_store_payment_configs_is_active',
];

export class CreatePlatformStorePolicyTables20270221000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 안전 가드: 이미 존재하는 테이블이 현재 entity 와 충돌하는 구조인지 먼저 확인한다.
    // 컬럼이 하나라도 어긋나면 자동 ALTER 하지 않고 중지한다(데이터 변환 금지).
    for (const table of TABLES) {
      const existing: Array<{ column_name: string }> = await queryRunner.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      );
      if (existing.length === 0) continue; // 부재 — 아래에서 생성
      const present = new Set(existing.map((r) => r.column_name));
      const missing = EXPECTED[table].filter((c) => !present.has(c));
      if (missing.length > 0) {
        throw new Error(
          `[CreatePlatformStorePolicyTables] ABORT: "${table}" 이 이미 존재하지만 컬럼 누락 — ` +
            `${missing.join(', ')}. 자동 ALTER 하지 않는다. 구조 충돌 확인 후 재판단 필요.`,
        );
      }
    }

    // platform_store_policies — entity: PlatformStorePolicy
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_store_policies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "store_id" uuid NOT NULL,
        "service_key" character varying(50) NOT NULL,
        "terms_of_service" text,
        "privacy_policy" text,
        "refund_policy" text,
        "shipping_policy" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_store_policies" PRIMARY KEY ("id")
      )
    `);

    // platform_store_payment_configs — entity: PlatformStorePaymentConfig
    // api_key / api_secret 은 애플리케이션에서 AES-256-CBC 로 암호화해 저장한다(평문 아님).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_store_payment_configs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "store_id" uuid NOT NULL,
        "service_key" character varying(50) NOT NULL,
        "provider" character varying(50) NOT NULL,
        "mode" character varying(10) NOT NULL DEFAULT 'test',
        "merchant_id" character varying(255) NOT NULL,
        "api_key" text,
        "api_secret" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_store_payment_configs" PRIMARY KEY ("id")
      )
    `);

    // entity @Index 정의와 동일한 이름·컬럼. IF NOT EXISTS 로 멱등.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_platform_store_policies_store_service"
         ON "platform_store_policies" ("store_id", "service_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_platform_store_policies_is_active"
         ON "platform_store_policies" ("is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_platform_store_payment_configs_store_service"
         ON "platform_store_payment_configs" ("store_id", "service_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_platform_store_payment_configs_is_active"
         ON "platform_store_payment_configs" ("is_active")`,
    );

    // 사후 검증: 두 테이블의 전 컬럼과 index 4개가 실제로 존재해야 한다.
    for (const table of TABLES) {
      const rows: Array<{ column_name: string }> = await queryRunner.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      );
      const present = new Set(rows.map((r) => r.column_name));
      const missing = EXPECTED[table].filter((c) => !present.has(c));
      if (missing.length > 0) {
        throw new Error(
          `[CreatePlatformStorePolicyTables] ABORT: 적용 후에도 "${table}" 컬럼 누락 — ${missing.join(', ')}`,
        );
      }
    }
    const idx: Array<{ indexname: string }> = await queryRunner.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1)`,
      [EXPECTED_INDEXES],
    );
    const haveIdx = new Set(idx.map((r) => r.indexname));
    const missingIdx = EXPECTED_INDEXES.filter((i) => !haveIdx.has(i));
    if (missingIdx.length > 0) {
      throw new Error(
        `[CreatePlatformStorePolicyTables] ABORT: index 누락 — ${missingIdx.join(', ')}`,
      );
    }
  }

  /**
   * down: 의도적 no-op.
   *
   * DROP 하면 ① 공개 매장 정책 API 가 즉시 다시 500 으로 회귀하고,
   * ② 그 사이 매장 경영자가 저장한 약관·환불·배송 정책과 PG 결제설정(merchant_id·암호화 키)이
   * 복구 불가능하게 사라진다. 결제설정 손실은 매장 결제 중단으로 이어진다.
   * 롤백이 곧 장애 재발 + 운영 데이터 파괴이므로 되돌리지 않는다.
   * CASCADE 는 어떤 경우에도 쓰지 않는다.
   *
   * 스키마를 되돌려야 한다면 두 기능을 폐기하는 결정(entity·라우트 제거)이 선행되어야 하며,
   * 그 시점에 별도 forward migration 으로 처리하는 것이 올바른 경로다.
   */
  public async down(): Promise<void> {
    // intentionally irreversible — see docblock
  }
}
