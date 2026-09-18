import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-RETIRED-SERVICE-SCHEMA-ENUM-CLEANUP-V1
 * 선행: WO-O4O-RETIRED-SERVICE-SAFE-DATA-RESIDUAL-CLEANUP-V1 (DB_STRUCTURED_RESIDUAL = 0) ·
 *       CHECK-O4O-RETIRED-SERVICE-STRUCTURED-DATA-CLEANUP-V1 (DB_SCHEMA_RESIDUAL = 1 = 이 enum label)
 *
 * public.checkout_orders_order_type_enum 에서 은퇴 서비스 label 1개를 제거한다 (DB_SCHEMA_RESIDUAL 1 → 0).
 * PostgreSQL 은 enum value 단독 DROP 을 지원하지 않으므로
 *   새 타입 생성 → 컬럼 text 경유 cast → 구 타입 DROP → canonical 이름으로 RENAME → default 복구
 * 순서로 재생성한다. 컬럼의 nullability(NOT NULL) · default('GENERIC') · 인덱스(IDX_checkout_orders_order_type,
 * ALTER COLUMN TYPE 이 자동 재구축) · 행 데이터는 그대로다.
 *
 * 현행 runtime 계약: CheckoutOrder entity 는 order_type 을 매핑하지 않으며 소스 어디에도 retired label 사용이 없다.
 * 이 migration 은 기능 변경이 아니라 DB schema 를 현행 계약에 맞추는 것이다.
 *
 * fail-closed 가드 (하나라도 어긋나면 throw → 트랜잭션 ROLLBACK · 데이터 변환 없음):
 *   - 타입이 public 에 존재하고 label 집합·순서가 사전 조사와 정확히 일치
 *   - retired label 을 사용하는 checkout_orders 행 0
 *   - 이 타입을 사용하는 컬럼이 checkout_orders.order_type 하나뿐 (domain · 타 테이블 소비 0)
 *   - 적용 후 label 집합 · 행 수 · default · NOT NULL · 인덱스 재확인
 *
 * down(): schema rollback 기술 계약일 뿐이다 — 동일 절차로 label 을 원래 위치에 되돌린다. 데이터 생성 0 ·
 * route/service/config 복구 0 (은퇴 서비스 재활성화가 아니다).
 *
 * 불변(WO §23 · §24): checkout_orders.metadata(과거 취소 주문 이력 4행) · organizations.name · store_playlists.name ·
 * users.name 은 읽지도 쓰지도 않는다. historical migration · typeorm_migrations 행은 건드리지 않는다.
 */
const TYPE_NAME = 'checkout_orders_order_type_enum';
const TEMP_TYPE_NAME = 'checkout_orders_order_type_enum_new';
const RETIRED_LABEL = 'GLYCOPHARM';
const LABELS_BEFORE = ['GENERIC', 'DROPSHIPPING', 'GLYCOPHARM', 'COSMETICS', 'TOURISM'] as const;
const LABELS_AFTER = ['GENERIC', 'DROPSHIPPING', 'COSMETICS', 'TOURISM'] as const;
const COLUMN_DEFAULT = 'GENERIC';

export class RemoveRetiredCheckoutOrderTypeEnumValue1789690338675 implements MigrationInterface {
  name = 'RemoveRetiredCheckoutOrderTypeEnumValue1789690338675';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await assertPreconditions(queryRunner, [...LABELS_BEFORE], 'up');
    const rowsBefore = await countRows(queryRunner);
    await rebuildEnum(queryRunner, [...LABELS_AFTER]);
    await assertPostconditions(queryRunner, [...LABELS_AFTER], rowsBefore, 'up');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await assertPreconditions(queryRunner, [...LABELS_AFTER], 'down');
    const rowsBefore = await countRows(queryRunner);
    await rebuildEnum(queryRunner, [...LABELS_BEFORE]);
    await assertPostconditions(queryRunner, [...LABELS_BEFORE], rowsBefore, 'down');
  }
}

const TAG = '[retired-order-type-enum-cleanup]';

async function currentLabels(queryRunner: QueryRunner, typeName: string): Promise<string[]> {
  const rows = (await queryRunner.query(
    `SELECT e.enumlabel AS label
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = $1
      ORDER BY e.enumsortorder`,
    [typeName],
  )) as Array<{ label: string }>;
  return rows.map((r) => r.label);
}

async function countRows(queryRunner: QueryRunner): Promise<number> {
  const rows = (await queryRunner.query(`SELECT COUNT(*)::int AS n FROM public.checkout_orders`)) as Array<{ n: number | string }>;
  return Number(rows?.[0]?.n ?? 0);
}

