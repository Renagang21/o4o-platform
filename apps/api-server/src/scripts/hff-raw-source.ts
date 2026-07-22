/**
 * HFF raw 입력 어댑터 — 파일 JSONL(G:) / DB product_candidates.raw_payload 공통 소스.
 *
 * WO-...-LARGE-FUNCTION-GROUPS PART B 소스 전환. 파이프라인(select/compose/guard)은 동일 item 형태를 소비.
 * 실제 사용 소스를 로그에 명시(파일 부재 시 조용한 자동전환 금지 — 명시적 선택).
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { DataSource } from 'typeorm';

export interface HffRawItem { ENTRPS?: string; PRDUCT?: string; STTEMNT_NO?: string; DISTB_PD?: string; SUNGSANG?: string; SRV_USE?: string; PRSRV_PD?: string; INTAKE_HINT1?: string; MAIN_FNCTN?: string; BASE_STANDARD?: string; REGIST_DT?: string }

export const DEFAULT_RAW_FILE = 'G:/내 드라이브/자료실/public-data-api-samples/mfds-health-functional-food-info-raw.jsonl';

export async function* fileJsonlSource(path: string): AsyncGenerator<HffRawItem> {
  const rl = readline.createInterface({ input: fs.createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    const l = line.trim(); if (!l) continue;
    let obj: HffRawItem & { item?: HffRawItem }; try { obj = JSON.parse(l); } catch { continue; }
    yield obj.item ?? obj;
  }
}

/**
 * baseLike: BASE_STANDARD 에 **모두** 포함돼야 하는 부분문자열 배열(ILIKE ALL). 각 원소는 적격 제품에
 * 반드시 존재하는 **필요조건**이어야 한다(그래야 valid 제품 누락 0 = 동치 보존). 서버사이드 선필터로 스캔 단축.
 */
