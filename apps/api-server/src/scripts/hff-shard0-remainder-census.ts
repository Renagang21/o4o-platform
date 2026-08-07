/** READ-ONLY — shard0(hash%3=0) 미생산·미선점 HFF 후보를 생산 파이프라인별 버킷팅. DB write 0. */
import '../env-loader.js';
import { DataSource } from 'typeorm';
import { normalizeSpecText, classify } from './hff-source-parse.js';
import { SF_INGREDIENTS } from './hff-sf-registry.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|앰플|스프레이|스포이드|농축액|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const PROB = /프로바이오틱|유산균|락토바실|비피더스/i;
const SF_RE = Object.values(SF_INGREDIENTS).map((i) => i.labelRe);
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5436', 10);

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(`SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const bucket: Record<string, number> = { probioticsSingle: 0, sfSingle: 0, nutrientSingle: 0, otherSingle: 0, multiBracket: 0, noBracket: 0 };
    const liq: Record<string, number> = { probioticsSingle: 0, sfSingle: 0, nutrientSingle: 0, otherSingle: 0, multiBracket: 0, noBracket: 0 };
    const otherLabels: Record<string, number> = {}; const sfByKey: Record<string, number> = {}; const nutByKey: Record<string, number> = {};
    let scanned = 0, shard0 = 0, unpromoted = 0, notTaken = 0;
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      // SELECT 는 keyset 페이징용 `id` 도 함께 반환한다(아래 `after` 갱신에 사용).
      const rows: Array<{ mid: string | null; stmt: string; name: string; sungsang: string; srv: string; fn: string; id: string }> = await ds.query(
        `SELECT matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt, coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, id
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      for (const r of rows) {
        scanned++; const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== 0) continue; shard0++;
        if (r.mid != null) continue; unpromoted++;
        if (taken.has(stmt)) continue; notTaken++;
        const isLiq = LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`);
        const t = normalizeSpecText(r.fn); const brackets = [...t.matchAll(/\[([^\]]{1,24})\]/g)].map((m) => m[1].trim());
        let key: string;
        if (brackets.length === 0) key = 'noBracket';
        else if (brackets.length >= 2) key = 'multiBracket';
        else { const label = brackets[0];
          if (PROB.test(label)) { key = 'probioticsSingle'; }
          else if (SF_RE.some((re) => re.test(label))) { key = 'sfSingle'; const ing = Object.values(SF_INGREDIENTS).find((i) => i.labelRe.test(label)); if (ing) sfByKey[ing.slug] = (sfByKey[ing.slug] ?? 0) + 1; }
          else if (classify(label)) { key = 'nutrientSingle'; const c = classify(label)!; nutByKey[c] = (nutByKey[c] ?? 0) + 1; }
          else { key = 'otherSingle'; otherLabels[label.slice(0, 16)] = (otherLabels[label.slice(0, 16)] ?? 0) + 1; }
        }
        bucket[key]++; if (isLiq) liq[key]++;
      }
      after = rows[rows.length - 1].id;
    }
    const otherTop = Object.entries(otherLabels).filter(([, v]) => v >= 8).sort((a, b) => b[1] - a[1]).slice(0, 25);
    console.log('JSON_CENSUS_BEGIN');
    console.log(JSON.stringify({ scanned, shard0, unpromoted, notTaken, bucket, liquidWithinBucket: liq, sfByKey, nutByKey, otherSingleTop: otherTop }, null, 2));
    console.log('JSON_CENSUS_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
