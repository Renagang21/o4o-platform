/**
 * 카탈로그 커뮤니티 → DB 개체 승격 + 기존 참여자 이행
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §10 (V7 선행 조건)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 CLI 인가
 *   데이터 전용 migration 은 스키마를 바꾸지 않으므로 fingerprint 가 직전 상태와 같아지고
 *   `EXPECTED_SCHEMA_STATES` 중복으로 계약 검사(C22)에 걸린다. 그래서 이행은 CLI 다.
 *
 * 왜 필요한가
 *   V7 로 게시글 경계가 **가입 승인**(`community_memberships`)으로 바뀌었다. 카탈로그에만
 *   존재하던 커뮤니티(`pharmacy` · `cosmetics` · `o4o-general`)는 아직 DB 행이 없어서,
 *   이 스크립트를 먼저 적용하지 않고 게이트를 배포하면 **기존 참여자 전원이 막힌다.**
 *
 * 승인 기준 — 기록된 참여 증거 AND 현재 참여 자격
 *   ① 증거: 그 커뮤니티의 forum 원장 코드(`forumStorageCodes`)에 속한 글 또는 댓글을 **실제로 쓴 사람**
 *   ② 자격: 카탈로그 participation policy 를 지금도 통과 (`service_memberships` active)
 *
 *   서비스 membership 만 있고 글을 쓴 적 없는 사람은 **승인하지 않는다.** 그들에게는
 *   새 계약대로 가입 신청 경로가 있다. 증거 없는 일괄 승인을 하지 않는 이유는, 그것이
 *   가입 승인형이라는 결정 자체를 무효로 만들기 때문이다.
 *
 * Usage
 *   tsx src/scripts/community-catalog-promotion.ts              # 측정만 (기본)
 *   tsx src/scripts/community-catalog-promotion.ts --apply      # 실제 write
 *
 * 기본은 dry-run 이다. `--apply` 없이는 한 행도 쓰지 않는다.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { O4O_COMMUNITIES, type CommunityDefinition } from '../config/community-catalog.js';

const APPLY = process.argv.includes('--apply');

/**
 * raw SQL 전용 연결 — entity 를 싣지 않는다 (`migrate.ts` 의 createMigrationDataSource 와 같은 형태).
 * 이 작업은 3테이블에 대한 raw SQL 뿐이라 entity 그래프가 필요 없고, 접속값은 드라이버로만 넘어가며
 * 로그에 남지 않는다.
 */
function createDataSource(): DataSource {
  const DB_HOST = process.env.DB_HOST;
  const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
  const DB_USERNAME = process.env.DB_USERNAME;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_NAME = process.env.DB_NAME;

  const presence = (v: string | undefined) => (v ? 'SET' : 'MISSING');
  if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_NAME) {
    throw new Error(
      'Missing required database environment variables.' +
        `
  DB_HOST: ${presence(DB_HOST)}` +
        `
  DB_USERNAME: ${presence(DB_USERNAME)}` +
        `
  DB_PASSWORD: ${presence(DB_PASSWORD)}` +
        `
  DB_NAME: ${presence(DB_NAME)}`,
    );
  }

  const isCloudSQLSocket = DB_HOST.startsWith('/cloudsql/');
  console.log(`Database transport: ${isCloudSQLSocket ? 'CLOUD_SQL_SOCKET' : 'TCP'}`);

  return new DataSource({
    type: 'postgres',
    host: DB_HOST,
    ...(isCloudSQLSocket ? {} : { port: DB_PORT }),
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [],
    migrations: [],
    synchronize: false,
    logging: ['error'],
  });
}

let AppDataSource: DataSource;

interface Measured {
  key: string;
  name: string;
  communityExisted: boolean;
  storageCodes: readonly string[];
  /** 원장에 글·댓글 기록이 있는 사용자 */
  evidenceUsers: number;
  /** 그중 지금도 참여 자격을 통과하는 사용자 = 승인 대상 */
  eligibleUsers: number;
  /** 이미 active 행이 있어 건너뛴 수 */
  alreadyActive: number;
  /** 이번에 새로 만든 active 행 (dry-run 이면 0) */
  inserted: number;
}

/** 참여 자격 판정을 SQL 로 — 카탈로그 policy 를 그대로 옮긴다(분기 복제 아님). */
function eligibilityClause(def: CommunityDefinition, paramIndex: number): { sql: string; params: string[][] } {
  if (def.participationPolicy.mode === 'authenticated') {
    // 로그인한 모든 O4O 사용자 — 추가 조건 없음.
    return { sql: 'TRUE', params: [] };
  }
  return {
    sql: `EXISTS (
            SELECT 1 FROM service_memberships sm
             WHERE sm.user_id = ev.user_id
               AND sm.status = 'active'
               AND sm.service_key = ANY($${paramIndex})
          )`,
    params: [[...def.participationPolicy.serviceKeys]],
  };
}

