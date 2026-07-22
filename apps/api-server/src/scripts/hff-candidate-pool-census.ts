/**
 * READ-ONLY — HFF 신규 대량 후보 풀 census. DB write 0.
 *   PROXY_PORT=5433 npx tsx src/scripts/hff-candidate-pool-census.ts --out <json>
 *
 * 목적(10~15h 작업 후보 우선순위 산정):
 *  - 우선 원료군(홍삼·식이섬유계·알로에·유산균)별 raw 수 / 이미 생산(hff ko canonical) / 액상(파이프라인 미지원) / 잔여
 *  - registry 준비 여부(CLS 등재) + 신규 KO/EN 기능성 필요 여부
 *  - MAIN_FNCTN `[원료]` 라벨 히스토그램 중 **미등재 다빈도 원료** 발굴(기타 축)
 *  - realistic producible = 잔여 고형(액상 제외) 근사
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';
import { classify, normalizeSpecText } from './hff-source-parse.js';

const arg = (n: string): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : ''; };
const OUT = arg('out') || 'census.json';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);

// 우선 원료군(대부분 registry 미등재) — 키워드 매칭
const GROUPS: Array<{ key: string; re: RegExp; registered: boolean }> = [
  { key: '홍삼', re: /홍삼/, registered: false },
  { key: '식이섬유계', re: /식이섬유|프락토올리고당|난소화성말토덱스트린|차전자|귀리|이눌린|폴리덱스트로스|구아검/, registered: true }, // 식이섬유는 CLS 有
  { key: '알로에', re: /알로에/, registered: false },
  { key: '유산균', re: /유산균|프로바이오틱|락토바실|비피더스|Lactobacillus|Bifido|엔테로코쿠스|스트렙토코쿠스/i, registered: false },
];
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    // 이미 생산된 master(hff ko STORE canonical) — 후보의 matched_master 로 produced 판정
    const producedRows: Array<{ id: string }> = await ds.query(
      `SELECT DISTINCT master_id id FROM shared_product_descriptions
       WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND language='ko' AND source_type='o4o_hff_generated'`);
    const produced = new Set(producedRows.map((r) => r.id));

    const g: Record<string, { raw: number; producedMatched: number; liquid: number; solidAvail: number; pureSingle: number }> = {};
    for (const gr of GROUPS) g[gr.key] = { raw: 0, producedMatched: 0, liquid: 0, solidAvail: 0, pureSingle: 0 };
    const unregLabel: Record<string, number> = {};   // 미등재 [원료] 라벨 히스토그램
    let scanned = 0;

    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; base: string; name: string; sungsang: string; srv: string; fn: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid,
           coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
           coalesce(raw_payload->'source'->>'PRDUCT','') name,
           coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
           coalesce(raw_payload->'source'->>'SRV_USE','') srv,
           coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn
         FROM product_candidates
         WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1
         ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        scanned++;
        const hay = `${r.base} ${r.name} ${r.sungsang}`;
        const isLiquid = LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`);
        const isProduced = r.mid != null && produced.has(r.mid);
        for (const gr of GROUPS) {
          if (!gr.re.test(hay)) continue;
          const s = g[gr.key]; s.raw++;
          if (isProduced) s.producedMatched++;
          if (isLiquid) s.liquid++;
          if (!isProduced && !isLiquid) s.solidAvail++;
        }
        // 미등재 [원료] 라벨 히스토그램
        const t = normalizeSpecText(r.fn);
        for (const m of t.matchAll(/\[([^\]]{1,24})\]/g)) {
          const label = m[1].trim();
          if (classify(label)) continue;                       // 이미 등재 → skip
          if (/추출물|분말|건조물|농축|혼합|복합|프락토|말토덱스트린/.test(label) === false && label.length < 2) continue;
          unregLabel[label] = (unregLabel[label] ?? 0) + 1;
        }
      }
      after = rows[rows.length - 1].id;
    }
    const topUnreg = Object.entries(unregLabel).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([label, n]) => ({ label, n }));
    fs.writeFileSync(OUT, JSON.stringify({ scanned, groups: g, topUnregisteredFnLabels: topUnreg }, null, 1));
    console.log('JSON_CENSUS_BEGIN');
    console.log(JSON.stringify({ scanned, producedMasters: produced.size, groups: g, topUnregisteredFnLabels: topUnreg.slice(0, 25) }, null, 2));
    console.log('JSON_CENSUS_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
