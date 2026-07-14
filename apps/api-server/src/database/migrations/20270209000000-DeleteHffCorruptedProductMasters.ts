import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-HFF-CORRUPTED-PRODUCTMASTER-GUARDED-DELETE-V1
 *
 * 선행: WO-O4O-HFF-BROKEN-REGULATORY-TYPE-NORMALIZE-V1 (20270208000000, 4건 regulatory_type 정규화)
 *
 * 배경: HFF ProductMaster 5건이 CP949→UTF8 mis-decode 로 name·manufacturer·regulatory_type
 *   전부 손상(U+FFFD 치환, 원본 바이트 소실). 식약처 공식 원천 미연결(mfds_permit/barcode/identifier 부재),
 *   생성 2026-07-10~12(바코드리스 admin 등록 시점). 인코딩 원문 복구 불가 → 사용자 결정:
 *   "손상되고 공식 원천으로 정체성 확정 불가한 master 는 복구하지 않고, 운영 사용이 없으면 정리한다."
 *
 * read-only 전수 연결 조사(20개 master-참조 테이블, 프로덕션 2026-07-14):
 *   - shared_product_descriptions 20건(4 master, B2B/STORE canonical+일부 candidate, ko+en) — 어느 매장도 미채택
 *   - product_landings 1건(38a9d3e4, metadata.source='admin-qr-view' 프리뷰 아티팩트, content_config 비어있음)
 *   - product_identifiers / listings / offers / store_products / cart / service_products / catalog /
 *     content_links / images / store_selections / store_profiles / tablet_interest / aliases /
 *     drug_ext / notes = 전부 0 (실운영 사용 없음)
 *   - 참고 콘텐츠(변엔장 정본 예제)는 이미 repo `examples/byeonenjang.semantic.html` 로 보존됨.
 *
 * 처리: 전체 연결관계 스냅샷(복구 가능) → SPD → landing → master 순 트랜잭션 삭제.
 *   결과: HFF ProductMaster 34 → 30(원래 정상분). name/HTML 별도 repo 보존 안 함(DB 스냅샷으로만 복구).
 *
 * 가드(모두 일치할 때만 삭제):
 *   ① 대상 = 고정 5 UUID (allowlist)
 *   ② 존재하는 대상 전부 name 에 U+FFFD 포함(= 손상 데이터 재확인)
 *   ③ 외부 운영 사용 14개 테이블 전부 0
 *   위반 시 throw → 롤백. present=0(타 환경/재실행)이면 no-op.
 */
export class DeleteHffCorruptedProductMasters20270209000000 implements MigrationInterface {
  name = 'DeleteHffCorruptedProductMasters20270209000000';

