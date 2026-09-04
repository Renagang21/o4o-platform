import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-FINAL-CLOSURE-V1 (A축)
 *
 * `store_events` 테이블 제거.
 *
 * ## 왜 제거하는가
 *
 * `WO-O4O-STORE-EVENT-MINIMAL-V1` 이 준비 단계로 만든 테이블이다
 * (`20260301200000-CreateStoreEvents`). 그러나 엔티티·라우트·서비스가
 * 만들어지지 않은 채로 남았고, `StoreEvent` 엔티티 정의는
 * `WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1` 에서
 * 이미 제거됐다. 현재 저장소에 read/write 경로가 0 이다.
 *
 * ## 프로덕션 census (본 WO §5, read-only 재확인)
 *
 * ```text
 * row count                : 0
 * n_tup_ins / upd / del    : 0 / 0 / 0  (통계 기준시각 2025-12-25 이후 write 0)
 * inbound FK               : 0
 * outbound FK              : store_events_organization_id_fkey → organizations
 * view / matview           : 0
 * trigger                  : 0
 * function                 : 0
 * pg_depend (비내부)        : 0
 * ```
 *
 * row 0 이므로 데이터 백업이 필요 없다. 스키마 원복은 `down()` 이 담당한다.
 *
 * ## rollback
 *
 * `down()` 은 `20260301200000-CreateStoreEvents` 의 `up()` 과 동일한 DDL 이다
 * (프로덕션 실측 컬럼 정의와 대조 확인).
 */
export class DropStoreEventsTable20270321000000 implements MigrationInterface {
  name = 'DropStoreEventsTable20270321000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_events_org_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_events_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_events`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_events_org"
        ON store_events (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_events_org_active"
        ON store_events (organization_id, is_active)
    `);
  }
}
