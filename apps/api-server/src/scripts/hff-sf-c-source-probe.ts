/**
 * READ-ONLY — C 도메인 원료 후보 MAIN_FNCTN 원문 전수 조사(EN 정본·복합판별 근거). DB write 0.
 *   PROXY_PORT=5456 npx tsx src/scripts/hff-sf-c-source-probe.ts <라벨정규식> [limit]
 * 브래킷 라벨·기능성 문장·섭취·성상을 출력하고, 브래킷 개수(cap 무관 전량)로 pure-single/combo 판정 힌트를 준다.
 */
import '../env-loader.js';
import { DataSource } from 'typeorm';
import { normalizeSpecText } from './hff-source-parse.js';

const LABEL_RE = new RegExp(process.argv[2] ?? '포스파티딜세린', 'i');
const LIMIT = parseInt(process.argv[3] ?? '80', 10);
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5456', 10);

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; srv: string; fn: string; sungsang: string }> = await ds.query(
      `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt, coalesce(raw_payload->'source'->>'PRDUCT','') name,
         coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND raw_payload->'source'->>'MAIN_FNCTN' ~ $1
       ORDER BY id ASC`, [LABEL_RE.source]);
    // 기능성 문장 히스토그램(브래킷 제거 후 구분자 분해)
    const fnHist: Record<string, number> = {};
    const bracketHist: Record<number, number> = {};
    let taken_c = 0, promoted_c = 0, fresh = 0;
    const samples: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      const stmt = String(r.stmt).trim();
      const t = normalizeSpecText(r.fn);
      const brackets = [...t.matchAll(/\[([^\]]+?)\]/g)].map((m) => m[1].trim()); // cap 무관 전량
      bracketHist[brackets.length] = (bracketHist[brackets.length] ?? 0) + 1;
      // 기능성 문장 분해(브래킷 제거)
      const body = t.replace(/\[[^\]]*\]/g, ' ');
      for (const seg of body.split(/[①②③④⑤⑥⑦⑧⑨⑩]|(?:^|\s)\(?\d+[).]/)) {
        const s = seg.trim().replace(/^[-•*\s:：·,，]+/, '').replace(/[.。\s]+$/, '').trim();
        if (s.length >= 6 && /도움|개선|유지|억제|완화|증진|보호|보습|저하/.test(s)) fnHist[s] = (fnHist[s] ?? 0) + 1;
      }
      const isPromoted = r.mid != null; const isTaken = taken.has(stmt);
      if (isPromoted) promoted_c++; if (isTaken) taken_c++;
      if (!isPromoted && !isTaken) fresh++;
      if (samples.length < 6) samples.push({ stmt, name: r.name.trim(), brackets, fn: r.fn.trim().slice(0, 300), srv: r.srv.trim().slice(0, 80) });
    }
    const fnRanked = Object.entries(fnHist).sort((a, b) => b[1] - a[1]).slice(0, 25);
    console.log('JSON_PROBE_BEGIN');
    console.log(JSON.stringify({ labelRe: LABEL_RE.source, total: rows.length, promoted: promoted_c, taken: taken_c, freshUnpromoted: fresh, bracketCountHist: bracketHist, functionHistogram: fnRanked, samples }, null, 2));
    console.log('JSON_PROBE_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
