/**
 * Agent C 완결 배치 — 대상 statementNo 의 DB 기제작/승격 여부 read-only 확인.
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-combo-c-dedup-probe.ts --stmts <json> --out <json>
 *
 * 목적: strict select ELIGIBLE 을 generate 전에 LIVE 중복 제거. apply 스크립트가 ALREADY_PROMOTED /
 *   MASTER_EXISTS 로 배치 전체를 던지므로, 사전에 오염 stmt 를 걸러 clean pool 을 만든다.
 * read-only(SELECT only) · DB write 0.
 */
import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const STMTS = arg('stmts'); const OUT = arg('out');
if (!STMTS) throw new Error('--stmts <json> 필요');
const stmts: string[] = JSON.parse(fs.readFileSync(STMTS, 'utf8'));

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: process.env.PROXY_HOST ?? '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 120000 } });
  await ds.initialize();
  try {
    // 이미 마스터로 승격된 candidate (matched != null)
    const promoted: Array<{ stmt: string; status: string }> = await ds.query(
      `SELECT raw_payload::jsonb->'source'->>'STTEMNT_NO' AS stmt, candidate_status AS status
         FROM product_candidates
        WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
          AND matched_product_master_id IS NOT NULL
          AND raw_payload::jsonb->'source'->>'STTEMNT_NO' = ANY($1)`, [stmts]);
    // 이미 permit master 존재
    const masterExists: Array<{ p: string }> = await ds.query(
      `SELECT mfds_permit_number AS p FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]);
    // candidate 자체 부재(소스 불일치 — apply 시 CANDIDATE_MISSING)
    const present: Array<{ stmt: string }> = await ds.query(
      `SELECT DISTINCT raw_payload::jsonb->'source'->>'STTEMNT_NO' AS stmt
         FROM product_candidates
        WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
          AND raw_payload::jsonb->'source'->>'STTEMNT_NO' = ANY($1)`, [stmts]);
    // candidate 중복(ambiguous)
    const ambig: Array<{ stmt: string; c: number }> = await ds.query(
      `SELECT raw_payload::jsonb->'source'->>'STTEMNT_NO' AS stmt, count(*)::int c
         FROM product_candidates
        WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
          AND raw_payload::jsonb->'source'->>'STTEMNT_NO' = ANY($1)
        GROUP BY 1 HAVING count(*)>1`, [stmts]);

    const presentSet = new Set(present.map((r) => r.stmt));
    const dirty = new Set<string>([...promoted.map((r) => r.stmt), ...masterExists.map((r) => r.p), ...ambig.map((r) => r.stmt)]);
    const missing = stmts.filter((s) => !presentSet.has(s));
    for (const m of missing) dirty.add(m);
    const clean = stmts.filter((s) => !dirty.has(s));

    const result = { total: stmts.length, alreadyPromoted: promoted.length, masterExists: masterExists.length, ambiguous: ambig.length, candidateMissing: missing.length, clean: clean.length, dirtyStmts: [...dirty], cleanStmts: clean };
    console.log(JSON.stringify({ total: result.total, alreadyPromoted: result.alreadyPromoted, masterExists: result.masterExists, ambiguous: result.ambiguous, candidateMissing: result.candidateMissing, clean: result.clean }, null, 1));
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('[dedup-probe] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
