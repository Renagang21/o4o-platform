import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LEGACY-INTERNAL-BARCODE-TO-NULL-MIGRATION-V1 (Phase D)
 *
 * 선행: WO-O4O-PRODUCT-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1 (Phase A~C, 20261230000000)
 *   → 신규 합성 200 대역 내부코드 생성 중단 + barcode/mfds_product_id nullable 완료.
 *
 * 이 마이그레이션은 "기존 데이터"에 남아 있는 합성 내부코드를 실제 바코드/mfds 슬롯에서 제거한다.
 * 상품 정체성은 ProductMaster.id(UUID) 단일이며, 하위 연결(offer/listing/image/description/order 등)은
 * 전부 UUID(master_id/product_master_id) 기반이므로 barcode/mfds 를 NULL 로 만들어도 끊기지 않는다.
 *
 * ── 프로덕션 실측 (2026-07-10, Cloud SQL Auth Proxy read-only) ─────────────────────────────
 *   - barcode LIKE '200%'                              : 17,171  (전부 13자리, generateInternalBarcode 형식)
 *       · barcode_source='INTERNAL'                    : 17,148  (합성 barcode + 실제 공식 mfds MFDS:/HIRA:)
 *       · barcode_source='GTIN' (오태깅)               :     23  (합성 barcode = 합성 mfds, 테스트/사은품 성격)
 *   - 활성 INTERNAL_O4O 식별자                          : 17,148  (INTERNAL barcode 미러)
 *   - 합성 mfds_product_id (숫자만 = barcode)           :     23  (전부 200% 집합, 공식 mfds 는 전부 MFDS:/HIRA: 접두)
 *   - 합성 200% 집합 하위: offer 0 / listing 10 / image 1 / shared_desc 64 (전부 master_id 기반)
 *   - GS1 200~299 대역은 in-store/restricted 대역이라 정식 등록 GTIN 이 아님 → 17,171 전량 합성으로 확정.
 *
 * ── 처리 (단일 트랜잭션, transaction:'each' 이므로 up() throw 시 전체 롤백) ────────────────────
 *   0. 스냅샷 테이블(비가역 경계 대비, 복원 가능) 생성
 *   1. 대상(barcode LIKE '200%') 스냅샷 INSERT — old barcode/source/mfds + soft-delete 대상 식별자 id[]
 *   2. 활성 INTERNAL_O4O 식별자 soft delete (deleted_at=NOW())
 *   3. 합성 mfds_product_id(= barcode) → NULL   (※ barcode NULL 이전에 수행: 등호 조건 유지)
 *   4. 합성 barcode(200%) → NULL
 *   5. barcode_source: DEFAULT 'GTIN' 제거 + NOT NULL 해제 (신규 barcode-less 상품 GTIN 오태깅 중단)
 *      → barcode 가 NULL 인 행(이관분 + 기존 smoke 1건)의 barcode_source 를 NULL 로 정리
 *   6. 사후 불변식 검증(=0). 하나라도 위반 시 throw → 롤백.
 *
 * 공식 식별자(MFDS_CODE / KOREA_DRUG_CODE / UDI_DI / MFDS:/HIRA: mfds_product_id)는 무변경.
 * ProductIdentifier 타입 union 삭제 및 STORE_LOCAL/PHARMACY_LOCAL/SUPPLIER_SKU 정리는 후속 타입정리 WO 로 분리.
 *
 * 재실행 안전성(idempotent): 대상이 0건이면 스냅샷 테이블만 보장하고 no-op 로 성공한다.
 */
export class LegacyInternalCodeBarcodeToNull20270102000000 implements MigrationInterface {
  name = 'LegacyInternalCodeBarcodeToNull20270102000000';