  private readonly CLEANUP_KEY = 'hff_corrupted_master_guarded_delete_20260714';
  private readonly TARGET_IDS = [
    '0b5502e5-7b33-4ed8-9295-c63c35b0e9bf',
    '38a9d3e4-56be-4967-aa7b-0cb2d2e6baff',
    'fb7d9684-f8c7-4569-9ea4-c2f91011af61',
    'bcc5d466-bb2e-4d37-aa16-197de70bb8a6',
    'db20f469-229c-46e2-a75b-06c27700fe5f',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. 스냅샷 테이블 (idempotent) — 전체 연결관계 jsonb 보존
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_master_hff_corrupted_delete_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_master_id UUID NOT NULL,
        master_json JSONB NOT NULL,
        spd_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        landing_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        identifier_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        pre_delete_counts JSONB,
        cleanup_key VARCHAR(80) NOT NULL,
        snapshotted_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const present = await this.count(
      queryRunner,
      `SELECT count(*)::int AS count FROM product_masters WHERE id = ANY($1::uuid[])`,
      [this.TARGET_IDS],
    );
    if (present === 0) return; // 타 환경 / 재실행 → no-op

    // ① 손상 재확인: 존재 대상 전부 name 에 U+FFFD 포함
    const corrupted = await this.count(
      queryRunner,
      `SELECT count(*)::int AS count FROM product_masters WHERE id = ANY($1::uuid[]) AND strpos(name, U&'\\+00FFFD') > 0`,
      [this.TARGET_IDS],
    );
    if (corrupted !== present) {
      throw new Error(
        `[${this.name}] Guard①: present=${present} but only ${corrupted} have U+FFFD-corrupted name → ABORT (target may point to non-corrupted master).`,
      );
    }

    // ② 외부 운영 사용 = 0 (하나라도 있으면 삭제 금지)
    const usage = await queryRunner.query(
      `SELECT
        (SELECT count(*) FROM organization_product_listings WHERE master_id = ANY($1::uuid[])) AS listings,
        (SELECT count(*) FROM supplier_product_offers WHERE master_id = ANY($1::uuid[])) AS offers,
        (SELECT count(*) FROM store_products WHERE product_master_id = ANY($1::uuid[])) AS store_products,
        (SELECT count(*) FROM store_cart_items WHERE product_master_id = ANY($1::uuid[])) AS cart_items,
        (SELECT count(*) FROM service_products WHERE master_id = ANY($1::uuid[])) AS service_products,
        (SELECT count(*) FROM catalog_products WHERE product_master_id = ANY($1::uuid[])) AS catalog_products,
        (SELECT count(*) FROM kpa_store_content_product_links WHERE master_id = ANY($1::uuid[])) AS content_links,
        (SELECT count(*) FROM product_images WHERE master_id = ANY($1::uuid[])) AS images,
        (SELECT count(*) FROM store_product_description_selections WHERE master_id = ANY($1::uuid[])) AS store_selections,
        (SELECT count(*) FROM store_product_profiles WHERE master_id = ANY($1::uuid[])) AS store_profiles,
        (SELECT count(*) FROM tablet_interest_requests WHERE master_id = ANY($1::uuid[])) AS tablet_interest,
        (SELECT count(*) FROM product_aliases WHERE product_master_id = ANY($1::uuid[])) AS aliases,
        (SELECT count(*) FROM product_drug_extensions WHERE product_master_id = ANY($1::uuid[])) AS drug_ext,
        (SELECT count(*) FROM product_master_notes WHERE product_master_id = ANY($1::uuid[])) AS notes`,
      [this.TARGET_IDS],
    );
    const u = usage?.[0] ?? {};
    const nonZero = Object.entries(u).filter(([, v]) => Number(v) > 0);
    if (nonZero.length > 0) {
      throw new Error(
        `[${this.name}] Guard②: external operational usage found → ABORT. ${nonZero.map(([k, v]) => `${k}=${v}`).join(', ')}`,
      );
    }

    // 1. 스냅샷 (master + SPD + landing + identifier 전체 jsonb, 삭제 전 count 동봉)
    await queryRunner.query(
      `
      INSERT INTO product_master_hff_corrupted_delete_snapshots
        (product_master_id, master_json, spd_json, landing_json, identifier_json, pre_delete_counts, cleanup_key)
      SELECT
        pm.id,
        to_jsonb(pm.*),
        COALESCE((SELECT jsonb_agg(to_jsonb(s.*)) FROM shared_product_descriptions s WHERE s.master_id = pm.id), '[]'::jsonb),
        COALESCE((SELECT jsonb_agg(to_jsonb(l.*)) FROM product_landings l WHERE l.product_master_id = pm.id), '[]'::jsonb),
        COALESCE((SELECT jsonb_agg(to_jsonb(i.*)) FROM product_identifiers i WHERE i.product_master_id = pm.id), '[]'::jsonb),
        jsonb_build_object(
          'spds', (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id = pm.id),
          'landings', (SELECT count(*) FROM product_landings l WHERE l.product_master_id = pm.id),
          'identifiers', (SELECT count(*) FROM product_identifiers i WHERE i.product_master_id = pm.id)
        ),
        $2
      FROM product_masters pm
      WHERE pm.id = ANY($1::uuid[])
      `,
      [this.TARGET_IDS, this.CLEANUP_KEY],
    );

    // 2. 종속 삭제 → master 삭제 (FK 순서)
    await queryRunner.query(`DELETE FROM shared_product_description_audit_logs WHERE master_id = ANY($1::uuid[])`, [this.TARGET_IDS]);
    await queryRunner.query(`DELETE FROM shared_product_descriptions WHERE master_id = ANY($1::uuid[])`, [this.TARGET_IDS]);
    await queryRunner.query(`DELETE FROM product_landings WHERE product_master_id = ANY($1::uuid[])`, [this.TARGET_IDS]);
    await queryRunner.query(`DELETE FROM product_masters WHERE id = ANY($1::uuid[])`, [this.TARGET_IDS]);

    // 3. 사후 검증 (전부 0)
    const remMasters = await this.count(queryRunner, `SELECT count(*)::int AS count FROM product_masters WHERE id = ANY($1::uuid[])`, [this.TARGET_IDS]);
    const remSpds = await this.count(queryRunner, `SELECT count(*)::int AS count FROM shared_product_descriptions WHERE master_id = ANY($1::uuid[])`, [this.TARGET_IDS]);
    const remLandings = await this.count(queryRunner, `SELECT count(*)::int AS count FROM product_landings WHERE product_master_id = ANY($1::uuid[])`, [this.TARGET_IDS]);
    const violations: string[] = [];
    if (remMasters !== 0) violations.push(`masters=${remMasters}`);
    if (remSpds !== 0) violations.push(`spds=${remSpds}`);
    if (remLandings !== 0) violations.push(`landings=${remLandings}`);
    if (violations.length > 0) {
      throw new Error(`[${this.name}] Post-verify failed → ROLLBACK. ${violations.join(', ')}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 스냅샷 기반 복원 (best-effort). 스냅샷 없으면 no-op.
    const hasSnap = await this.count(
      queryRunner,
      `SELECT count(*)::int AS count FROM information_schema.tables WHERE table_name = 'product_master_hff_corrupted_delete_snapshots'`,
    );
    if (hasSnap === 0) return;

    // master 복원
    await queryRunner.query(
      `
      INSERT INTO product_masters
      SELECT (jsonb_populate_record(NULL::product_masters, master_json)).*
      FROM product_master_hff_corrupted_delete_snapshots
      WHERE cleanup_key = $1
      ON CONFLICT (id) DO NOTHING
      `,
      [this.CLEANUP_KEY],
    );
    // SPD 복원
    await queryRunner.query(
      `
      INSERT INTO shared_product_descriptions
      SELECT (jsonb_populate_record(NULL::shared_product_descriptions, elem)).*
      FROM product_master_hff_corrupted_delete_snapshots s, jsonb_array_elements(s.spd_json) elem
      WHERE s.cleanup_key = $1
      ON CONFLICT (id) DO NOTHING
      `,
      [this.CLEANUP_KEY],
    );
    // landing 복원
    await queryRunner.query(
      `
      INSERT INTO product_landings
      SELECT (jsonb_populate_record(NULL::product_landings, elem)).*
      FROM product_master_hff_corrupted_delete_snapshots s, jsonb_array_elements(s.landing_json) elem
      WHERE s.cleanup_key = $1
      ON CONFLICT (id) DO NOTHING
      `,
      [this.CLEANUP_KEY],
    );
  }

  private async count(queryRunner: QueryRunner, sql: string, params?: unknown[]): Promise<number> {
    const rows = await queryRunner.query(sql, params);
    return Number(rows?.[0]?.count ?? 0);
  }
}
