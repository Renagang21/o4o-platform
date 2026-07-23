/**
 * READ-ONLY — C 도메인(눈·인지·혈행·항산화) 미등록 pure-single 라벨 discovery. DB write 0.
 *   PROXY_PORT=5456 npx tsx src/scripts/hff-sf-c-domain-discover.ts [limit]
 * pure-single([원료]브래킷 1개, cap 무관) & fresh(미승격+미-taken) 후보 중, 기능성 문구가 C 도메인
 * (눈/인지/기억/혈행/혈중/항산화/황반)이며 라벨이 registry(SF_INGREDIENTS labelRe)에 미등재인 것을 라벨별 집계.
 */
import '../env-loader.js';
import { DataSource } from 'typeorm';
import { normalizeSpecText, classify } from './hff-source-parse.js';
import { SF_INGREDIENTS } from './hff-sf-registry.js';

const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5456', 10);
const TOP = parseInt(process.argv[2] ?? '40', 10);
const DOMAIN_RE = /눈|안구|망막|황반|시력|인지|기억|집중|혈행|혈중|콜레스테롤|중성지질|혈압|항산화|유해산소|피부/;
const LABEL_RES = Object.values(SF_INGREDIENTS).map((i) => i.labelRe);

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const labelHist: Record<string, { fresh: number; sample: string; fn: string }> = {};
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; fn: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 4000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        const t = normalizeSpecText(r.fn);
        const brackets = [...t.matchAll(/\[([^\]]+?)\]/g)].map((m) => m[1].trim()).filter((b) => b.length >= 2);
        if (brackets.length !== 1) continue;
        const label = brackets[0];
        if (!DOMAIN_RE.test(t)) continue;                              // C 도메인 기능성만
        if (LABEL_RES.some((re) => re.test(label))) continue;          // 이미 registry 소유
        if (classify(label)) continue;                                 // 기존 combo/nutrient 등재
        const stmt = String(r.stmt).trim();
        const fresh = r.mid == null && !taken.has(stmt);
        if (!fresh) continue;
        const key = label.replace(/\(.*$/, '').trim();                 // 지표/인정번호 괄호 앞 원료명
        if (!labelHist[key]) labelHist[key] = { fresh: 0, sample: r.name.trim(), fn: r.fn.trim().slice(0, 120) };
        labelHist[key].fresh++;
      }
      after = rows[rows.length - 1].id;
    }
    const ranked = Object.entries(labelHist).sort((a, b) => b[1].fresh - a[1].fresh).slice(0, TOP);
    console.log('JSON_DISCOVER_BEGIN');
    console.log(JSON.stringify(ranked.map(([label, v]) => ({ label, fresh: v.fresh, sample: v.sample, fn: v.fn })), null, 1));
    console.log('JSON_DISCOVER_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