export async function* dbCandidateSource(port: number, username?: string, password?: string, database?: string, baseLike?: string[]): AsyncGenerator<HffRawItem> {
  // statement_timeout: prefilter 없는 조합(식이섬유·오메가3 등 동의어 변이 원료)은 비인덱스 JSON ILIKE 전량 스캔이라 120s 초과 → 5분.
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username, password, database, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  const likes = (baseLike ?? []).filter((x) => x && x.trim()).map((x) => `%${x}%`);
  if (likes.length) console.error(`[source] DB 서버사이드 BASE_STANDARD ILIKE ALL: ${JSON.stringify(baseLike)}`);
  try {
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; src: HffRawItem }> = likes.length
        ? await ds.query(
            `SELECT id, raw_payload->'source' AS src FROM product_candidates
             WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1
               AND raw_payload->'source'->>'BASE_STANDARD' ILIKE ALL($2::text[])
             ORDER BY id ASC LIMIT 2000`, [after, likes])
        : await ds.query(
            `SELECT id, raw_payload->'source' AS src FROM product_candidates
             WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1
             ORDER BY id ASC LIMIT 2000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) if (r.src) yield r.src;
      after = rows[rows.length - 1].id;
    }
  } finally { await ds.destroy(); }
}

/**
 * statementNo 직접 주입 소스 — shard-plan 이 산출한 대상 STTEMNT_NO 만 fetch(ILIKE 전수 스캔 제거).
 * 결과 row 형태는 dbCandidateSource 와 동일(raw_payload->'source') → 하위 strict 검증 경로 무변경.
 */
export async function* dbStmtListSource(port: number, username: string | undefined, password: string | undefined, database: string | undefined, stmts: string[]): AsyncGenerator<HffRawItem> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username, password, database, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  const uniq = [...new Set(stmts.filter((s) => s && s.trim()))];
  console.error(`[source] DB 직접주입 STTEMNT_NO ${uniq.length}건 (ILIKE 스캔 없음)`);
  try {
    const CHUNK = 1000;
    for (let i = 0; i < uniq.length; i += CHUNK) {
      const slice = uniq.slice(i, i + CHUNK);
      const rows: Array<{ src: HffRawItem }> = await ds.query(
        `SELECT raw_payload->'source' AS src FROM product_candidates
          WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
            AND raw_payload->'source'->>'STTEMNT_NO' = ANY($1::text[])`, [slice]);
      for (const r of rows) if (r.src) yield r.src;
    }
  } finally { await ds.destroy(); }
}

/**
 * statementNo 직접주입 소스 — shard-plan 이 산출한 signature별 STTEMNT_NO 목록만 조회.
 * ILIKE 전수 스캔 대신 지정 신고번호만 fetch → 파싱 대상 대폭 축소(수천 → 수십). strict 검증은 소비부(select)가 동일 수행.
 * 청크 단위 `= ANY` 조회. 순서 무관(select 가 exact-set 재검).
 */
export async function* dbStmtNosSource(port: number, username: string | undefined, password: string | undefined, database: string | undefined, stmtNos: string[]): AsyncGenerator<HffRawItem> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username, password, database, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  const uniq = [...new Set(stmtNos.map((s) => String(s).trim()).filter(Boolean))];
  console.error(`[source] DB statementNo 직접주입: ${uniq.length}건`);
  try {
    for (let i = 0; i < uniq.length; i += 1000) {
      const chunk = uniq.slice(i, i + 1000);
      const rows: Array<{ src: HffRawItem }> = await ds.query(
        `SELECT raw_payload->'source' AS src FROM product_candidates
         WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
           AND raw_payload->'source'->>'STTEMNT_NO' = ANY($1::text[])`, [chunk]);
      for (const r of rows) if (r.src) yield r.src;
    }
  } finally { await ds.destroy(); }
}

/**
 * --source db|file 선택 + 실사용 소스 로그.
 * **기본 = db**(product_candidates.raw_payload — 동치검증 PASS, G: 비의존). `--source file` 로 파일 raw(회귀/대조).
 * `--statement-nos-file <path>`(JSON 배열 또는 개행 목록) 지정 시 **직접 주입 소스**(ILIKE 스캔 제거) — baseLike 무시.
 * 파일 부재 시 자동 전환 없음 — 명시적 선택만.
 */
export function resolveSource(argv: string[], env: NodeJS.ProcessEnv, baseLike?: string[]): { kind: 'db' | 'file'; gen: AsyncGenerator<HffRawItem>; label: string } {
  const si = argv.indexOf('--statement-nos-file');
  if (si >= 0 && argv[si + 1]) {
    const path = argv[si + 1];
    const raw = fs.readFileSync(path, 'utf8').trim();
    const stmts: string[] = raw.startsWith('[') ? JSON.parse(raw) : raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const port = parseInt(env.PROXY_PORT ?? '5446', 10);
    console.error(`[source] DB 직접주입(statement-nos-file ${path}, ${stmts.length}건, proxy ${port})`);
    return { kind: 'db', gen: dbStmtListSource(port, env.DB_USERNAME, env.DB_PASSWORD, env.DB_NAME, stmts), label: `db:stmtList@${port}` };
  }
  const i = argv.indexOf('--source'); const kind = (i >= 0 && argv[i + 1] === 'file') ? 'file' : 'db';
  if (kind === 'db') {
    const port = parseInt(env.PROXY_PORT ?? '5446', 10);
    console.error(`[source] DB product_candidates.raw_payload (proxy ${port})`);
    return { kind, gen: dbCandidateSource(port, env.DB_USERNAME, env.DB_PASSWORD, env.DB_NAME, baseLike), label: `db:raw_payload@${port}` };
  }
  const fi = argv.indexOf('--file'); const path = fi >= 0 ? argv[fi + 1] : DEFAULT_RAW_FILE;
  console.error(`[source] file JSONL: ${path}`);
  return { kind, gen: fileJsonlSource(path), label: `file:${path}` };
}
