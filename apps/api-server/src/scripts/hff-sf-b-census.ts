/**
 * READ-ONLY — Agent B 소유 basis REVIEW census. DB write 0.
 *   PROXY_PORT=5442 DBU=o4o_api DBP=... DBN=o4o_platform npx tsx src/scripts/hff-sf-b-census.ts --out <dir>
 *
 * WO-O4O-HFF-INDEPENDENT-BASIS-UNLOCK-B-V1 B-01. product_candidates 를 단일 스캔하며 B_INGREDIENTS 의
 * pure-single 후보를 ready / review-reason(SERVING_*, BULK, GROUNDING_PENDING_EN)별로 집계한다.
 * hff-sf-b-select.ts 와 **동일한 게이트 로직**을 사용(교차검증). review 후보의 실제 SRV_USE/BASE_STANDARD/MAIN_FNCTN
 * 표본을 남겨 "왜 막혔는가"(지표성분 basis 인가, 단순 파서 결손인가, 진짜 벌크인가)를 사람이 판별할 수 있게 한다.
 * env-loader 미import(로컬 표준 우회) — DBU/DBP/DBN 커스텀 env 직접 사용.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { normalizeSpecText, classify } from './hff-source-parse.js';
import { parseServing, parseBasis, isBulkMaterial } from '../modules/content-guard/source-grounding-parser.js';
import { B_INGREDIENTS, resolveFunctionsB } from './hff-sf-b-registry.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out') || '.';
fs.mkdirSync(OUTDIR, { recursive: true });
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;

type Tally = { ready: number; taken: number; liquid: number; promoted: number; review: number;
  reasons: Record<string, number>; samples: Array<{ stmt: string; name: string; reason: string; srv: string; base: string; fn: string }> };

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT,
    username: process.env.DBU, password: process.env.DBP, database: process.env.DBN ?? 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    const keys = Object.keys(B_INGREDIENTS);
    const tally: Record<string, Tally> = {};
    for (const k of keys) tally[k] = { ready: 0, taken: 0, liquid: 0, promoted: 0, review: 0, reasons: {}, samples: [] };
    const seen: Record<string, Set<string>> = {}; for (const k of keys) seen[k] = new Set();

    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; sungsang: string; srv: string; fn: string; base: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
           coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn,
           coalesce(raw_payload->'source'->>'BASE_STANDARD','') base
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        const t = normalizeSpecText(r.fn); const brackets = [...t.matchAll(/\[([^\]]{1,24})\]/g)].map((m) => m[1].trim());
        if (brackets.length !== 1) continue; const label = brackets[0];
        for (const k of keys) {
          const ing = B_INGREDIENTS[k];
          if (!ing.labelRe.test(label)) continue;
          if (classify(label) && !ing.allowClassified) continue;
          const stmt = String(r.stmt).trim(); if (!stmt || seen[k].has(stmt)) continue; seen[k].add(stmt);
          const T = tally[k];
          if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) { T.liquid++; continue; }
          if (r.mid != null) { T.promoted++; continue; }
          if (taken.has(stmt)) { T.taken++; continue; }
          const srv = parseServing(r.srv); const bulk = isBulkMaterial(r.srv);
          const fns = resolveFunctionsB(ing, r.fn);
          const reasons: string[] = [];
          if (srv.kind !== 'PARSED') reasons.push(`SERVING_${srv.kind}`);
          if (bulk.bulk) reasons.push('BULK');
          if (fns.pending) reasons.push('GROUNDING_PENDING_EN');
          if (!reasons.length) { T.ready++; continue; }
          T.review++;
          const rk = reasons.join(',');
          T.reasons[rk] = (T.reasons[rk] ?? 0) + 1;
          if (T.samples.length < 6) T.samples.push({ stmt, name: r.name.trim(), reason: rk, srv: r.srv.trim().slice(0, 160), base: r.base.trim().slice(0, 100), fn: r.fn.trim().slice(0, 120) });
          break; // 한 후보는 한 원료로만 집계(첫 매칭)
        }
      }
      after = rows[rows.length - 1].id;
    }
    fs.writeFileSync(path.join(OUTDIR, 'b-census.json'), JSON.stringify(tally, null, 1));
    const summary = keys.map((k) => ({ ing: k, ready: tally[k].ready, review: tally[k].review, taken: tally[k].taken, liquid: tally[k].liquid, promoted: tally[k].promoted, reasons: tally[k].reasons }))
      .filter((x) => x.ready + x.review + x.taken + x.liquid + x.promoted > 0);
    console.log('JSON_CENSUS_BEGIN');
    console.log(JSON.stringify(summary, null, 1));
    console.log('JSON_CENSUS_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
