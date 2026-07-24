/**
 * Agent B 소유 — READ-ONLY. noBracket shard 후보를 **공용 select 가 소비 가능한 signature 플랜**으로 변환.
 *   noBracket = MAIN_FNCTN 에 `[원료]` 라벨이 없는 후보. 원료 정체/표시량은 BASE_STANDARD 에 존재하므로
 *   공용 parseSpecs 로 원료키 집합(signature)을 뽑아 `hff-combo-select --combo <sig> --statement-nos-file` 로 넘긴다.
 *   → 공용 composer/Guard/apply 무편집 재사용. 본 스크립트는 DB write 0.
 *
 * lane 격리: statementNo 기준 shard(stableHash%3, 기본 1)만 담당. signature 별 stmtNos 파일을 shard 내로 한정해
 *            타 에이전트(shard0/2) 와 동일 signature 를 공유해도 제품이 겹치지 않는다.
 *
 * 실행: PROXY_PORT=5442 DB_USERNAME=o4o_api DB_PASSWORD=... DB_NAME=o4o_platform \
 *         OUTDIR=<dir> [SHARD=1] [MIN_GROUP=1] npx tsx src/scripts/hff-nobracket-b-plan.ts
 */
import { DataSource } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeSpecText, parseSpecs } from './hff-source-parse.js';
import { NUTRIENT_META, FUNCTIONAL_META } from './hff-nutrient-registry.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const SHARD = parseInt(process.env.SHARD ?? '1', 10);
const MIN_GROUP = parseInt(process.env.MIN_GROUP ?? '1', 10);
const OUTDIR = process.env.OUTDIR;
if (!OUTDIR) throw new Error('OUTDIR 필요');
const metaOf = (k: string): unknown => NUTRIENT_META[k] ?? FUNCTIONAL_META[k];

interface Group { sig: string; keys: string[]; stmtNos: string[] }

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(`SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const groups = new Map<string, Group>();
    const reject: Record<string, number> = { noSpec: 0, unknownLabel: 0, noMeta: 0 };
    const unknownTop: Record<string, number> = {};
    let noBracket = 0;
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<Record<string, string | null>> = await ds.query(
        `SELECT matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
                coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base, id
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      for (const r of rows) {
        const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== SHARD) continue;
        if (r.mid != null) continue;
        if (taken.has(stmt)) continue;
        // noBracket 판정 — 공용 census 와 동일 기준
        if ([...normalizeSpecText(String(r.fn ?? '')).matchAll(/\[([^\]]{1,24})\]/g)].length !== 0) continue;
        noBracket++;
        const sp = parseSpecs(String(r.base ?? ''));
        if (sp.byKey.size === 0) { reject.noSpec++; continue; }
        // 미파싱 규격 라인 존재 → 성분 집합 불완전 가능 → 제외(공용 select 도 HOLD_MULTI 처리)
        // ALLOW_UNKNOWN=1 은 실증 조사용(공용 select 가 unknown>0 을 HOLD_MULTI 로 재판정하는지 확인). 기본은 사전 제외.
        if (sp.unknownLabels.length > 0) { for (const u of sp.unknownLabels.slice(0, 3)) unknownTop[u.slice(0, 20)] = (unknownTop[u.slice(0, 20)] ?? 0) + 1; if (process.env.ALLOW_UNKNOWN !== '1') { reject.unknownLabel++; continue; } reject.unknownLabelKept = (reject.unknownLabelKept ?? 0) + 1; }
        const keys = [...sp.byKey.keys()].sort();
        if (!keys.every((k) => metaOf(k))) { reject.noMeta++; continue; }
        const sig = keys.join('+');
        const g = groups.get(sig) ?? { sig, keys, stmtNos: [] };
        g.stmtNos.push(stmt); groups.set(sig, g);
      }
      after = String(rows[rows.length - 1].id);
    }
    const list = [...groups.values()].filter((g) => g.stmtNos.length >= MIN_GROUP).sort((a, b) => b.stmtNos.length - a.stmtNos.length);
    fs.mkdirSync(path.join(OUTDIR, 'stmt'), { recursive: true });
    const plan = list.map((g, i) => {
      const slug = `nb-${String(i).padStart(4, '0')}`;
      const f = path.join(OUTDIR, 'stmt', `${slug}.json`);
      fs.writeFileSync(f, JSON.stringify(g.stmtNos), 'utf8');
      return { i, slug, sig: g.sig, size: g.stmtNos.length, stmtFile: f };
    });
    fs.writeFileSync(path.join(OUTDIR, 'plan.json'), JSON.stringify(plan, null, 1), 'utf8');
    fs.writeFileSync(path.join(OUTDIR, 'plan-reject.json'), JSON.stringify({ shard: SHARD, noBracket, reject, unknownTop: Object.entries(unknownTop).sort((a, b) => b[1] - a[1]).slice(0, 30) }, null, 1), 'utf8');
    const covered = plan.reduce((s, p) => s + p.size, 0);
    console.log(`PLAN shard=${SHARD} noBracket=${noBracket} groups=${plan.length} covered=${covered} · reject ${JSON.stringify(reject)}`);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
