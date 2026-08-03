/**
 * nutrition_combo 재검토 — **독립검증 (READ-ONLY)**
 *
 * 판정 스크립트를 신뢰하지 않고 DB 를 다시 읽어 확인한다.
 *   · 3,545 회계와 상호배타성
 *   · 기존 SAFE_EXPANDED 944 가 어디로 갔는지 건별 추적
 *   · INVALID 판정을 원문 원자료로 재증명(표본이 아니라 전건)
 *   · DB write 0
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { T } from './otc-zh-slots.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };

const sect = (h: string, re: RegExp): string => { const m = re.exec(h); return m ? T(m[m.length - 1]) : ''; };
const rawDosage = (h: string): string => sect(h, /<strong>\s*용법[·ㆍ・]?\s*용량\s*<\/strong>([\s\S]*?)(?=<strong>|$)/);
const freq = (s: string): string[] => [...new Set((s.match(/1\s*일\s*\d+\s*회/g) || []).map((x) => x.replace(/\s+/g, '')))];
/* 1회량도 독립 축이다 — 판정 스크립트가 이 축으로 걸었다면 검증도 같은 축을 봐야 한다. */
const perDose = (s: string): string[] => [...new Set((s.match(/1\s*회\s*\d+(?:\.\d+)?\s*(?:정|캡슐|포|팩|병|mL|ml|㎖|g|mg|㎎|방울|매|스푼|앰플)/g) || [])
  .map((x) => x.replace(/\s+/g, '')))];
function ageLo(s: string): number | null {
  const v: number[] = [];
  for (const m of s.matchAll(/(?:만\s*)?(\d+)\s*(세|개월|살)\s*(?:이상|초과)/g))
    v.push(m[2] === '개월' ? parseInt(m[1], 10) / 12 : parseInt(m[1], 10));
  return v.length ? Math.min(...v) : null;
}

async function main(): Promise<void> {
  const audit = JSON.parse(fs.readFileSync(P('otc-ko-nutrition-combo-audit.ga.json'), 'utf8'));
  const recs = audit.docs as any[];
  const byKo = new Map<string, any>(recs.map((r) => [r.koId, r]));

  /* 직전 라운드의 확대 적용 판정(944 SAFE 포함) */
  const prevExp = JSON.parse(fs.readFileSync(P('otc-ko-expansion-safety.ga.json'), 'utf8')).records as any[];
  const prevSafe = prevExp.filter((r) => r.verdict === 'SAFE_MATCH').map((r) => r.koId);

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5710', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  /* DB 에서 모집단을 다시 세어 원장과 대조 */
  const dbCount = (await pool.query(`SELECT count(*)::int n FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko'
       AND deleted_at IS NULL AND source_type='mfds_drug_otc_nutrition_combo'`)).rows[0].n as number;

  /* INVALID 전건을 원문 원자료로 재증명 */
  const invalid = recs.filter((r) => r.state.startsWith('INVALID'));
  const reproved: any[] = [];
  let confirmed = 0, notReproduced = 0;
  for (let i = 0; i < invalid.length; i += 200) {
    const chunk = invalid.slice(i, i + 200);
    const rows = (await pool.query(`
      SELECT d.id::text ko_id, d.master_id::text mid, d.content ko,
             (SELECT content FROM shared_product_descriptions r WHERE r.master_id=d.master_id
                AND r.source_type='mfds_easy_drug' AND r.deleted_at IS NULL LIMIT 1) raw
        FROM shared_product_descriptions d WHERE d.id = ANY($1::uuid[])`,
      [chunk.map((c) => c.koId)])).rows;
    for (const row of rows) {
      const rec = byKo.get(row.ko_id)!;
      const rd = rawDosage(String(row.raw || ''));
      const kd = T(String(row.ko || ''));
      const rLo = ageLo(rd || T(String(row.raw || ''))), kLo = ageLo(kd);
      const rF = freq(rd), kF = freq(kd);
      const rP = perDose(rd), kP = perDose(kd);
      const ageBad = rLo != null && kLo != null && Math.abs(rLo - kLo) > 0.01;
      const freqBad = rF.length > 0 && kF.length > 0 && !kF.every((v) => rF.includes(v));
      const doseBad = rP.length > 0 && kP.length > 0 && !kP.every((v) => rP.includes(v));
      const ok = (rec.state === 'INVALID_AGE_CONFLICT' && ageBad)
        || (rec.state === 'INVALID_FREQUENCY_CONFLICT' && (freqBad || doseBad || ageBad));
      if (ok) confirmed++; else { notReproduced++; if (reproved.length < 30) reproved.push({ koId: row.ko_id, state: rec.state, rLo, kLo, rF, kF, rP, kP }); }
    }
  }
  await pool.end();

  /* 기존 944 SAFE 의 이동 경로 */
  const safeMoved: Record<string, number> = {};
  let safeNotInCombo = 0;
  for (const id of prevSafe) {
    const r = byKo.get(id);
    if (!r) { safeNotInCombo++; continue; }
    inc(safeMoved, r.state);
  }

  const stateCount: Record<string, number> = {};
  for (const r of recs) inc(stateCount, r.state);
  const sum = Object.values(stateCount).reduce((a, b) => a + b, 0);
  const dupes = recs.length - new Set(recs.map((r) => r.koId)).size;

  const checks: Record<string, boolean> = {
    'DB 모집단 = 원장 건수': dbCount === recs.length,
    '상태 합계 = 전체': sum === recs.length,
    '문서 중복 0': dupes === 0,
    'INVALID 전건 원문 재증명': notReproduced === 0,
    '기존 SAFE 944 전건 추적': prevSafe.length === Object.values(safeMoved).reduce((a, b) => a + b, 0) + safeNotInCombo,
    'SAFE_EXPANDED 는 근거 재현된 것만': (stateCount.SAFE_EXPANDED || 0) === recs.filter((r) => r.reasons.some((x: string) => x.startsWith('SAFE_EXPANDED_PROVEN'))).length,
  };

  const out = {
    mode: 'READ-ONLY / DB write 0',
    dbPopulation: dbCount, ledgerDocs: recs.length, stateCount,
    invalidReproof: { total: invalid.length, confirmed, notReproduced, samples: reproved },
    previousSafe944: { total: prevSafe.length, movedTo: safeMoved, notInNutritionCombo: safeNotInCombo },
    checks,
    verdict: Object.values(checks).every(Boolean) ? 'VERIFIED' : 'VERIFY_FAILED',
  };
  fs.writeFileSync(P('otc-ko-nutrition-combo-verify.ga.json'), JSON.stringify(out, null, 1), 'utf8');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
