/**
 * Agent B 소유 — READ-ONLY. **registry 미등록 실재 기능성 원료** 때문에 미생산으로 남은 후보를
 * B additive registry(`hff-b-ingredient-registry.ts`) + B resolver 로 재해석해
 * B 소유 select 가 소비할 signature 플랜을 만든다.
 *
 * 안전 계약(직전 라운드 `hff-unreg-b-plan` 계보 유지):
 *  - **B 신규 원료를 최소 1개 회수한 제품만** 담는다(그 외는 이 라운드의 대상이 아니다).
 *  - 공용 `parseSpecs` 가 이미 해석한 키는 값·단위·기준량이 완전히 일치해야 한다(불일치 → 제품 전체 제외).
 *  - B 해석 후에도 미해석 규격 라인이 남으면 성분 집합 불완전 → 제외.
 *  - 공용/B 어느 registry 에도 meta 가 없는 키가 있으면 제외.
 *
 * lane 격리: statementNo 기준 shard(stableHash%3, 기본 1).
 *
 * 실행: PROXY_PORT=5442 DB_USERNAME=o4o_api DB_PASSWORD=... DB_NAME=o4o_platform \
 *         OUTDIR=<dir> [SHARD=1] npx tsx src/scripts/hff-unreg-b-plan.ts
 */
import { DataSource } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseSpecs } from './hff-source-parse.js';
import { parseSpecsB } from './hff-spec-b-resolve.js';
import { bMeta, isBKey } from './hff-b-ingredient-registry.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const SHARD = parseInt(process.env.SHARD ?? '1', 10);
const OUTDIR = process.env.OUTDIR;
if (!OUTDIR) throw new Error('OUTDIR 필요');

interface Group { sig: string; stmtNos: string[] }

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(`SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const groups = new Map<string, Group>();
    const reject: Record<string, number> = { noBKey: 0, stillUnknown: 0, noMeta: 0, conflict: 0 };
    const unknownTop: Record<string, number> = {}; const noMetaTop: Record<string, number> = {};
    const conflicts: Array<{ stmt: string; key: string; pub: unknown; b: unknown }> = [];
    let cand = 0;
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<Record<string, string | null>> = await ds.query(
        `SELECT matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
                coalesce(raw_payload->'source'->>'BASE_STANDARD','') base, id
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      for (const r of rows) {
        const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== SHARD) continue;
        if (r.mid != null || taken.has(stmt)) continue;
        const base = String(r.base ?? '');
        const bp = parseSpecsB(base);
        const keys = [...bp.byKey.keys()].sort();
        if (!keys.some(isBKey)) { reject.noBKey++; continue; } // 이 라운드 대상 아님
        cand++;
        if (bp.unknownLabels.length > 0) { for (const u of bp.unknownLabels.slice(0, 3)) unknownTop[u.slice(0, 24)] = (unknownTop[u.slice(0, 24)] ?? 0) + 1; reject.stillUnknown++; continue; }
        const pub = parseSpecs(base);
        let conflict = false;
        for (const [k, v] of pub.byKey) {
          const bv = bp.byKey.get(k);
          if (!bv || bv.value !== v.value || bv.unit !== v.unit || bv.basisAmount !== v.basisAmount || bv.basisUnit !== v.basisUnit) {
            conflict = true; if (conflicts.length < 20) conflicts.push({ stmt, key: k, pub: v, b: bv ?? null });
          }
        }
        if (conflict) { reject.conflict++; continue; }
        const missing = keys.filter((k) => !bMeta(k));
        if (missing.length) { for (const k of missing) noMetaTop[k] = (noMetaTop[k] ?? 0) + 1; reject.noMeta++; continue; }
        const sig = keys.join('+');
        const g = groups.get(sig) ?? { sig, stmtNos: [] };
        g.stmtNos.push(stmt); groups.set(sig, g);
      }
      after = String(rows[rows.length - 1].id);
    }
    const list = [...groups.values()].sort((a, b) => b.stmtNos.length - a.stmtNos.length);
    fs.mkdirSync(path.join(OUTDIR, 'stmt'), { recursive: true });
    const plan = list.map((g, i) => {
      const slug = `ur-${String(i).padStart(4, '0')}`;
      const f = path.join(OUTDIR, 'stmt', `${slug}.json`);
      fs.writeFileSync(f, JSON.stringify(g.stmtNos), 'utf8');
      return { i, slug, sig: g.sig, size: g.stmtNos.length, stmtFile: f };
    });
    fs.writeFileSync(path.join(OUTDIR, 'plan.json'), JSON.stringify(plan, null, 1), 'utf8');
    const top = (o: Record<string, number>, n: number): Array<[string, number]> => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
    fs.writeFileSync(path.join(OUTDIR, 'plan-reject.json'), JSON.stringify({ shard: SHARD, cand, reject, unknownTop: top(unknownTop, 40), noMetaTop: top(noMetaTop, 40), conflicts }, null, 1), 'utf8');
    const covered = plan.reduce((s, p) => s + p.size, 0);
    console.log(`PLAN-UNREG-B shard=${SHARD} cand=${cand} groups=${plan.length} covered=${covered} · reject ${JSON.stringify(reject)}`);
    for (const p of plan.slice(0, 25)) console.log(`  ${String(p.size).padStart(4)}  ${p.slug}  ${p.sig}`);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
