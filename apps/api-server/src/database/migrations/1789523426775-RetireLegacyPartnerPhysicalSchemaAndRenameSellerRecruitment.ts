import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1 — Phase 1 (expand)
 * 상위 정본: docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md §7
 *   CURRENT PARTNER = FULL RETIREMENT / SELLER RECRUITMENT = PRESERVED
 *
 * 하는 일 (한 트랜잭션 · 사전 단언 실패 시 전체 롤백):
 *   ① 사전 단언 — DROP 대상 11 테이블 0행 · active Partner role 0 · Partner 컬럼 non-null 0 ·
 *      inactive Partner role 행 ≤ 3. 하나라도 어긋나면 throw (DDL 미실행).
 *   ② Legacy Partner 테이블 11 DROP (자식 → 부모 순 · IF EXISTS 사용 안 함)
 *   ③ 고아 enum 3 DROP (partnership_status · contract_status · contract_terminated_by)
 *   ④ Partner 컬럼 3 DROP (checkout_orders."partnerId" · store_products.is_partner_recruiting ·
 *      neture.neture_products.partner_id) — 인덱스는 컬럼과 함께 제거된다
 *   ⑤ inactive Partner role_assignments 행 DELETE (neture:partner · cosmetics:partner, is_active=false 만)
 *   ⑥ 판매자 모집(Seller Recruitment) 물리 명칭 정리 — 행위자 기준 이름
 *        neture_partner_recruitments          → seller_recruitments
 *        neture_partner_applications          → seller_recruitment_applications
 *        applications.partner_id / partner_name → applicant_id / applicant_name
 *        enum · 제약 · 인덱스도 같은 규칙으로 rename (값 불변)
 *   ⑦ 배포 창 호환 VIEW — 옛 이름(neture_partner_recruitments · neture_partner_applications)을
 *      auto-updatable 단순 VIEW 로 남긴다. 배포 순서가 [migration Job → 새 revision] 이라
 *      migration 직후에도 old revision 이 옛 이름으로 SELECT/INSERT/UPDATE/DELETE 할 수 있어야 한다.
 *      → Phase 2 (contract) migration 이 새 revision 검증 후 VIEW 를 DROP 한다.
 *
 * 하지 않는 일:
 *   - foreign_visitor_partner* (Store Ops) 무변경
 *   - market_trial_decisions."selectedSellerIds" 는 배포 중인 entity 가 아직 매핑하므로 Phase 2 에서 DROP
 *   - 다른 도메인 DDL · 대량 update 없음
 *
 * down(): DDL 은 되돌리지만 삭제한 데이터(0행 테이블 · inactive role 3행)는 복원하지 않는다 (복원 위장 금지).
 */
export class RetireLegacyPartnerPhysicalSchemaAndRenameSellerRecruitment1789523426775 implements MigrationInterface {
  name = 'RetireLegacyPartnerPhysicalSchemaAndRenameSellerRecruitment1789523426775';

  /** 자식 → 부모 순. 다른 테이블에서 이 테이블들로 들어오는 FK 는 없다 (2026-09-16 Fresh Census). */
  private static readonly DROP_TABLES: ReadonlyArray<string> = [
    'public.neture_partner_dashboard_item_contents',
    'public.neture_partner_dashboard_items',
    'public.neture_partnership_products',
    'public.neture_partnership_requests',
    'public.neture_seller_partner_contracts',
    'public.partner_settlement_items',
    'public.partner_settlements',
    'public.partner_commissions',
    'public.partner_referrals',
    'public.supplier_partner_commissions',
    'neture.neture_partners',
  ];

  private static readonly DROP_ENUMS: ReadonlyArray<string> = [
    'public.neture_partnership_status_enum',
    'public.neture_contract_status_enum',
    'public.neture_contract_terminated_by_enum',
  ];

  private static readonly PARTNER_ROLES: ReadonlyArray<string> = ['neture:partner', 'cosmetics:partner'];
  private static readonly MAX_INACTIVE_ROLE_ROWS = 3;

