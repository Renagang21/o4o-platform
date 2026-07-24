/**
 * Agent B 소유 — READ-ONLY 진단. `noSpec` / `UNKNOWN_SPEC_LABEL` 후보의 미해석 원인을 실측 분류한다.
 *   (a) classifyFail  : 라벨이 공용 CLS 에 없음 → 원료 미지원(기능성 매핑 불가)
 *   (b) specReFail    : 라벨은 CLS 로 분류되나 SPEC_RE 가 값/기준을 캡처 못함(LOOSE 안전망만 검출)
 *   (c) noSpecLine    : BASE_STANDARD 에 규격 라인 자체가 없음
 * DB write 0. shard = stableHash(STTEMNT_NO)%3 (기본 1).
 *
 * 실행: PROXY_PORT=5442 DB_USERNAME=o4o_api DB_PASSWORD=... DB_NAME=o4o_platform \
 *         OUT=<file> [SHARD=1] npx tsx src/scripts/hff-unknown-b-census.ts
 */
import { DataSource } from 'typeorm';
import * as fs from 'node:fs';
import { normalizeSpecText, parseSpecs, classify, NONFUNC } from './hff-source-parse.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const SHARD = parseInt(process.env.SHARD ?? '1', 10);
const OUT = process.env.OUT;
if (!OUT) throw new Error('OUT 필요');

/** 규격 라인 후보 검출 — `라벨 : ... 값단위 / 기준량단위` 형태를 넓게 잡아 라벨만 회수(값 해석은 하지 않음). */
const LINE_RE = /([가-힣A-Za-z0-9()\-·]{1,24}(?:\s[가-힣A-Za-z0-9()\-·]{1,16})?)\s*[:：]\s*(?:표시량\s*)?\(?\s*([\d][\d,.]*)\s*(mg|g|μg|mcg|IU|억|만)/g;

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(`SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const stat = { scanned: 0, inShard: 0, cand: 0, hasSpec: 0, noSpecLine: 0, unknownOnly: 0 };
    const classifyFail: Record<string, number> = {};
    const specReFail: Record<string, number> = {};
    const noSpecSample: Array<{ stmt: string; name: string; base: string }> = [];
    const specReFailSample: Record<string, string> = {};
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<Record<string, string | null>> = await ds.query(
        `SELECT matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt, coalesce(raw_payload->'source'->>'PRDUCT','') name,
                coalesce(raw_payload->'source'->>'BASE_STANDARD','') base, id
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      for (const r of rows) {
        stat.scanned++;
        const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== SHARD) continue;
        stat.inShard++;
        if (r.mid != null || taken.has(stmt)) continue;
        const base = String(r.base ?? '');
        const sp = parseSpecs(base);
        if (sp.byKey.size > 0 && sp.unknownLabels.length === 0) continue; // 이미 생산 가능(선행 라운드 대상)
        stat.cand++;
        const t = normalizeSpecText(base);
        const labels: string[] = [];
        LINE_RE.lastIndex = 0; let m: RegExpExecArray | null;
        while ((m = LINE_RE.exec(t)) !== null) { const l = m[1].trim(); if (!NONFUNC.test(l)) labels.push(l); }
        if (labels.length === 0) {
          stat.noSpecLine++;
          if (noSpecSample.length < 40) noSpecSample.push({ stmt, name: String(r.name), base: t.slice(0, 300) });
          continue;
        }
        stat.hasSpec++;
        for (const l of labels) {
          const k = classify(l);
          const norm = l.replace(/^\d+[).]\s*/, '').trim();
          if (!k) { classifyFail[norm.slice(0, 24)] = (classifyFail[norm.slice(0, 24)] ?? 0) + 1; continue; }
          if (!sp.byKey.has(k)) {
            specReFail[k] = (specReFail[k] ?? 0) + 1;
            if (!specReFailSample[k]) { const i = t.indexOf(l); specReFailSample[k] = t.slice(Math.max(0, i - 10), i + 110); }
          }
        }
      }
      after = String(rows[rows.length - 1].id);
    }
    const top = (o: Record<string, number>, n: number): Array<[string, number]> => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
    fs.writeFileSync(OUT, JSON.stringify({ shard: SHARD, stat, classifyFailTop: top(classifyFail, 60), specReFailTop: top(specReFail, 40), specReFailSample, noSpecSample }, null, 1), 'utf8');
    console.log(`CENSUS shard=${SHARD} cand=${stat.cand} hasSpecLine=${stat.hasSpec} noSpecLine=${stat.noSpecLine} → ${OUT}`);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
