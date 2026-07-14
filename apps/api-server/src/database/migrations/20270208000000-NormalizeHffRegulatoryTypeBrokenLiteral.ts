import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-HFF-BROKEN-REGULATORY-TYPE-NORMALIZE-V1
 *
 * 배경 (프로덕션 read-only dry-run, 2026-07-14, Cloud SQL Auth Proxy):
 *   product_masters.regulatory_type 분포에서 정상 건기식 값은 한글 리터럴 '건강기능식품'(30건).
 *   그런데 CP949→UTF8 mis-decode 로 손상된 리터럴(U+FFFD 치환, hex efbfbd…c7b0)이 5건 존재.
 *   5건 모두 손상 hex 동일 → 원래 값이 모두 '건강기능식품' 이었다는 강한 증거.
 *   생성 2026-07-10~12 = 바코드리스 admin 등록(Phase D) 라이브 시점과 일치(등록 경로 인코딩 버그 추정).
 *
 * 범위 결정 (사용자 승인 2026-07-14):
 *   - 이 마이그레이션은 regulatory_type 만 '건강기능식품' 으로 정규화한다.
 *   - name / manufacturer_name 은 변경하지 않는다 — 상품명 기준은 식약처 공식 제품명이며,
 *     SPD 설명서 제목/본문을 상품명 복구 근거로 쓰지 않는다(CR-007). 인코딩 원문 복구는
 *     식약처 공식 원천(candidate raw_payload·품목보고번호) 매칭 후 별도 guarded WO 로 분리.
 *   - 4건만 대상. 0b5502e5(설명서 0건, 분류 근거 부족)는 HOLD — 이 마이그레이션에서 제외.
 *
 * 대상 4건 (SPD 설명서 존재 = 실사용 파이프라인, 원래 건기식 등록):
 *   38a9d3e4-56be-4967-aa7b-0cb2d2e6baff  (프로바이오틱스, SPD 8)
 *   bcc5d466-bb2e-4d37-aa16-197de70bb8a6  (쏘팔메토/전립선, SPD 4)
 *   db20f469-229c-46e2-a75b-06c27700fe5f  (홍삼스틱, SPD 4)
 *   fb7d9684-f8c7-4569-9ea4-c2f91011af61  (비타민C, SPD 4)
 * HOLD (미대상):
 *   0b5502e5-7b33-4ed8-9295-c63c35b0e9bf  (설명서 0, 분류 근거 부족)
 *
 * 안전성: 손상된 old regulatory_type 을 스냅샷에 보존(down 복원용). 재실행 시 이미 '건강기능식품'
 *   이면 0건 update(idempotent). 프로덕션 외 환경엔 해당 UUID 부재 → 0건 no-op.
 */
export class NormalizeHffRegulatoryTypeBrokenLiteral20270208000000 implements MigrationInterface {
  name = 'NormalizeHffRegulatoryTypeBrokenLiteral20270208000000';

  private readonly MIGRATION_VERSION = 'WO-O4O-HFF-BROKEN-REGULATORY-TYPE-NORMALIZE-V1';
  private readonly TARGET_IDS = [
    '38a9d3e4-56be-4967-aa7b-0cb2d2e6baff',
    'bcc5d466-bb2e-4d37-aa16-197de70bb8a6',
    'db20f469-229c-46e2-a75b-06c27700fe5f',
    'fb7d9684-f8c7-4569-9ea4-c2f91011af61',
  ];
  private readonly CANONICAL = '건강기능식품';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. 스냅샷 테이블 (idempotent) — 손상된 old regulatory_type 보존(down 복원용)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_master_hff_regtype_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_master_id UUID NOT NULL,
        old_regulatory_type_hex TEXT,
        migration_version VARCHAR(80) NOT NULL,
        migrated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 1. 대상 중 아직 정규화 안 된 행만 스냅샷 (hex 로 손상 바이트 보존)
    await queryRunner.query(
      `
      INSERT INTO product_master_hff_regtype_snapshots
        (product_master_id, old_regulatory_type_hex, migration_version)
      SELECT pm.id, encode(pm.regulatory_type::bytea, 'hex'), $1
      FROM product_masters pm
      WHERE pm.id = ANY($2::uuid[])
        AND pm.regulatory_type <> $3
      `,
      [this.MIGRATION_VERSION, this.TARGET_IDS, this.CANONICAL],
    );

    // 2. regulatory_type 만 정규화 (4건 대상, 단일 컬럼)
    await queryRunner.query(
      `UPDATE product_masters SET regulatory_type = $1 WHERE id = ANY($2::uuid[]) AND regulatory_type <> $1`,
      [this.CANONICAL, this.TARGET_IDS],
    );

    // 3. 사후 불변식: 대상 4건이 프로덕션에 존재하면 전부 '건강기능식품' 이어야 함.
    //    (타 환경 = UUID 부재 → present 0 → 검증 skip)
    const present = await this.count(
      queryRunner,
      `SELECT count(*)::int AS count FROM product_masters WHERE id = ANY($1::uuid[])`,
      [this.TARGET_IDS],
    );
    if (present > 0) {
      const normalized = await this.count(
        queryRunner,
        `SELECT count(*)::int AS count FROM product_masters WHERE id = ANY($1::uuid[]) AND regulatory_type = $2`,
        [this.TARGET_IDS, this.CANONICAL],
      );
      if (normalized !== present) {
        throw new Error(
          `[${this.name}] Post-invariant failed → ROLLBACK. present=${present} normalized=${normalized} (expected equal).`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasSnap = await this.count(
      queryRunner,
      `SELECT count(*)::int AS count FROM information_schema.tables WHERE table_name = 'product_master_hff_regtype_snapshots'`,
    );
    if (hasSnap === 0) return;

    // 손상된 old 값(hex) 복원 — convert_from(decode(hex)) 로 원래 바이트 복원
    await queryRunner.query(
      `
      UPDATE product_masters pm
      SET regulatory_type = convert_from(decode(s.old_regulatory_type_hex, 'hex'), 'UTF8')
      FROM product_master_hff_regtype_snapshots s
      WHERE pm.id = s.product_master_id
        AND s.migration_version = $1
        AND s.old_regulatory_type_hex IS NOT NULL
      `,
      [this.MIGRATION_VERSION],
    );
  }

  private async count(queryRunner: QueryRunner, sql: string, params?: unknown[]): Promise<number> {
    const rows = await queryRunner.query(sql, params);
    return Number(rows?.[0]?.count ?? 0);
  }
}
