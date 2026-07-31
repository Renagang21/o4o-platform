import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-BILLING-INVOICES-RECOVERY-V1
 * 선행 감사: WO-O4O-API-SERVER-ORPHANED-MIGRATIONS-RISK-CLASSIFICATION-V1 (P1)
 *
 * 운영 DB 에 없는 `glycopharm_billing_invoices` 를 복구한다.
 *
 * 이 결함은 500 으로 드러나지 않았다 — service/controller 가 예외를 삼키고
 * `200 { data: [] }` 를 반환해 **정상적으로 청구서가 없는 상태처럼 위장**했다.
 * (로그에만 `relation "glycopharm_billing_invoices" does not exist` 가 남았다.)
 * 본 migration 과 함께 그 위장 처리도 제거한다.
 *
 * entity `GlycopharmBillingInvoice` 는 entities.ts 에 등록되고 라우트도 mount 되어 있으나,
 * 테이블 생성 migration 이 `apps/api-server/src/migrations/`(러너 미스캔 orphan)에 있어
 * 실행된 적이 없다.
 *   orphan: 1739180400000-CreateGlycopharmBillingInvoices.ts (본체)
 *           1739266800000-AddInvoiceDispatchFields.ts        (Phase 3-E 발송 5컬럼)
 * 테이블이 아예 없으므로 두 orphan 이 나눠 만들던 구조를 **현재 entity 기준 단일 CREATE** 로 만든다.
 * orphan 파일은 이동·수정·삭제하지 않는다(타임스탬프가 적용완료분보다 앞서 정렬됨).
 *
 * 적용 직전 운영 census(read-only):
 *   테이블 부재(부분 컬럼 0) · 동명 index/constraint 0 · typeorm_migrations 기록 0.
 *
 * FK 는 만들지 않는다 — entity 가 relation 을 선언하지 않으며 orphan 도 FK 를 만들지 않았다.
 * (조회 시 `LEFT JOIN organizations p ON p.id = i.pharmacy_id` 를 쓰지만 논리 조인이고,
 *  pharmacy_id 는 nullable 이며 공급자 측 supplier_id 는 varchar 라 단일 FK 대상이 아니다.)
 * seed/backfill 없음. INSERT·UPDATE·DELETE 0건. 다른 테이블 무접촉.
 */
const TABLE = 'glycopharm_billing_invoices';

const EXPECTED_COLUMNS = [
  'id', 'service_key', 'supplier_id', 'pharmacy_id', 'period_from', 'period_to',
  'unit', 'unit_price', 'count', 'amount', 'currency', 'status', 'snapshot_at',
  'created_by', 'confirmed_by', 'confirmed_at', 'line_snapshot', 'metadata',
  'dispatch_status', 'dispatched_at', 'dispatched_to', 'received_at', 'dispatch_log',
  'created_at', 'updated_at',
];

const EXPECTED_INDEXES = [
  'IDX_billing_invoice_unique_period',
  'IDX_billing_invoice_status',
  'IDX_billing_invoice_supplier',
  'IDX_billing_invoice_pharmacy',
];

export class CreateGlycopharmBillingInvoicesTable20270223000000 implements MigrationInterface {
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
          `[CreateGlycopharmBillingInvoicesTable] ABORT: "${TABLE}" 이 이미 존재하지만 컬럼 누락 — ` +
            `${missing.join(', ')}. 자동 ALTER 하지 않는다. 구조 충돌 확인 후 재판단 필요.`,
        );
      }
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glycopharm_billing_invoices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "service_key" character varying(50) NOT NULL DEFAULT 'glycopharm',
        "supplier_id" character varying(100),
        "pharmacy_id" uuid,
        "period_from" date NOT NULL,
        "period_to" date NOT NULL,
        "unit" character varying(30) NOT NULL,
        "unit_price" integer NOT NULL,
        "count" integer NOT NULL,
        "amount" integer NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'KRW',
        "status" character varying(20) NOT NULL DEFAULT 'DRAFT',
        "snapshot_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_by" uuid NOT NULL,
        "confirmed_by" uuid,
        "confirmed_at" TIMESTAMP WITH TIME ZONE,
        "line_snapshot" jsonb,
        "metadata" jsonb,
        "dispatch_status" character varying(20) NOT NULL DEFAULT 'NONE',
        "dispatched_at" TIMESTAMP WITH TIME ZONE,
        "dispatched_to" character varying(255),
        "received_at" TIMESTAMP WITH TIME ZONE,
        "dispatch_log" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_glycopharm_billing_invoices" PRIMARY KEY ("id")
      )
    `);

    // entity @Index(['supplierId','pharmacyId','periodFrom','periodTo','unit'], { unique: true })
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_billing_invoice_unique_period"
         ON "glycopharm_billing_invoices"
         ("supplier_id", "pharmacy_id", "period_from", "period_to", "unit")`,
    );
    // entity @Index() on status / supplierId / pharmacyId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_invoice_status"
         ON "glycopharm_billing_invoices" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_invoice_supplier"
         ON "glycopharm_billing_invoices" ("supplier_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_invoice_pharmacy"
         ON "glycopharm_billing_invoices" ("pharmacy_id")`,
    );

    // 사후 검증: 컬럼 25개와 index 4개가 실제로 존재해야 한다.
    const after: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1`,
      [TABLE],
    );
    const present = new Set(after.map((r) => r.column_name));
    const missingCols = EXPECTED_COLUMNS.filter((c) => !present.has(c));
    if (missingCols.length > 0) {
      throw new Error(
        `[CreateGlycopharmBillingInvoicesTable] ABORT: 적용 후 컬럼 누락 — ${missingCols.join(', ')}`,
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
        `[CreateGlycopharmBillingInvoicesTable] ABORT: index 누락 — ${missingIdx.join(', ')}`,
      );
    }
  }

  /**
   * down: 의도적 no-op.
   *
   * 이 테이블은 확정된 청구 스냅샷(금액·건수·단가·근거 라인·확정자·발송 이력)을 보관한다.
   * DROP 하면 회계·정산 근거가 복구 불가능하게 사라지고, 조회 API 도 다시 실패한다.
   * 롤백이 곧 장애 재발 + 회계 데이터 파괴이므로 되돌리지 않는다. CASCADE 미사용.
   *
   * 구조를 되돌려야 한다면 인보이스 기능 폐기 결정이 선행되어야 하며,
   * 그 시점에 별도 forward migration 으로 처리하는 것이 올바른 경로다.
   */
  public async down(): Promise<void> {
    // intentionally irreversible — see docblock
  }
}
