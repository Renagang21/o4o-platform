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
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username, password, database, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 120000 } });
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
 * --source db|file 선택 + 실사용 소스 로그.
 * **기본 = db**(product_candidates.raw_payload — 동치검증 PASS, G: 비의존). `--source file` 로 파일 raw(회귀/대조).
 * 파일 부재 시 자동 전환 없음 — 명시적 선택만.
 */
export function resolveSource(argv: string[], env: NodeJS.ProcessEnv, baseLike?: string[]): { kind: 'db' | 'file'; gen: AsyncGenerator<HffRawItem>; label: string } {
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
