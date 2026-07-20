/**
 * READ-ONLY — single-lutein RETIRE+REPLACE 파일럿 대상 31건 기존 단일 canonical 링크 조사. DB write 0.
 *   PROXY_PORT=5433 npx tsx src/scripts/hff-lut-correction-probe.ts --queue <lut31.json>
 * 각 stmt: master(mfds_permit_number) 1 · STORE canonical ko/en 1/1 · source_ref_id · candidate matched.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';

const arg = (n: string): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : ''; };
const QUEUE = arg('queue'); if (!QUEUE) throw new Error('--queue <lut31.json> 필요');
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);

async function main(): Promise<void> {
  const rows = JSON.parse(fs.readFileSync(QUEUE, 'utf8')) as Array<{ statementNo: string; verifiedFullSet: string[]; productName: string }>;
  const stmts = rows.map((r) => String(r.statementNo));
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 60000 } });
  await ds.initialize();
  try {
    // master: mfds_permit_number = stmt
    const masters: Array<{ permit: string; id: string; tags: string[]; name: string }> = await ds.query(
      `SELECT mfds_permit_number AS permit, id, tags, name FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]);
    const byPermit = new Map<string, typeof masters>();
    for (const m of masters) { const a = byPermit.get(m.permit) ?? []; a.push(m); byPermit.set(m.permit, a); }
    const masterIds = masters.map((m) => m.id);
    // STORE canonical SPD (active) per master, lang
    const spd: Array<{ master_id: string; language: string; id: string; source_ref_id: string | null; source_type: string; len: number }> = masterIds.length ? await ds.query(
      `SELECT master_id, language, id, source_ref_id, source_type, length(content) AS len
       FROM shared_product_descriptions
       WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [masterIds]) : [];
    const spdByMaster = new Map<string, typeof spd>();
    for (const s of spd) { const a = spdByMaster.get(s.master_id) ?? []; a.push(s); spdByMaster.set(s.master_id, a); }
    // candidate by stmt
    const cands: Array<{ stmt: string; id: string; status: string; matched: string | null }> = await ds.query(
      `SELECT raw_payload->'source'->>'STTEMNT_NO' AS stmt, id, candidate_status AS status, matched_product_master_id AS matched
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND raw_payload->'source'->>'STTEMNT_NO' = ANY($1)`, [stmts]);
    const candByStmt = new Map<string, typeof cands>();
    for (const c of cands) { const a = candByStmt.get(c.stmt) ?? []; a.push(c); candByStmt.set(c.stmt, a); }

    let ok = 0; const problems: string[] = []; const tagset: Record<string, number> = {};
    const detail: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      const stmt = String(r.statementNo);
      const ms = byPermit.get(stmt) ?? [];
      const issues: string[] = [];
      if (ms.length !== 1) issues.push(`master ${ms.length}`);
      const m = ms[0];
      const tags = m ? (Array.isArray(m.tags) ? m.tags : []) : [];
      for (const t of tags) if (t.startsWith('batch:')) tagset[t] = (tagset[t] ?? 0) + 1;
      const ss = m ? (spdByMaster.get(m.id) ?? []) : [];
      const ko = ss.filter((s) => s.language === 'ko'); const en = ss.filter((s) => s.language === 'en');
      if (ko.length !== 1) issues.push(`ko-canon ${ko.length}`);
      if (en.length !== 1) issues.push(`en-canon ${en.length}`);
      const cs = candByStmt.get(stmt) ?? [];
      if (cs.length !== 1) issues.push(`cand ${cs.length}`);
      const cand = cs[0];
      // source_ref_id 일관성: SPD.source_ref_id === candidate.id
      const refOk = m && cand && ss.length > 0 && ss.every((s) => s.source_ref_id === cand.id);
      if (ss.length > 0 && !refOk) issues.push('sourceRef≠cand');
      if (cand && cand.matched !== (m?.id ?? null)) issues.push('cand.matched≠master');
      if (issues.length) problems.push(`${stmt}: ${issues.join(',')}`); else ok++;
      detail.push({ stmt, group: [...r.verifiedFullSet].sort().join('+'), master: m?.id ?? null, tags: tags.filter((t) => t.startsWith('batch:')), koCanon: ko.length, enCanon: en.length, cand: cand?.id ?? null, candStatus: cand?.status ?? null, srcRef: ss[0]?.source_ref_id ?? null, srcType: ss[0]?.source_type ?? null });
    }
    console.log('JSON_PROBE_BEGIN');
    console.log(JSON.stringify({ target: rows.length, ok, problemCount: problems.length, problems, batchTags: tagset, sample: detail.slice(0, 3), allOk: problems.length === 0 && ok === rows.length }, null, 2));
    console.log('JSON_PROBE_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
