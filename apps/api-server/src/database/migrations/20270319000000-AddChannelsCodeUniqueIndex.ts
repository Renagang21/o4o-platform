import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CHANNEL-CODE-DATABASE-UNIQUENESS-INTEGRITY-V1
 *
 * `channels.code` 는 signage player 의 **익명 단건 주소**다
 * (`GET /api/v1/channels/code/:code`, WO-O4O-SIGNAGE-PLAYER-CHANNEL-CODE-LOOKUP-CONTRACT-CLOSURE-V1).
 * 그런데 유일성이 application layer 의 `findOne({ code }) → 409 DUPLICATE_CODE` 사전 검사
 * 하나로만 보장되고 있었다. 사전 검사와 INSERT 가 같은 트랜잭션이 아니므로
 *
 *   Tx A: 중복 없음 확인 → Tx B: 중복 없음 확인 → A INSERT → B INSERT
 *
 * 순서로 같은 code 두 행이 만들어질 수 있다. 그 상태에서는 디바이스 주소가 모호해진다.
 * 이 마이그레이션은 그 유일성을 DB 로 내린다.
 *
 * ## 유일성 범위 — 전역(code) 이다
 *
 * `POST /channels` 와 `PUT /channels/:id` 의 중복 검사는 모두 `findOne({ where: { code } })`,
 * 즉 **serviceKey 를 조건에 넣지 않는다**. 그래서 실제 계약은 `UNIQUE(serviceKey, code)` 가
 * 아니라 `UNIQUE(code)` 다. player 도 serviceKey 없이 code 만으로 채널을 주소지정한다.
 *
 * ## 부분 인덱스인 이유
 *
 * `code` 는 nullable 이고(코드 없는 채널 허용) 이번 WO 에서 NOT NULL 로 바꾸지 않는다.
 * 기존 조회 인덱스도 `... WHERE code IS NOT NULL` 부분 인덱스였다. 같은 형태를 유지한다.
 * (Postgres 는 NULL 을 서로 다른 값으로 보므로 부분 조건이 없어도 NULL 다중 행은 허용된다.
 *  부분 조건은 의도를 명시하고 인덱스 크기를 줄이기 위한 것이다.)
 *
 * ## 대소문자 / 공백
 *
 * 현재 계약은 case-sensitive 이고 trim 도 하지 않는다(`ABC` != `abc`, `abc` != ` abc `).
 * `lower(code)` 유니크는 제품 정책 변경이므로 도입하지 않는다(WO §9 §10 §32).
 *
 * ## 데이터 변경량 0
 *
 * 구조만 추가한다. 행을 만들거나 지우거나 고치지 않는다.
 * 중복이 있으면 조용히 넘어가지 않고 즉시 실패한다(자동 삭제/rename 금지, WO §24).
 */
export class AddChannelsCodeUniqueIndex20270319000000 implements MigrationInterface {
  name = 'AddChannelsCodeUniqueIndex20270319000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable: Array<{ table_name: string }> = await queryRunner.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'channels'
    `);
    if (hasTable.length === 0) {
      // channels 를 만드는 마이그레이션이 아직 안 돌았다면 할 일이 없다.
      console.log('[AddChannelsCodeUniqueIndex] channels table 없음 — skip');
      return;
    }

    // 0) census — 적용 시점의 실제 상태를 로그에 남긴다(WO §4 §24).
    const census: Array<{ total: string; with_code: string; null_code: string }> =
      await queryRunner.query(`
        SELECT count(*)::text AS total,
               count(code)::text AS with_code,
               count(*) FILTER (WHERE code IS NULL)::text AS null_code
        FROM channels
      `);
    const dupRows: Array<{ code: string; n: string }> = await queryRunner.query(`
      SELECT code, count(*)::text AS n
      FROM channels
      WHERE code IS NOT NULL
      GROUP BY code
      HAVING count(*) > 1
      ORDER BY count(*) DESC
      LIMIT 20
    `);
    console.log(
      `[AddChannelsCodeUniqueIndex] census: total=${census?.[0]?.total} ` +
        `withCode=${census?.[0]?.with_code} nullCode=${census?.[0]?.null_code} ` +
        `duplicateCodeGroups=${dupRows.length}`
    );

    if (dupRows.length > 0) {
      const sample = dupRows.map((r) => `${r.code}×${r.n}`).join(', ');
      throw new Error(
        `[AddChannelsCodeUniqueIndex] 중복 code ${dupRows.length}개 그룹이 있어 유니크 인덱스를 ` +
          `만들 수 없다 (${sample}). 어떤 채널이 정본인지는 운영 판단이므로 자동으로 ` +
          `삭제/rename 하지 않는다. 정리 후 재실행할 것.`
      );
    }

    // 1) 유니크 인덱스 추가
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_channels_code"
        ON channels (code)
        WHERE code IS NOT NULL
    `);

    // 2) 같은 컬럼/같은 조건의 비유니크 조회 인덱스는 이제 완전히 중복이다.
    //    (idx_channels_code = ON channels (code) WHERE code IS NOT NULL — 1736600000000)
    //    유니크 인덱스가 동일한 조회를 처리하므로 쓰기 비용만 남는다.
    await queryRunner.query(`DROP INDEX IF EXISTS idx_channels_code`);

    const after: Array<{ indexname: string }> = await queryRunner.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'channels' AND indexname IN ('UQ_channels_code', 'idx_channels_code')
    `);
    console.log(
      `[AddChannelsCodeUniqueIndex] done: indexes=${after.map((r) => r.indexname).join(',') || 'none'}`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 원래의 비유니크 조회 인덱스를 먼저 복원한 뒤 유니크를 제거한다(조회 인덱스 공백 없음).
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_channels_code
        ON channels (code)
        WHERE code IS NOT NULL
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_channels_code"`);
  }
}