  private static async count(queryRunner: QueryRunner, sql: string, params: unknown[] = []): Promise<number> {
    const rows = (await queryRunner.query(sql, params)) as Array<{ n: string | number }>;
    return Number(rows?.[0]?.n ?? 0);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const Self = RetireLegacyPartnerPhysicalSchemaAndRenameSellerRecruitment1789523426775;

    // ── ① 사전 단언 ──────────────────────────────────────────────────────────────
    for (const table of Self.DROP_TABLES) {
      const n = await Self.count(queryRunner, `SELECT COUNT(*)::int AS n FROM ${table}`);
      if (n !== 0) {
        throw new Error(`[partner-physical-cleanup] ABORT: ${table} has ${n} rows (expected 0)`);
      }
    }
    const activeRoles = await Self.count(
      queryRunner,
      `SELECT COUNT(*)::int AS n FROM public.role_assignments WHERE role = ANY($1) AND is_active = true`,
      [Self.PARTNER_ROLES],
    );
    if (activeRoles !== 0) {
      throw new Error(`[partner-physical-cleanup] ABORT: ${activeRoles} active partner role_assignments`);
    }
    const inactiveRoles = await Self.count(
      queryRunner,
      `SELECT COUNT(*)::int AS n FROM public.role_assignments WHERE role = ANY($1) AND is_active = false`,
      [Self.PARTNER_ROLES],
    );
    if (inactiveRoles > Self.MAX_INACTIVE_ROLE_ROWS) {
      throw new Error(
        `[partner-physical-cleanup] ABORT: ${inactiveRoles} inactive partner role_assignments (census expected ≤ ${Self.MAX_INACTIVE_ROLE_ROWS})`,
      );
    }
    const nonNullColumns: Array<[string, number]> = [
      ['checkout_orders."partnerId"', await Self.count(queryRunner, `SELECT COUNT(*)::int AS n FROM public.checkout_orders WHERE "partnerId" IS NOT NULL`)],
      ['store_products.is_partner_recruiting', await Self.count(queryRunner, `SELECT COUNT(*)::int AS n FROM public.store_products WHERE is_partner_recruiting = true`)],
      ['neture.neture_products.partner_id', await Self.count(queryRunner, `SELECT COUNT(*)::int AS n FROM neture.neture_products WHERE partner_id IS NOT NULL`)],
    ];
    for (const [col, n] of nonNullColumns) {
      if (n !== 0) {
        throw new Error(`[partner-physical-cleanup] ABORT: ${col} has ${n} non-null/true rows (expected 0)`);
      }
    }

    // ── ② Legacy Partner 테이블 DROP ─────────────────────────────────────────────
    for (const table of Self.DROP_TABLES) {
      await queryRunner.query(`DROP TABLE ${table}`);
    }

    // ── ③ 고아 enum DROP ─────────────────────────────────────────────────────────
    for (const type of Self.DROP_ENUMS) {
      await queryRunner.query(`DROP TYPE ${type}`);
    }

    // ── ④ Partner 컬럼 DROP ───────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE public.checkout_orders DROP COLUMN "partnerId"`);
    await queryRunner.query(`ALTER TABLE public.store_products DROP COLUMN is_partner_recruiting`);
    await queryRunner.query(`ALTER TABLE neture.neture_products DROP COLUMN partner_id`);

    // ── ⑤ inactive Partner role 행 DELETE ────────────────────────────────────────
    const deleted = (await queryRunner.query(
      `DELETE FROM public.role_assignments WHERE role = ANY($1) AND is_active = false RETURNING id`,
      [Self.PARTNER_ROLES],
    )) as unknown;
    const deletedRows = Array.isArray(deleted) && Array.isArray((deleted as unknown[])[0]) ? ((deleted as unknown[][])[0]) : (deleted as unknown[]);
    const deletedCount = Array.isArray(deletedRows) ? deletedRows.length : 0;
    if (deletedCount !== inactiveRoles) {
      throw new Error(`[partner-physical-cleanup] ABORT: deleted ${deletedCount} inactive partner role rows, expected ${inactiveRoles}`);
    }

    // ── ⑥ Seller Recruitment rename (행위자 기준 이름) ──────────────────────────
    // enum types (값 불변)
    await queryRunner.query(`ALTER TYPE public.neture_partner_recruitment_status_enum RENAME TO seller_recruitment_status_enum`);
    await queryRunner.query(`ALTER TYPE public.neture_partner_recruitment_exposure_status_enum RENAME TO seller_recruitment_exposure_status_enum`);
    await queryRunner.query(`ALTER TYPE public.neture_partner_application_status_enum RENAME TO seller_recruitment_application_status_enum`);

    // tables
    await queryRunner.query(`ALTER TABLE public.neture_partner_recruitments RENAME TO seller_recruitments`);
    await queryRunner.query(`ALTER TABLE public.neture_partner_applications RENAME TO seller_recruitment_applications`);

    // columns (applications: 신청 주체 = applicant)
    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME COLUMN partner_id TO applicant_id`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME COLUMN partner_name TO applicant_name`);