/**
 * 원장 코드 집합에서 글 또는 댓글을 쓴 사용자.
 *
 * `forum_post.forum_id → forum_category_requests.id → service_code` 가 Community 파티션이다
 * (community-catalog 의 adapter seam). 댓글은 그 글의 원장을 따른다.
 */
const EVIDENCE_CTE = `
  WITH ev AS (
    SELECT DISTINCT p.author_id AS user_id
      FROM forum_post p
      JOIN forum_category_requests r ON r.id = p.forum_id
     WHERE r.service_code = ANY($1) AND p.author_id IS NOT NULL
    UNION
    SELECT DISTINCT c.author_id AS user_id
      FROM forum_comment c
      JOIN forum_post p ON p.id = c.post_id
      JOIN forum_category_requests r ON r.id = p.forum_id
     WHERE r.service_code = ANY($1) AND c.author_id IS NOT NULL
  )`;

async function promote(def: CommunityDefinition): Promise<Measured> {
  const codes = [...def.forumStorageCodes];
  const elig = eligibilityClause(def, 2);

  const [{ count: evidenceUsers }] = await AppDataSource.query(
    `${EVIDENCE_CTE} SELECT count(*)::int AS count FROM ev`,
    [codes],
  );
  const [{ count: eligibleUsers }] = await AppDataSource.query(
    `${EVIDENCE_CTE} SELECT count(*)::int AS count FROM ev WHERE ${elig.sql}`,
    [codes, ...elig.params],
  );

  const existing: Array<{ id: string }> = await AppDataSource.query(
    `SELECT id FROM communities WHERE slug = $1`,
    [def.key],
  );
  const communityExisted = existing.length > 0;

  const measured: Measured = {
    key: def.key,
    name: def.name,
    communityExisted,
    storageCodes: def.forumStorageCodes,
    evidenceUsers,
    eligibleUsers,
    alreadyActive: 0,
    inserted: 0,
  };

  if (communityExisted) {
    const [{ count }] = await AppDataSource.query(
      `SELECT count(*)::int AS count
         FROM community_memberships
        WHERE community_id = $1 AND status = 'active'`,
      [existing[0].id],
    );
    measured.alreadyActive = count;
  }

  if (!APPLY) return measured;

  await AppDataSource.transaction(async (m) => {
    // ① 개체 승격 — 멱등. 이미 있으면 이름·상태를 건드리지 않는다(운영자가 바꿨을 수 있다).
    const rows: Array<{ id: string }> = await m.query(
      `INSERT INTO communities (slug, name, status)
            VALUES ($1, $2, 'active')
       ON CONFLICT (slug) DO UPDATE SET slug = communities.slug
         RETURNING id`,
      [def.key, def.name],
    );
    const communityId = rows[0].id;

    // ② 증거 + 자격을 통과한 사용자만 active 회원으로. 기존 행은 덮어쓰지 않는다.
    const inserted: Array<unknown> = await m.query(
      `${EVIDENCE_CTE}
       INSERT INTO community_memberships (community_id, user_id, role, status, approved_at)
       SELECT $${2 + elig.params.length}, ev.user_id, 'member', 'active', now()
         FROM ev
        WHERE ${elig.sql}
       ON CONFLICT (community_id, user_id) DO NOTHING
       RETURNING id`,
      [codes, ...elig.params, communityId],
    );
    measured.inserted = inserted.length;
  });

  return measured;
}

async function main() {
  AppDataSource = createDataSource();
  await AppDataSource.initialize();
  try {
    console.log(`mode: ${APPLY ? 'APPLY (writes rows)' : 'DRY-RUN (measure only)'}`);
    const results: Measured[] = [];
    for (const def of O4O_COMMUNITIES.filter((c) => c.status === 'active')) {
      results.push(await promote(def));
    }

    console.log('');
    for (const r of results) {
      console.log(
        [
          `community=${r.key}`,
          `row_existed=${r.communityExisted}`,
          `storage_codes=${r.storageCodes.join('|')}`,
          `evidence_users=${r.evidenceUsers}`,
          `eligible_users=${r.eligibleUsers}`,
          `already_active=${r.alreadyActive}`,
          `inserted=${r.inserted}`,
        ].join('  '),
      );
    }
    const totalEligible = results.reduce((a, r) => a + r.eligibleUsers, 0);
    const totalInserted = results.reduce((a, r) => a + r.inserted, 0);
    console.log('');
    console.log(`TOTAL eligible=${totalEligible} inserted=${totalInserted}`);
    if (!APPLY) {
      console.log('no rows written — re-run with --apply after reviewing the numbers above');
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error('community-catalog-promotion FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
