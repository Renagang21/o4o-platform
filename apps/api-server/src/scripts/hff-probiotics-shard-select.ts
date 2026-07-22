/**
 * READ-ONLY — 프로바이오틱스 고형 pure-single, stmt-shard 대상 선정 + grounding 파싱 품질. DB write 0.
 *   PROXY_PORT=5433 npx tsx src/scripts/hff-probiotics-shard-select.ts --shard 1 --shard-count 3 --out <json>
 *
 * 계약(3에이전트 공통):
 *   - stmt 정규화 = String(STTEMNT_NO).trim(), 빈 stmt 제외
 *   - shard = FNV-1a(normStmt) % shard-count == --shard (byte-identical FNV, hff-combo-select 와 동일)
 * 대상 필터: pure-single([원료] 브래킷 정확히 1종 & 프로바이오틱스) · 고형(액상 제외) · 미승격(matched NULL)
 *            · permit master canonical STORE SPD 부재(exclude-taken)
 * grounding: parseCfu/parseServing/parseBasis → 완전(READY) / 불완전(REVIEW_LATER)
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';
import { normalizeSpecText, classify } from './hff-source-parse.js';
import { parseCfu, parseServing, parseBasis, isBulkMaterial } from '../modules/content-guard/source-grounding-parser.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const SHARD = parseInt(arg('shard', '1'), 10);
const SHARD_COUNT = parseInt(arg('shard-count', '3'), 10);
const OUT = arg('out') || 'probiotics-shard.json';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const PROB = /프로바이오틱|유산균|락토바실|비피더스/i;

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    // exclude-taken: canonical STORE SPD 있는 permit
    const takenRows: Array<{ p: string }> = await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m
       JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated'
         AND m.mfds_permit_number IS NOT NULL`);
    const takenPermit = new Set(takenRows.map((r) => r.p));

    const shardHist: Record<number, number> = {};
    const ready: unknown[] = []; const reviewLater: Array<{ statementNo: string; productName: string; reason: string }> = [];
    let scanned = 0, pureSingleProb = 0, solid = 0, myShard = 0, unpromoted = 0, notTaken = 0, emptyStmt = 0;
    const seen = new Set<string>();

    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid,
           coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt, coalesce(raw_payload->'source'->>'PRDUCT','') name,
           coalesce(raw_payload->'source'->>'ENTRPS','') maker, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
           coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn,
           coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
           coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
           coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        scanned++;
        const t = normalizeSpecText(r.fn); const brackets = [...t.matchAll(/\[([^\]]{1,24})\]/g)].map((m) => m[1].trim());
        if (brackets.length !== 1) continue; const label = brackets[0];
        if (classify(label) || !PROB.test(label)) continue;       // pure-single probiotics 만
        pureSingleProb++;
        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) continue; solid++;
        // stmt 정규화 + shard
        const stmt = String(r.stmt).trim(); if (!stmt) { emptyStmt++; continue; }
        const sh = stableHash(stmt) % SHARD_COUNT; shardHist[sh] = (shardHist[sh] ?? 0) + 1;
        if (sh !== SHARD) continue; myShard++;
        if (r.mid != null) continue; unpromoted++;                 // 미승격만
        if (takenPermit.has(stmt)) continue; notTaken++;           // exclude-taken
        if (seen.has(stmt)) continue; seen.add(stmt);
        // grounding 파싱
        const cfu = parseCfu(r.base); const basis = parseBasis(r.base); const serving = parseServing(r.srv); const bulk = isBulkMaterial(r.srv);
        const reasons: string[] = [];
        if (cfu.kind !== 'PARSED') reasons.push(`CFU_${cfu.kind}`);
        if (serving.kind !== 'PARSED') reasons.push(`SERVING_${serving.kind}`);
        if (basis.kind !== 'PARSED') reasons.push(`BASIS_${basis.kind}`);
        if (bulk.bulk) reasons.push('BULK');
        const rec = { statementNo: stmt, candidateId: r.id, productName: r.name.trim(), manufacturer: r.maker.trim(),
          source: { mainFunction: r.fn.trim(), baseStandard: r.base.trim(), intake: r.srv.trim(), dosageForm: r.sungsang.trim(), shelfLife: r.shelf.trim(), storage: r.storage.trim(), caution: r.caution.trim() },
          parsed: { cfu: cfu.kind === 'PARSED' ? cfu.value : null, basis: basis.kind === 'PARSED' ? basis.value : null, serving: serving.kind === 'PARSED' ? serving.value : null } };
        if (reasons.length) reviewLater.push({ statementNo: stmt, productName: r.name.trim(), reason: reasons.join(',') });
        else ready.push(rec);
      }
      after = rows[rows.length - 1].id;
    }
    fs.writeFileSync(OUT, JSON.stringify(ready, null, 1));
    fs.writeFileSync(OUT.replace(/\.json$/, '.review-later.json'), JSON.stringify(reviewLater, null, 1));
    console.log('JSON_SELECT_BEGIN');
    console.log(JSON.stringify({ shard: SHARD, shardCount: SHARD_COUNT, funnel: { scanned, pureSingleProb, solid, emptyStmtExcluded: emptyStmt, myShard, unpromoted, notTaken }, shardHistogram: shardHist, READY: ready.length, REVIEW_LATER: reviewLater.length, reviewReasonSample: reviewLater.slice(0, 8) }, null, 2));
    console.log('JSON_SELECT_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
