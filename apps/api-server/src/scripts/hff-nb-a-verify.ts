/**
 * WO-O4O-HFF-NOBRACKET-BULK-PRODUCTION-A-V1 — rollback manifest ID 기준 독립검증(READ-ONLY, DB write 0).
 * 빌더 산출물이 아니라 **apply 가 남긴 manifest 의 master/SPD/candidate ID** 만으로 DB 현재 상태를 재조회한다.
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-nb-a-verify.ts --manifests <dir> --tagPrefix batch:nb-a-
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const DIR = arg('manifests'); const PREFIX = arg('tagPrefix', 'batch:nb-a-');
if (!DIR) throw new Error('--manifests <dir> 필요');

interface Manifest { tag: string; createdMasters: string[]; createdSpd: string[]; candIds: string[] }

async function main(): Promise<void> {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
  const mans: Manifest[] = [];
  for (const f of files) {
    const m = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Manifest;
    if (typeof m.tag === 'string' && m.tag.startsWith(PREFIX)) mans.push(m);
  }
  const masters = mans.flatMap((m) => m.createdMasters); const spds = mans.flatMap((m) => m.createdSpd); const cands = mans.flatMap((m) => m.candIds);
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: false, ssl: false });
  await ds.initialize();
  try {
    const q = <T>(sql: string, p: unknown[]): Promise<T[]> => ds.query(sql, p) as Promise<T[]>;
    const mrows = await q<{ id: string; permit: string; rt: string; tags: string[] }>(`SELECT id, mfds_permit_number permit, regulatory_type rt, tags FROM product_masters WHERE id = ANY($1)`, [masters]);
    const srows = await q<{ id: string; mid: string; lang: string | null; st: string; dt: string; src: string; ref: string | null; len: number }>(
      `SELECT id, master_id mid, language lang, status st, description_type dt, source_type src, source_ref_id::text ref, length(content) len FROM shared_product_descriptions WHERE id = ANY($1) AND deleted_at IS NULL`, [spds]);
    const crows = await q<{ id: string; mid: string | null; st: string }>(`SELECT id, matched_product_master_id mid, candidate_status st FROM product_candidates WHERE id = ANY($1)`, [cands]);
    // canonical 유일성: 본 배치 master 들에 대한 (master, STORE, lang) 중복
    const dup = await q<{ mid: string; lang: string; c: string }>(
      `SELECT master_id mid, coalesce(language,'ko') lang, count(*) c FROM shared_product_descriptions
       WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
       GROUP BY 1,2 HAVING count(*) > 1`, [masters]);
    // 기존 LIVE drift: 본 배치 master 에 붙은 SPD 중 manifest 밖의 것
    const foreign = await q<{ c: string }>(
      `SELECT count(*) c FROM shared_product_descriptions WHERE master_id = ANY($1) AND deleted_at IS NULL AND NOT (id = ANY($2))`, [masters, spds]);
    const stmtDup = await q<{ permit: string; c: string }>(`SELECT mfds_permit_number permit, count(*) c FROM product_masters WHERE mfds_permit_number = ANY($1) GROUP BY 1 HAVING count(*) > 1`,
      [mrows.map((r) => r.permit)]);
    const ko = srows.filter((r) => (r.lang ?? 'ko') === 'ko'), en = srows.filter((r) => r.lang === 'en');
    const out = {
      manifests: mans.map((m) => m.tag),
      masters: { manifest: masters.length, unique: new Set(masters).size, alive: mrows.length, regulatoryTypeOk: mrows.every((r) => r.rt === '건강기능식품'), permitUnique: stmtDup.length === 0, statementDup: stmtDup.length },
      spd: { manifest: spds.length, alive: srows.length, ko: ko.length, en: en.length, allStore: srows.every((r) => r.dt === 'STORE'), allCanonical: srows.every((r) => r.st === 'canonical'), allHffSource: srows.every((r) => r.src === 'o4o_hff_generated'), sourceRefLinked: srows.every((r) => r.ref != null), minLen: Math.min(...srows.map((r) => r.len)) },
      candidates: { manifest: cands.length, alive: crows.length, linked: crows.filter((r) => r.mid != null).length, approved: crows.filter((r) => r.st === 'approved_new_master').length },
      canonicalDup: dup.length,
      foreignSpdOnOwnMasters: Number(foreign[0]?.c ?? 0),
    };
    const pass = out.masters.manifest === out.masters.unique && out.masters.alive === out.masters.manifest && out.masters.regulatoryTypeOk && out.masters.permitUnique
      && out.spd.alive === out.spd.manifest && out.spd.ko === out.masters.manifest && out.spd.en === out.masters.manifest
      && out.spd.allStore && out.spd.allCanonical && out.spd.allHffSource && out.spd.sourceRefLinked && out.spd.minLen > 500
      && out.candidates.linked === out.candidates.manifest && out.candidates.approved === out.candidates.manifest
      && out.canonicalDup === 0 && out.foreignSpdOnOwnMasters === 0;
    console.log(JSON.stringify({ ...out, VERDICT: pass ? 'PASS' : 'FAIL' }, null, 2));
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