async function assertPreconditions(queryRunner: QueryRunner, expectedLabels: string[], direction: 'up' | 'down'): Promise<void> {
  const labels = await currentLabels(queryRunner, TYPE_NAME);
  if (labels.length === 0) {
    throw new Error(`${TAG} ABORT(${direction}): type public.${TYPE_NAME} not found`);
  }
  if (JSON.stringify(labels) !== JSON.stringify(expectedLabels)) {
    throw new Error(`${TAG} ABORT(${direction}): enum labels [${labels.join(',')}] != expected [${expectedLabels.join(',')}]`);
  }
  const tempLabels = await currentLabels(queryRunner, TEMP_TYPE_NAME);
  if (tempLabels.length > 0) {
    throw new Error(`${TAG} ABORT(${direction}): leftover type public.${TEMP_TYPE_NAME} exists`);
  }

  const used = (await queryRunner.query(
    `SELECT COUNT(*)::int AS n FROM public.checkout_orders WHERE order_type::text = $1`,
    [RETIRED_LABEL],
  )) as Array<{ n: number | string }>;
  const retiredRows = Number(used?.[0]?.n ?? 0);
  if (retiredRows !== 0) {
    throw new Error(`${TAG} ABORT(${direction}): ${retiredRows} checkout_orders row(s) still use the retired label (expected 0)`);
  }

  const consumers = (await queryRunner.query(
    `SELECT n.nspname || '.' || c.relname || '.' || a.attname AS col
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_type t ON t.oid = a.atttypid
      WHERE t.typname = $1 AND c.relkind IN ('r', 'p', 'm', 'v', 'f') AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY 1`,
    [TYPE_NAME],
  )) as Array<{ col: string }>;
  const consumerCols = consumers.map((r) => r.col);
  if (JSON.stringify(consumerCols) !== JSON.stringify(['public.checkout_orders.order_type'])) {
    throw new Error(`${TAG} ABORT(${direction}): unexpected consumers of ${TYPE_NAME}: [${consumerCols.join(',')}]`);
  }
  const domains = (await queryRunner.query(
    `SELECT COUNT(*)::int AS n FROM pg_type d JOIN pg_type b ON b.oid = d.typbasetype WHERE b.typname = $1`,
    [TYPE_NAME],
  )) as Array<{ n: number | string }>;
  if (Number(domains?.[0]?.n ?? 0) !== 0) {
    throw new Error(`${TAG} ABORT(${direction}): domain type(s) derive from ${TYPE_NAME}`);
  }
}

async function rebuildEnum(queryRunner: QueryRunner, labels: string[]): Promise<void> {
  const labelList = labels.map((l) => `'${l}'`).join(', ');
  await queryRunner.query(`ALTER TABLE public.checkout_orders ALTER COLUMN order_type DROP DEFAULT`);
  await queryRunner.query(`CREATE TYPE public.${TEMP_TYPE_NAME} AS ENUM (${labelList})`);
  await queryRunner.query(
    `ALTER TABLE public.checkout_orders
       ALTER COLUMN order_type TYPE public.${TEMP_TYPE_NAME}
       USING order_type::text::public.${TEMP_TYPE_NAME}`,
  );
  await queryRunner.query(`DROP TYPE public.${TYPE_NAME}`);
  await queryRunner.query(`ALTER TYPE public.${TEMP_TYPE_NAME} RENAME TO ${TYPE_NAME}`);
  await queryRunner.query(
    `ALTER TABLE public.checkout_orders
       ALTER COLUMN order_type SET DEFAULT '${COLUMN_DEFAULT}'::public.${TYPE_NAME}`,
  );
}

async function assertPostconditions(queryRunner: QueryRunner, expectedLabels: string[], rowsBefore: number, direction: 'up' | 'down'): Promise<void> {
  const labels = await currentLabels(queryRunner, TYPE_NAME);
  if (JSON.stringify(labels) !== JSON.stringify(expectedLabels)) {
    throw new Error(`${TAG} POST-CHECK FAILED(${direction}): enum labels [${labels.join(',')}] != expected [${expectedLabels.join(',')}]`);
  }
  const rowsAfter = await countRows(queryRunner);
  if (rowsAfter !== rowsBefore) {
    throw new Error(`${TAG} POST-CHECK FAILED(${direction}): checkout_orders rows ${rowsBefore} -> ${rowsAfter}`);
  }
  const col = (await queryRunner.query(
    `SELECT column_default, is_nullable, udt_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'checkout_orders' AND column_name = 'order_type'`,
  )) as Array<{ column_default: string | null; is_nullable: string; udt_name: string }>;
  const c = col?.[0];
  if (!c || c.is_nullable !== 'NO' || c.udt_name !== TYPE_NAME || c.column_default !== `'${COLUMN_DEFAULT}'::${TYPE_NAME}`) {
    throw new Error(`${TAG} POST-CHECK FAILED(${direction}): column contract drift ${JSON.stringify(c ?? null)}`);
  }
  const idx = (await queryRunner.query(
    `SELECT COUNT(*)::int AS n FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'checkout_orders' AND indexname = 'IDX_checkout_orders_order_type'`,
  )) as Array<{ n: number | string }>;
  if (Number(idx?.[0]?.n ?? 0) !== 1) {
    throw new Error(`${TAG} POST-CHECK FAILED(${direction}): IDX_checkout_orders_order_type missing`);
  }
  const tempLabels = await currentLabels(queryRunner, TEMP_TYPE_NAME);
  if (tempLabels.length > 0) {
    throw new Error(`${TAG} POST-CHECK FAILED(${direction}): temporary type ${TEMP_TYPE_NAME} still exists`);
  }
}
