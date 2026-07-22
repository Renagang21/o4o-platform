/**
 * READ-ONLY — 단일 기능성 신규 원료 selector (DB, stmt-shard, 표시량/기능성 grounding). DB write 0.
 *   PROXY_PORT=5434 npx tsx src/scripts/hff-sf-select.ts --ingredient 바나바잎추출물 --out <dir>
 *
 * 프로바이오틱스(CFU) 계약을 **비-CFU 표시량 단일 기능성**으로 일반화. composer 복제 금지, 원료 config 파라미터화.
 * 대상: pure-single([원료] 브래킷 1종 & ing.labelRe) · 고형 · 미승격 · exclude-taken.
 * 분류: READY(섭취 PASS + 기능성 EN 전부 매핑) / REVIEW_LATER(섭취 실패·BULK) / GROUNDING_PENDING(EN 미매핑).
 * 산출: <dir>/<slug>-ready.json · <dir>/<slug>-shard-<0|1|2>.json(stmt 직접주입) · <dir>/<slug>-review-later.json
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { normalizeSpecText, classify } from './hff-source-parse.js';
import { parseServing, parseBasis, isBulkMaterial } from '../modules/content-guard/source-grounding-parser.js';
import { SF_INGREDIENTS, resolveFunctions } from './hff-sf-registry.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const ING = arg('ingredient'); const OUTDIR = arg('out');
if (!ING || !SF_INGREDIENTS[ING]) throw new Error(`--ingredient 필요: ${Object.keys(SF_INGREDIENTS).join(' / ')}`);
if (!OUTDIR) throw new Error('--out <dir> 필요');
const ing = SF_INGREDIENTS[ING];
const SHARD_COUNT = 3;
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5434', 10);
fs.mkdirSync(OUTDIR, { recursive: true });
function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    const ready: unknown[] = []; const reviewLater: Array<{ statementNo: string; productName: string; reason: string }> = [];
    const shardStmts: Record<number, string[]> = { 0: [], 1: [], 2: [] };
    const funnel = { scanned: 0, pureSingle: 0, solid: 0, unpromoted: 0, notTaken: 0, ready: 0, reviewLater: 0, pending: 0 };
    const seen = new Set<string>();

    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'ENTRPS','') maker,
           coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv,
           coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
           coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
           coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        funnel.scanned++;
        const t = normalizeSpecText(r.fn); const brackets = [...t.matchAll(/\[([^\]]{1,24})\]/g)].map((m) => m[1].trim());
        if (brackets.length !== 1) continue; const label = brackets[0];
        if (!ing.labelRe.test(label)) continue;               // 본 원료 pure-single 만
        if (classify(label)) continue;                        // 기존 registry 등재 원료면 제외(교차 귀속 방지)
        funnel.pureSingle++;
        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) continue; funnel.solid++;
        const stmt = String(r.stmt).trim(); if (!stmt || seen.has(stmt)) continue;
        if (r.mid != null) continue; funnel.unpromoted++;
        if (taken.has(stmt)) continue; funnel.notTaken++;
        seen.add(stmt);
        const sh = stableHash(stmt) % SHARD_COUNT;
        // grounding
        const srv = parseServing(r.srv); const basis = parseBasis(r.base); const bulk = isBulkMaterial(r.srv);
        const fns = resolveFunctions(ing, r.fn);
        const reasons: string[] = [];
        if (srv.kind !== 'PARSED') reasons.push(`SERVING_${srv.kind}`);
        if (bulk.bulk) reasons.push('BULK');
        if (fns.pending) reasons.push('GROUNDING_PENDING_EN');
        if (reasons.length) {
          if (fns.pending && !reasons.some((x) => x.startsWith('SERVING') || x === 'BULK')) funnel.pending++;
          reviewLater.push({ statementNo: stmt, productName: r.name.trim(), reason: reasons.join(',') });
          continue;
        }
        funnel.ready++; shardStmts[sh].push(stmt);
        ready.push({ statementNo: stmt, candidateId: r.id, shard: sh, ingredientKey: ing.key,
          productName: r.name.trim(), manufacturer: r.maker.trim(),
          functionsKo: fns.ko, functionsEn: fns.en,
          source: { mainFunction: r.fn.trim(), baseStandard: r.base.trim(), intake: r.srv.trim(), dosageForm: r.sungsang.trim(), shelfLife: r.shelf.trim(), storage: r.storage.trim(), caution: r.caution.trim() } });
      }
      after = rows[rows.length - 1].id;
    }
    funnel.reviewLater = reviewLater.length;
    fs.writeFileSync(path.join(OUTDIR, `${ing.slug}-ready.json`), JSON.stringify(ready, null, 1));
    fs.writeFileSync(path.join(OUTDIR, `${ing.slug}-review-later.json`), JSON.stringify(reviewLater, null, 1));
    for (const s of [0, 1, 2]) fs.writeFileSync(path.join(OUTDIR, `${ing.slug}-shard-${s}.json`), JSON.stringify(shardStmts[s], null, 1));
    console.log('JSON_SF_SELECT_BEGIN');
    console.log(JSON.stringify({ ingredient: ing.key, slug: ing.slug, statusHint: ing.statusHint, funnel, shardCounts: { 0: shardStmts[0].length, 1: shardStmts[1].length, 2: shardStmts[2].length }, readyTotal: ready.length }, null, 2));
    console.log('JSON_SF_SELECT_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