  private readonly MIGRATION_VERSION = 'WO-O4O-LEGACY-INTERNAL-BARCODE-TO-NULL-MIGRATION-V1';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. 스냅샷 테이블 (idempotent)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_master_legacy_internal_code_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_master_id UUID NOT NULL,
        old_barcode VARCHAR(14),
        old_barcode_source VARCHAR(20),
        old_mfds_product_id VARCHAR(100),
        soft_deleted_identifier_ids UUID[] NOT NULL DEFAULT '{}',
        migration_version VARCHAR(80) NOT NULL,
        migrated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pm_legacy_internal_snap_master ON product_master_legacy_internal_code_snapshots (product_master_id)`,
    );

    // 사전 실측
    const start200 = await this.count(queryRunner, `SELECT count(*)::int FROM product_masters WHERE barcode LIKE '200%'`);

    if (start200 === 0) {
      // 이미 이관 완료 상태(재실행) — 하위 정리(DDL)만 보장하고 종료
      await this.ensureBarcodeSourceRelaxed(queryRunner);
      await this.assertPostInvariants(queryRunner);
      return;
    }

    // 규모 sanity gate: 예상(17,171) 근방 이탈 시 중단 (오구성/오대상 방지)
    if (start200 < 16000 || start200 > 18500) {
      throw new Error(
        `[${this.name}] Unexpected synthetic-barcode magnitude: barcode LIKE '200%' = ${start200} (expected ~17,171). Aborting.`,
      );
    }

    // 1. 스냅샷 INSERT (대상 = 200% 전체). soft-delete 예정 INTERNAL_O4O 식별자 id 배열 동봉.
    await queryRunner.query(
      `
      INSERT INTO product_master_legacy_internal_code_snapshots
        (product_master_id, old_barcode, old_barcode_source, old_mfds_product_id, soft_deleted_identifier_ids, migration_version)
      SELECT
        pm.id,
        pm.barcode,
        pm.barcode_source,
        pm.mfds_product_id,
        COALESCE(
          ARRAY(
            SELECT pi.id FROM product_identifiers pi
            WHERE pi.product_master_id = pm.id
              AND pi.identifier_type = 'INTERNAL_O4O'
              AND pi.deleted_at IS NULL
          ),
          '{}'::uuid[]
        ),
        $1
      FROM product_masters pm
      WHERE pm.barcode LIKE '200%'
    `,
      [this.MIGRATION_VERSION],
    );

    // 2. 활성 INTERNAL_O4O 식별자 soft delete
    await queryRunner.query(
      `UPDATE product_identifiers SET deleted_at = NOW() WHERE identifier_type = 'INTERNAL_O4O' AND deleted_at IS NULL`,
    );

    // 3. 합성 mfds_product_id(= barcode, 200 대역) → NULL  (barcode NULL 이전 수행)
    await queryRunner.query(
      `UPDATE product_masters SET mfds_product_id = NULL WHERE barcode LIKE '200%' AND mfds_product_id = barcode`,
    );

    // 4. 합성 barcode(200%) → NULL
    await queryRunner.query(`UPDATE product_masters SET barcode = NULL WHERE barcode LIKE '200%'`);

    // 5. barcode_source: DEFAULT/NOT NULL 완화 후, barcode 없는 행은 source NULL 로 정리
    await this.ensureBarcodeSourceRelaxed(queryRunner);
    await queryRunner.query(`UPDATE product_masters SET barcode_source = NULL WHERE barcode IS NULL`);

    // 6. 사후 불변식 검증
    const snapshotCount = await this.count(
      queryRunner,
      `SELECT count(*)::int FROM product_master_legacy_internal_code_snapshots WHERE migration_version = $1 AND migrated_at >= NOW() - INTERVAL '1 hour'`,
      [this.MIGRATION_VERSION],
    );
    if (snapshotCount !== start200) {
      throw new Error(
        `[${this.name}] Snapshot count mismatch: snapshotted ${snapshotCount} != targeted ${start200}. Aborting.`,
      );
    }
    await this.assertPostInvariants(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 스냅샷 기반 복원(best-effort). NOT NULL 은 재설정하지 않음(신규 barcode-less NULL 행 존재).
    const hasSnap = await this.count(
      queryRunner,
      `SELECT count(*)::int FROM information_schema.tables WHERE table_name = 'product_master_legacy_internal_code_snapshots'`,
    );
    if (hasSnap === 0) return;

    // 식별자 soft delete 복원
    await queryRunner.query(`
      UPDATE product_identifiers pi SET deleted_at = NULL
      FROM (
        SELECT DISTINCT unnest(soft_deleted_identifier_ids) AS id
        FROM product_master_legacy_internal_code_snapshots
        WHERE migration_version = '${this.MIGRATION_VERSION}'
      ) s
      WHERE pi.id = s.id
    `);

    // barcode / barcode_source / mfds_product_id 복원
    await queryRunner.query(`
      UPDATE product_masters pm
      SET barcode = s.old_barcode,
          barcode_source = s.old_barcode_source,
          mfds_product_id = s.old_mfds_product_id
      FROM product_master_legacy_internal_code_snapshots s
      WHERE pm.id = s.product_master_id
        AND s.migration_version = '${this.MIGRATION_VERSION}'
    `);

    // DEFAULT 'GTIN' 복원 (NOT NULL 은 복원하지 않음)
    await queryRunner.query(`ALTER TABLE product_masters ALTER COLUMN barcode_source SET DEFAULT 'GTIN'`);
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  private async ensureBarcodeSourceRelaxed(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE product_masters ALTER COLUMN barcode_source DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE product_masters ALTER COLUMN barcode_source DROP NOT NULL`);
  }

  private async assertPostInvariants(queryRunner: QueryRunner): Promise<void> {
    const remaining200 = await this.count(
      queryRunner,
      `SELECT count(*)::int FROM product_masters WHERE barcode LIKE '200%'`,
    );
    const activeInternal = await this.count(
      queryRunner,
      `SELECT count(*)::int FROM product_identifiers WHERE identifier_type = 'INTERNAL_O4O' AND deleted_at IS NULL`,
    );
    const sourceInternal = await this.count(
      queryRunner,
      `SELECT count(*)::int FROM product_masters WHERE barcode_source = 'INTERNAL'`,
    );
    const numericMfds = await this.count(
      queryRunner,
      `SELECT count(*)::int FROM product_masters WHERE mfds_product_id ~ '^[0-9]+$'`,
    );

    const violations: string[] = [];
    if (remaining200 !== 0) violations.push(`barcode LIKE '200%' = ${remaining200}`);
    if (activeInternal !== 0) violations.push(`active INTERNAL_O4O = ${activeInternal}`);
    if (sourceInternal !== 0) violations.push(`barcode_source='INTERNAL' = ${sourceInternal}`);
    if (numericMfds !== 0) violations.push(`numeric(synthetic) mfds_product_id = ${numericMfds}`);

    if (violations.length > 0) {
      throw new Error(`[${this.name}] Post-invariant check failed → ROLLBACK. Violations: ${violations.join('; ')}`);
    }
  }

  private async count(queryRunner: QueryRunner, sql: string, params?: unknown[]): Promise<number> {
    const rows = await queryRunner.query(sql, params);
    return Number(rows?.[0]?.count ?? 0);
  }
}
