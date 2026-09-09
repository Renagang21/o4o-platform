import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §3·§4
 *
 * QR 의 **"어디에서 사용하는가"**(Placement)를 담을 신규 원장 1개 + 목록 조회용 캐시 컬럼 1개.
 *
 * 왜 신규인가 (DESIGN §7-3 조사 결과)
 *   확장할 기존 구조가 없다. `store_execution_assets.usage_type` 은 "자산을 어떤 매체로 쓰는가"
 *   축이고 자산 쪽에 붙어 있어 QR 의 배치 위치를 표현할 자리가 없다.
 *   `store_tablets.location` 은 태블릿 1대의 물리 위치이며 QR 과 연결점이 없다.
 *
 * 모델 (DESIGN §8 채택안 B)
 *   1 QR : N Placement 를 허용한다(이력 포함). 분석 단위는 여전히 **QR Instance** 다 —
 *   같은 QR 이미지를 두 곳에 붙이면 스캔 귀속은 어떤 소프트웨어로도 불가능하기 때문이다.
 *   위치별 분석이 필요하면 위치별 QR Instance 를 발급한다(§8 정책).
 *
 * 안전 계약
 *   - 신규 테이블 1개 + nullable 컬럼 1개 + index 만. **기존 컬럼·행·스캔 이력 무변경.**
 *   - `placement` 는 **개방형**이다. DB CHECK/enum 을 즉시 걸지 않는다(DESIGN §7-2) —
 *     실제 사용 분포를 관측한 뒤 정규화한다. UI preset 은 프론트에서만 제시한다.
 *   - **기존 QR backfill 0** (WO §5). title/type/contentSource 로 위치를 추정하지 않는다.
 *     screen_set QR 이라고 TABLET 배치를 자동 생성하지도 않는다.
 *     기존 행은 `primary_placement = NULL`, placement row 0 으로 남는다.
 *   - `slug` · `is_active` · `landing_type` · `landing_target_id` 는 건드리지 않는다(§0-2 주소 불변).
 *
 * FK 관행
 *   기존 QR 계열 테이블(`store_qr_scan_events`)이 물리 FK 없이 논리 참조를 쓰므로 같은 관행을 따른다.
 *   대신 (organization_id, qr_code_id) 복합 index 로 테넌트 경계 조회를 보장한다(Boundary Guard Rule 3).
 */
export class CreateStoreQrPlacements20270330000000 implements MigrationInterface {
  name = 'CreateStoreQrPlacements20270330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_qr_placements (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id  UUID NOT NULL,
        qr_code_id       UUID NOT NULL,
        placement        VARCHAR(40) NOT NULL,
        label            VARCHAR(200) NULL,
        corner_ref       VARCHAR(200) NULL,
        status           VARCHAR(16) NOT NULL DEFAULT 'active',
        started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        ended_at         TIMESTAMPTZ NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      COMMENT ON TABLE store_qr_placements IS
        'QR 사용처 이력(SSOT). 1 QR : N Placement. status=active|ended. placement 값은 개방형 — DB CHECK 를 두지 않는다.'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN store_qr_placements.placement IS
        '사용처 코드(TABLET/SHELF/ESL/POP/POSTER/COUNSELING_TABLE/ENTRANCE/PRINT/OTHER 등). 개방형이며 미래 값 확장 가능.'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN store_qr_placements.corner_ref IS
        '코너/구역 참조(선택). 태블릿 배치면 tabletId 등을 담을 수 있다. 특정 벤더 필드를 추가하지 않는다.'
    `);

    // 테넌트 경계 + QR 단위 이력 조회 (상세 화면 · analytics 구간 조인)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_qr_placements_org_qr"
        ON store_qr_placements (organization_id, qr_code_id)
    `);
    // 조직별 현재 사용처 분포(운영 화면 필터)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_qr_placements_org_active"
        ON store_qr_placements (organization_id, placement)
        WHERE status = 'active'
    `);
    // scan 구간 귀속 조인 (qr_code_id + 시간 구간)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_qr_placements_qr_interval"
        ON store_qr_placements (qr_code_id, started_at, ended_at)
    `);

    // ── 목록 조회용 캐시. SSOT 는 store_qr_placements 다. ──
    await queryRunner.query(`
      ALTER TABLE store_qr_codes
        ADD COLUMN IF NOT EXISTS primary_placement VARCHAR(40) NULL
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN store_qr_codes.primary_placement IS
        '대표 사용처 캐시(denormalized). SSOT 는 store_qr_placements. 활성 배치가 정확히 1개일 때만 그 값, 0개면 NULL, 2개 이상이면 MULTIPLE.'
    `);

    // backfill 하지 않는다 — WO §5. 기존 QR 은 primary_placement NULL · placement row 0 으로 남는다.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE store_qr_codes DROP COLUMN IF EXISTS primary_placement`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_qr_placements_qr_interval"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_qr_placements_org_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_qr_placements_org_qr"`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_qr_placements`);
  }
}
