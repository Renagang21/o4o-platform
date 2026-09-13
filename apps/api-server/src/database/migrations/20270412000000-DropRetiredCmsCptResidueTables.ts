import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CMS-RETIRED-PHYSICAL-TABLE-FINAL-DROP-V1
 * 근거 조사: IR-O4O-CMS-RETIRED-PHYSICAL-TABLE-RESIDUE-CENSUS-V1 (2026-09-13, 운영 read-only 실측)
 *
 * 은퇴한 CMS Page/View · CPT/ACF 축의 **물리 잔재** 4개를 제거한다. 코드에서는 이미 제거됐고
 * (WO-O4O-CMS-LIFECYCLE-SCHEMA-CPT-ACF-AND-DEAD-ENTITY-FINAL-RETIREMENT-V1), 운영 실측 결과:
 *   - exact COUNT(*) = 0 · table 데이터 페이지 0 · 통계 리셋(2025-12-25) 이후 삽입/갱신/삭제 0
 *   - view · trigger · policy · sequence · publication · partition 의존 0
 *   - FK 는 후보 내부 2건뿐: custom_fields.postTypeId → custom_post_types · pages.viewId → views
 *   - 기록된 migration 이 만든 테이블이 아니다(typeorm_migrations 에 CPT/ACF/Page/View 생성 기록 0,
 *     PK/FK 가 TypeORM 해시명 → 과거 synchronize 또는 미기록 runner 의 산물)
 *   - 최신 코드 소비 0 · 30일 운영 로그 외부 소비 0 · 콘텐츠 정본은 cms_contents
 *
 * 안전 장치:
 *   - 대상은 exact 이름 4개만. wildcard · CASCADE 사용 금지 (RESTRICT 기본 — 예상 밖 의존이 있으면 DROP 자체가 실패한다).
 *   - 각 테이블마다 up() 가 (1) 존재하면 (2) COUNT(*)=0 (3) 후보 밖 inbound FK 0 을 확인하고,
 *     하나라도 어긋나면 throw 한다 → migration job 실패 → deploy 미실행 → 기존 revision 유지 (삭제 없음).
 *   - 순서: FK 자식 먼저. custom_fields → custom_post_types, pages → views.
 *   - down() 은 no-op — 데이터가 없고 entity 계약도 코드에 없어 재생성할 것이 없다. 복원이 필요하면 별도 WO.
 */
export class DropRetiredCmsCptResidueTables20270412000000 implements MigrationInterface {
  name = 'DropRetiredCmsCptResidueTables20270412000000';

  /** FK 자식 → 부모 순. 이 배열 밖의 이름은 절대 건드리지 않는다. */
  private static readonly TARGETS: ReadonlyArray<{ table: string; allowedInboundFrom: readonly string[] }> = [
    { table: 'custom_fields', allowedInboundFrom: [] },
    { table: 'custom_post_types', allowedInboundFrom: ['custom_fields'] },
    { table: 'pages', allowedInboundFrom: [] },
    { table: 'views', allowedInboundFrom: ['pages'] },
  ];

  async up(q: QueryRunner): Promise<void> {
    for (const { table, allowedInboundFrom } of DropRetiredCmsCptResidueTables20270412000000.TARGETS) {
      const exists = await q.hasTable(table);
      if (!exists) {
        console.log(`[DropRetiredCmsCptResidueTables] ${table}: absent — skip`);
        continue;
      }

      // (2) 행이 하나라도 있으면 삭제하지 않는다 (IR §10.4 STOP_DATA_PRESENT).
      const [{ n }] = (await q.query(`SELECT count(*)::int AS n FROM "${table}"`)) as Array<{ n: number }>;
      if (n !== 0) {
        throw new Error(`[DropRetiredCmsCptResidueTables] ${table} has ${n} row(s) — refusing to drop (STOP_DATA_PRESENT)`);
      }

      // (3) 후보 밖에서 들어오는 FK 가 있으면 삭제하지 않는다 (IR §10.5 STOP_DEPENDENCY_PRESENT).
      const inbound = (await q.query(
        `SELECT conrelid::regclass::text AS from_table
           FROM pg_constraint
          WHERE contype = 'f' AND confrelid = $1::regclass`,
        [`public.${table}`],
      )) as Array<{ from_table: string }>;
      const unexpected = inbound
        .map((r) => r.from_table.replace(/^public\./, '').replace(/"/g, ''))
        .filter((from) => !allowedInboundFrom.includes(from));
      if (unexpected.length > 0) {
        throw new Error(
          `[DropRetiredCmsCptResidueTables] ${table} has unexpected inbound FK from ${unexpected.join(', ')} — refusing to drop (STOP_DEPENDENCY_PRESENT)`,
        );
      }

      // RESTRICT(기본): 남은 의존이 있으면 PostgreSQL 이 거부한다. CASCADE 는 쓰지 않는다.
      await q.query(`DROP TABLE "${table}" RESTRICT`);
      console.log(`[DropRetiredCmsCptResidueTables] ${table}: dropped (rows=0, unexpected inbound FK=0)`);
    }
  }

  async down(): Promise<void> {
    // no-op: 4개 테이블은 행 0 · entity 계약 부재 · 정본(cms_contents) 별도 존재.
    // 재생성 계약이 코드에 없으므로 되돌릴 것이 없다. 복원이 필요하면 별도 WO 로 다룬다.
    console.warn('[DropRetiredCmsCptResidueTables] down() is a no-op (nothing to restore — tables were empty and entities are retired).');
  }
}
