/**
 * WO-O4O-HFF-NO-FUNCTIONAL-KEY-BULK-PRODUCTION-C-V1 — NO_FUNCTIONAL_KEY 원인 census (READ-ONLY, DB write 0).
 *
 * hff-nb-c-build 의 게이트를 NO_FUNCTIONAL_KEY 지점까지 재현하고, 해당 제품의 BASE_STANDARD 를
 * **규격 항목 단위로 완전 열거**하여 라벨 빈도를 낸다.
 * 목적: «공식 원문에 기능성 원료가 명확히 선언되어 있는데 공용 파서 계약(값/기준량 비율형)상 키가
 *       안 잡히는» 라벨을 원문 근거로 확정 → C 전용 additive key mapping 후보. 제품명 추정 금지.
 *
 *   PROXY_PORT=5462 npx tsx src/scripts/hff-nfk-c-census.ts --out <dir> [--shard 2]
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { parseSpecs, normalizeSpecText, classify } from './hff-source-parse.js';
import { SF_INGREDIENTS } from './hff-sf-registry.js';
import { specLabels, isNonFunctionalLabel } from './hff-nfk-c-registry.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out'); if (!OUTDIR) throw new Error('--out <dir> 필요');
const SHARD = parseInt(arg('shard', '2'), 10);
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5462', 10);
fs.mkdirSync(OUTDIR, { recursive: true });

const BRACKET = /\[[^\]]{1,24}\]/;
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const hasMaster = new Set((await ds.query(`SELECT DISTINCT mfds_permit_number p FROM product_masters WHERE mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    const funnel = { scanned: 0, inShard: 0, noBracket: 0, skip: 0, liquid: 0, nfk: 0, allNonFunc: 0 };
    const labelCount: Record<string, number> = {};
    const samples: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();

    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; sungsang: string; srv: string; fn: string; base: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
           coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn,
           coalesce(raw_payload->'source'->>'BASE_STANDARD','') base
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1
         ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      after = rows[rows.length - 1].id;

      for (const r of rows) {
        funnel.scanned++;
        const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== SHARD) continue; funnel.inShard++;
        const mf = r.fn || ''; if (BRACKET.test(mf)) continue; funnel.noBracket++;
        if (seen.has(stmt)) continue; seen.add(stmt);
        if (r.mid != null || hasMaster.has(stmt)) { funnel.skip++; continue; }
        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) { funnel.liquid++; continue; }

        const base = r.base || '';
        const sp = parseSpecs(base);
        const keys = new Set<string>(sp.byKey.keys());
        const unresolved: string[] = [];
        for (const lb of sp.unknownLabels) {
          const sf = Object.values(SF_INGREDIENTS).find((i) => i.labelRe.test(lb) || (i.indicatorRe?.test(lb) ?? false));
          if (sf) keys.add(sf.key); else unresolved.push(lb);
        }
        if (unresolved.length) continue;
        if (keys.size !== 0) continue;
        funnel.nfk++;

        // 규격 항목 완전 열거 → 비기능(성상/중금속/미생물 등)·기존 classify 해소분 제외한 잔여 라벨 집계
        const labels = specLabels(normalizeSpecText(base)).filter((lb) => !isNonFunctionalLabel(lb) && !classify(lb));
        if (!labels.length) funnel.allNonFunc++;
        for (const lb of [...new Set(labels)]) labelCount[lb] = (labelCount[lb] ?? 0) + 1;
        if (samples.length < 400) samples.push({ stmt, name: r.name.trim(), labels: [...new Set(labels)].slice(0, 8), base: normalizeSpecText(base).slice(0, 320), fn: normalizeSpecText(mf).slice(0, 260) });
      }
    }

    const top = Object.entries(labelCount).sort((a, b) => b[1] - a[1]);
    fs.writeFileSync(path.join(OUTDIR, 'nfk-c-labels.json'), JSON.stringify(top, null, 1));
    fs.writeFileSync(path.join(OUTDIR, 'nfk-c-samples.json'), JSON.stringify(samples, null, 1));
    console.log('JSON_NFK_C_BEGIN');
    console.log(JSON.stringify({ shard: SHARD, funnel, distinctLabels: top.length, top: top.slice(0, 70) }, null, 2));
    console.log('JSON_NFK_C_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
