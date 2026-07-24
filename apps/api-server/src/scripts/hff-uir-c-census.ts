/**
 * WO-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-C-V1 — 미등록 실재 원료 census (READ-ONLY, DB write 0).
 *
 * shard2 미승격·미선점 HFF 후보 전체(대괄호 유무 무관)의 BASE_STANDARD 규격 항목을 전수 열거하고,
 * (a) 비기능 규격 (b) 공용 classify (c) 공용 SF labelRe/indicatorRe (d) C 전용 NFK_LABELS
 * 중 무엇으로도 해소되지 않는 **미등록 라벨**의 빈도를 낸다.
 * 목적: «원문에 실재하는데 registry 에 없어서 생산 못 한 원료» 를 원문 근거로 확정. 제품명 추정 금지.
 *
 *   PROXY_PORT=5462 npx tsx src/scripts/hff-uir-c-census.ts --out <dir> [--shard 2]
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { normalizeSpecText, classify } from './hff-source-parse.js';
import { SF_INGREDIENTS } from './hff-sf-registry.js';
import { specLabels, isNonFunctionalLabel, NFK_LABELS } from './hff-nfk-c-registry.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out'); if (!OUTDIR) throw new Error('--out <dir> 필요');
const SHARD = parseInt(arg('shard', '2'), 10);
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5462', 10);
fs.mkdirSync(OUTDIR, { recursive: true });

const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;

/** 기존 계약(공용 + 직전 WO C 전용)으로 해소되는가 */
function resolvedKey(label: string): string | null {
  const c = classify(label); if (c) return c;
  const sf = Object.values(SF_INGREDIENTS).find((i) => i.labelRe.test(label) || (i.indicatorRe?.test(label) ?? false));
  if (sf) return sf.key;
  const nf = NFK_LABELS.find((x) => x.re.test(label));
  return nf ? nf.key : null;
}

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const hasMaster = new Set((await ds.query(`SELECT DISTINCT mfds_permit_number p FROM product_masters WHERE mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    const funnel = { scanned: 0, inShard: 0, dup: 0, promoted: 0, liquid: 0, evaluated: 0, allResolved: 0, hasUnresolved: 0 };
    const labelCount: Record<string, number> = {};
    const soleCount: Record<string, number> = {}; // 미등록 라벨이 그 제품의 유일한 미해소 라벨인 경우
    const samples: Record<string, Array<Record<string, unknown>>> = {};
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
        if (seen.has(stmt)) { funnel.dup++; continue; } seen.add(stmt);
        if (r.mid != null || hasMaster.has(stmt)) { funnel.promoted++; continue; }
        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) { funnel.liquid++; continue; }
        funnel.evaluated++;

        const labels = specLabels(normalizeSpecText(r.base || ''));
        const unresolved: string[] = [];
        const known = new Set<string>();
        for (const lb of labels) {
          if (isNonFunctionalLabel(lb)) continue;
          const k = resolvedKey(lb);
          if (k) known.add(k); else unresolved.push(lb);
        }
        const uniq = [...new Set(unresolved)];
        if (!uniq.length) { funnel.allResolved++; continue; }
        funnel.hasUnresolved++;
        for (const lb of uniq) {
          labelCount[lb] = (labelCount[lb] ?? 0) + 1;
          // 이 라벨만 미해소이고 기존 해소 키가 0 이면 = 이 라벨이 곧 그 제품의 유일 원료 후보
          if (uniq.length === 1 && known.size === 0) {
            soleCount[lb] = (soleCount[lb] ?? 0) + 1;
            (samples[lb] ??= []).length < 4 && samples[lb].push({ stmt, name: r.name.trim(), base: normalizeSpecText(r.base || '').slice(0, 300), fn: normalizeSpecText(r.fn || '').slice(0, 240), srv: normalizeSpecText(r.srv || '').slice(0, 120) });
          }
        }
      }
    }

    const top = Object.entries(labelCount).sort((a, b) => b[1] - a[1]);
    const sole = Object.entries(soleCount).sort((a, b) => b[1] - a[1]);
    fs.writeFileSync(path.join(OUTDIR, 'uir-c-labels.json'), JSON.stringify(top, null, 1));
    fs.writeFileSync(path.join(OUTDIR, 'uir-c-sole.json'), JSON.stringify(sole, null, 1));
    fs.writeFileSync(path.join(OUTDIR, 'uir-c-samples.json'), JSON.stringify(samples, null, 1));
    console.log('JSON_UIR_C_CENSUS_BEGIN');
    console.log(JSON.stringify({ shard: SHARD, funnel, distinctLabels: top.length, topSole: sole.slice(0, 60) }, null, 2));
    console.log('JSON_UIR_C_CENSUS_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