    // constraints
    await queryRunner.query(`ALTER TABLE public.seller_recruitments RENAME CONSTRAINT "PK_caf78e734a6d909c033601c0cc1" TO "PK_seller_recruitments"`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitments RENAME CONSTRAINT uq_neture_partner_recruitments_product_seller_service TO uq_seller_recruitments_product_seller_service`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME CONSTRAINT "PK_a341fc8bc08cb4d5ab068e4b825" TO "PK_seller_recruitment_applications"`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME CONSTRAINT "FK_4c697b576bc49c23613cd0d1c52" TO "FK_seller_recruitment_applications_recruitment"`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME CONSTRAINT "UQ_00c3de3e13e337373e0c6833f0e" TO "UQ_seller_recruitment_applications_recruitment_applicant"`);

    // indexes
    await queryRunner.query(`ALTER INDEX public."IDX_neture_partner_recruitments_status" RENAME TO "IDX_seller_recruitments_status"`);
    await queryRunner.query(`ALTER INDEX public."IDX_neture_partner_recruitments_exposure_status" RENAME TO "IDX_seller_recruitments_exposure_status"`);
    await queryRunner.query(`ALTER INDEX public."IDX_neture_partner_applications_recruitment_id" RENAME TO "IDX_seller_recruitment_applications_recruitment_id"`);
    await queryRunner.query(`ALTER INDEX public."IDX_neture_partner_applications_partner_id" RENAME TO "IDX_seller_recruitment_applications_applicant_id"`);
    await queryRunner.query(`ALTER INDEX public."IDX_neture_partner_applications_status" RENAME TO "IDX_seller_recruitment_applications_status"`);

