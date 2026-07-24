/**
 * Agent B 소유 — READ-ONLY 계측. 미생산·미선점 shard 후보 중
 * **규격 라인은 완전히 구조화되어 있으나 registry 에 없는 실재 원료** 를 라벨별로 센서스한다.
 *
 * 목적: "원료가 없어서 미생산" 인 후보의 실제 규모·라벨 형태·기능성 원문 유무를 확인해
 * B 전용 additive mapping 대상을 근거 기반으로 고른다. 원료명·표시량을 추정하지 않는다.
 *
 * 실행: PROXY_PORT=5442 DB_USERNAME=o4o_api DB_PASSWORD=... DB_NAME=o4o_platform \
 *         OUT=<file.json> [SHARD=1] npx tsx src/scripts/hff-unreg-b-census.ts
 */
import { DataSource } from 'typeorm';
import * as fs from 'node:fs';
import { NONFUNC, classify, normalizeSpecText } from './hff-source-parse.js';
import { NUTRIENT_META, FUNCTIONAL_META } from './hff-nutrient-registry.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const SHARD = parseInt(process.env.SHARD ?? '1', 10);
const OUT = process.env.OUT; if (!OUT) throw new Error('OUT 필요');
const known = (k: string): boolean => !!(NUTRIENT_META[k] ?? FUNCTIONAL_META[k]);

// 라벨은 괄호 단위수식 꼬리(`감마-오리자놀 (mg/g)`)까지 포함해 넓게 잡는다.
const LABEL = '([가-힣A-Za-z0-9()\\-·,\\s]{1,40}?)';
const HEAD = '\\s*[:：]\\s*(?:표시량\\s*)?\\(?\\s*';
const VALUE = '([\\d][\\d,.]*)\\s*(mg|g|μg|mcg|IU|%|％)\\s*(?:RAE|RE|α-?TE|NE|DFE)?\\s*';
const BASIS = '\\/\\s*([\\d][\\d,.]*)\\s*(mg|g|mL|ml|L|㎖)\\s*\\)?';
const CENSUS_RE = new RegExp(LABEL + HEAD + VALUE + BASIS, 'gi');

interface Agg { label: string; products: number; soleUnknown: number; withFn: number; units: Record<string, number>; basisUnits: Record<string, number>; samples: string[] }

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(`SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const agg = new Map<string, Agg>();
    let cand = 0, withUnreg = 0;
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<Record<string, string | null>> = await ds.query(
        `SELECT matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
                coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
                coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, id
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      for (const r of rows) {
        const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== SHARD) continue;
        if (r.mid != null || taken.has(stmt)) continue;
        cand++;
        const b = normalizeSpecText(String(r.base ?? ''));
        const hasFn = String(r.fn ?? '').trim().length > 0;
        const unreg: Array<{ label: string; unit: string; basisUnit: string }> = [];
        let knownKeys = 0;
        CENSUS_RE.lastIndex = 0; let m: RegExpExecArray | null;
        while ((m = CENSUS_RE.exec(b)) !== null) {
          const label = m[1].replace(/^[\s,·)]+/, '').trim();
          if (!label || NONFUNC.test(label)) continue;
          const k = classify(label);
          if (k && known(k)) { knownKeys++; continue; }
          if (k) continue; // classify 되지만 meta 없음 — 별도 사안
          unreg.push({ label, unit: m[3], basisUnit: m[5] });
        }
        if (!unreg.length) continue;
        withUnreg++;
        const uniq = [...new Set(unreg.map((u) => u.label))];
        for (const u of unreg) {
          const a = agg.get(u.label) ?? { label: u.label, products: 0, soleUnknown: 0, withFn: 0, units: {}, basisUnits: {}, samples: [] };
          a.products++;
          if (uniq.length === 1) a.soleUnknown++;
          if (hasFn) a.withFn++;
          a.units[u.unit] = (a.units[u.unit] ?? 0) + 1;
          a.basisUnits[u.basisUnit] = (a.basisUnits[u.basisUnit] ?? 0) + 1;
          if (a.samples.length < 6) a.samples.push(stmt);
          agg.set(u.label, a);
        }
      }
      after = String(rows[rows.length - 1].id);
    }
    const list = [...agg.values()].sort((a, b) => b.products - a.products);
    fs.writeFileSync(OUT, JSON.stringify({ shard: SHARD, cand, withUnreg, labels: list }, null, 1), 'utf8');
    console.log(`CENSUS-UNREG shard=${SHARD} cand=${cand} withUnreg=${withUnreg} labels=${list.length}`);
    for (const a of list.slice(0, 40)) console.log(`  ${a.products}\t(sole ${a.soleUnknown}, fn ${a.withFn})\t${a.label}\t${JSON.stringify(a.units)}/${JSON.stringify(a.basisUnits)}`);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