    // ── ⑦ 배포 창 호환 VIEW (Phase 2 에서 DROP) ───────────────────────────────────
    // 단순 SELECT(단일 테이블 · 컬럼 alias 만) 이므로 PostgreSQL auto-updatable: old revision 의
    // TypeORM INSERT … RETURNING / UPDATE / DELETE 와 raw SQL(a.partner_id) 이 그대로 동작한다.
    await queryRunner.query(`
      CREATE VIEW public.neture_partner_recruitments AS
        SELECT id, product_id, product_name, manufacturer, consumer_price, commission_rate,
               seller_id, seller_name, shop_url, service_name, service_id, image_url, status,
               created_at, updated_at, exposure_status, exposure_reviewed_at, exposure_reviewed_by,
               exposure_review_note
          FROM public.seller_recruitments
    `);
    await queryRunner.query(`
      CREATE VIEW public.neture_partner_applications AS
        SELECT id, recruitment_id, applicant_id AS partner_id, applicant_name AS partner_name,
               status, applied_at, decided_at, decided_by, reason, created_at, updated_at
          FROM public.seller_recruitment_applications
    `);
    await queryRunner.query(`COMMENT ON VIEW public.neture_partner_recruitments IS 'TEMP_COMPAT deploy-window alias of seller_recruitments (WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1 Phase 1); dropped in Phase 2'`);
    await queryRunner.query(`COMMENT ON VIEW public.neture_partner_applications IS 'TEMP_COMPAT deploy-window alias of seller_recruitment_applications (WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1 Phase 1); dropped in Phase 2'`);
  }

  /**
   * 구조만 되돌린다. DROP 한 테이블은 빈 껍데기(컬럼 정의 없음)를 만들지 않는다 — 삭제된
   * Legacy Partner 구조·데이터 복원은 이 migration 의 책임이 아니며 복원 위장을 하지 않는다.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW public.neture_partner_applications`);
    await queryRunner.query(`DROP VIEW public.neture_partner_recruitments`);

    await queryRunner.query(`ALTER INDEX public."IDX_seller_recruitment_applications_status" RENAME TO "IDX_neture_partner_applications_status"`);
    await queryRunner.query(`ALTER INDEX public."IDX_seller_recruitment_applications_applicant_id" RENAME TO "IDX_neture_partner_applications_partner_id"`);
    await queryRunner.query(`ALTER INDEX public."IDX_seller_recruitment_applications_recruitment_id" RENAME TO "IDX_neture_partner_applications_recruitment_id"`);
    await queryRunner.query(`ALTER INDEX public."IDX_seller_recruitments_exposure_status" RENAME TO "IDX_neture_partner_recruitments_exposure_status"`);
    await queryRunner.query(`ALTER INDEX public."IDX_seller_recruitments_status" RENAME TO "IDX_neture_partner_recruitments_status"`);

    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME CONSTRAINT "UQ_seller_recruitment_applications_recruitment_applicant" TO "UQ_00c3de3e13e337373e0c6833f0e"`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME CONSTRAINT "FK_seller_recruitment_applications_recruitment" TO "FK_4c697b576bc49c23613cd0d1c52"`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME CONSTRAINT "PK_seller_recruitment_applications" TO "PK_a341fc8bc08cb4d5ab068e4b825"`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitments RENAME CONSTRAINT uq_seller_recruitments_product_seller_service TO uq_neture_partner_recruitments_product_seller_service`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitments RENAME CONSTRAINT "PK_seller_recruitments" TO "PK_caf78e734a6d909c033601c0cc1"`);

    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME COLUMN applicant_name TO partner_name`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME COLUMN applicant_id TO partner_id`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitment_applications RENAME TO neture_partner_applications`);
    await queryRunner.query(`ALTER TABLE public.seller_recruitments RENAME TO neture_partner_recruitments`);

    await queryRunner.query(`ALTER TYPE public.seller_recruitment_application_status_enum RENAME TO neture_partner_application_status_enum`);
    await queryRunner.query(`ALTER TYPE public.seller_recruitment_exposure_status_enum RENAME TO neture_partner_recruitment_exposure_status_enum`);
    await queryRunner.query(`ALTER TYPE public.seller_recruitment_status_enum RENAME TO neture_partner_recruitment_status_enum`);

    await queryRunner.query(`ALTER TABLE neture.neture_products ADD COLUMN partner_id uuid`);
    await queryRunner.query(`CREATE INDEX idx_neture_products_partner_id ON neture.neture_products USING btree (partner_id)`);
    await queryRunner.query(`ALTER TABLE public.store_products ADD COLUMN is_partner_recruiting boolean DEFAULT false NOT NULL`);
    await queryRunner.query(`ALTER TABLE public.checkout_orders ADD COLUMN "partnerId" character varying(100)`);
    await queryRunner.query(`CREATE INDEX "IDX_checkout_orders_partnerId" ON public.checkout_orders USING btree ("partnerId")`);
    // Legacy Partner 테이블 11 · enum 3 · inactive role 3행: 복원하지 않는다 (의도적).
  }
}
