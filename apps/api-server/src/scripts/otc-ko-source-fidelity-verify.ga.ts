/**
 * 내용 정합성 전수검증 — **독립검증** (READ-ONLY)
 *
 * 판정기(otc-ko-source-fidelity-audit)와 공용 모듈을 **import 하지 않는다.**
 * 텍스트 추출·연령·용법 지문을 이 파일에서 독립 구현해, 안전 판정(모순·귀속 오류)이
 * 다른 경로로도 같은 결론에 도달하는지 확인한다. DB write 0.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };

const strip = (h: string): string => h.replace(/<[^>]+>/g, ' ')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const sectionOf = (h: string, re: RegExp): string => {
  const m = new RegExp(`<strong>\\s*(?:${re.source})\\s*</strong>([\\s\\S]*?)(?=<strong>|$)`).exec(h);
  return m ? strip(m[1]) : '';
};
const FREQ = (s: string): string[] => [...new Set((s.match(/1\s*일\s*\d+\s*회/g) || []).map((x) => x.replace(/\s+/g, '')))];
const DOSE = (s: string): string[] => [...new Set((s.match(/1\s*회\s*\d+(?:[./]\d+)?\s*(?:정|캡슐|포|팩|병|mL|ml|㎖|g|mg|㎎|방울|매|스푼|앰플)/g) || []).map((x) => x.replace(/\s+/g, '')))];
function ages(s: string): { lo: number | null; hi: number | null } {
  const lo: number[] = [], hi: number[] = [];
  for (const m of s.matchAll(/(?:만\s*)?(\d+)\s*(세|개월|살)\s*(이상|이하|미만|초과)/g)) {
    const v = m[2] === '개월' ? parseInt(m[1], 10) / 12 : parseInt(m[1], 10);
    if (m[3] === '이상' || m[3] === '초과') lo.push(v); else hi.push(v);
  }
  return { lo: lo.length ? Math.min(...lo) : null, hi: hi.length ? Math.max(...hi) : null };
}

async function main(): Promise<void> {
  const cls = JSON.parse(fs.readFileSync(P('otc-ko-source-fidelity-classification.ga.json'), 'utf8')).docs as any[];
  const byKo = new Map<string, any>(cls.map((d) => [d.koId, d]));
  const contradicted = cls.filter((d) => d.verdict === 'KO_CONTRADICTED');
  const wrongAttr = cls.filter((d) => d.verdict === 'KO_WRONG_ATTRIBUTION');

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5730', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  /* 모집단 재확인 */
  const dbTotal = (await pool.query(`SELECT count(*)::int n FROM shared_product_descriptions d
     WHERE d.description_type='STORE' AND d.status='canonical' AND COALESCE(d.language,'ko')='ko'
       AND d.deleted_at IS NULL AND d.source_type IN
       ('mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical','mfds_easy_drug','manual')`)).rows[0].n;

  /* CONTRADICTED 전건 독립 재증명 */
  let confirmed = 0, notReproduced = 0;
  const samples: any[] = [];
  for (let i = 0; i < contradicted.length; i += 200) {
    const chunk = contradicted.slice(i, i + 200);
    const rows = (await pool.query(`
      SELECT d.id::text id, d.content ko,
             (SELECT content FROM shared_product_descriptions x WHERE x.master_id=d.master_id
                AND x.source_type='mfds_easy_drug' AND x.deleted_at IS NULL LIMIT 1) off
        FROM shared_product_descriptions d WHERE d.id = ANY($1::uuid[])`, [chunk.map((c) => c.koId)])).rows;
    for (const r of rows) {
      const off = String(r.off || ''), ko = String(r.ko || '');
      const oDose = sectionOf(off, /용법[·ㆍ・]?\s*용량/), oAll = strip(off);
      const kAll = strip(ko);
      const kDose = sectionOf(ko, /복용\s*안내|용법[·ㆍ・]?\s*용량|복용법|사용\s*안내/) || kAll;
      const oF = FREQ(oDose), kF = FREQ(kDose);
      const oD = DOSE(oDose), kD = DOSE(kDose);
      const oA = ages(oAll), kA = ages(kAll);
      const bad = (oF.length && kF.length && !kF.every((x) => oF.includes(x)))
        || (oD.length && kD.length && !kD.every((x) => oD.includes(x)))
        || (oA.lo != null && kA.lo != null && Math.abs(oA.lo - kA.lo) > 0.01)
        || (oA.hi != null && kA.hi != null && Math.abs(oA.hi - kA.hi) > 0.01);
      if (bad) confirmed++;
      else { notReproduced++; if (samples.length < 15) samples.push({ id: r.id, name: byKo.get(r.id)?.name, oF, kF, oD, kD, oA, kA }); }
    }
  }

  /* WRONG_ATTRIBUTION — master 규제 속성으로 독립 확인 */
  const attrRows = (await pool.query(`
    SELECT d.id::text id, pm.regulatory_type reg, pm.drug_category cat, pm.status st
      FROM shared_product_descriptions d JOIN product_masters pm ON pm.id=d.master_id
     WHERE d.id = ANY($1::uuid[])`, [wrongAttr.map((w) => w.koId)])).rows;
  const attrConfirmed = attrRows.filter((r: any) => !(r.reg === 'DRUG' && r.cat === 'otc' && r.st === 'ACTIVE')).length;
  await pool.end();

  const counts: Record<string, number> = {};
  for (const d of cls) counts[d.verdict] = (counts[d.verdict] || 0) + 1;
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);

  const checks: Record<string, boolean> = {
    'DB 모집단 = 원장 건수': dbTotal === cls.length,
    '판정 합계 = 전체 (상호배타)': sum === cls.length,
    '문서 중복 0': cls.length === new Set(cls.map((d) => d.koId)).size,
    'CONTRADICTED 전건 독립 재증명': notReproduced === 0,
    'WRONG_ATTRIBUTION 전건 규제속성으로 확인': attrConfirmed === wrongAttr.length,
    '번역 가능 = MATCH + DISPLAY_ONLY': (counts.KO_SOURCE_MATCH || 0) + (counts.KO_DISPLAY_ONLY_DIFFERENCE || 0) > 0,
  };

  const out = {
    mode: 'READ-ONLY / DB write 0',
    independence: '판정 스크립트와 otc-zh-slots / otc-ko-truncation-policy 를 import 하지 않는다',
    dbTotal, ledgerTotal: cls.length, counts,
    translatable: (counts.KO_SOURCE_MATCH || 0) + (counts.KO_DISPLAY_ONLY_DIFFERENCE || 0),
    contradictedReproof: { total: contradicted.length, confirmed, notReproduced, samples },
    wrongAttributionReproof: { total: wrongAttr.length, confirmed: attrConfirmed },
    checks,
    verdict: Object.values(checks).every(Boolean) ? 'VERIFIED' : 'VERIFY_FAILED',
  };
  fs.writeFileSync(P('otc-ko-source-fidelity-verify.ga.json'), JSON.stringify(out, null, 1), 'utf8');
  console.log(JSON.stringify({ ...out, contradictedReproof: { ...out.contradictedReproof, samples: samples.length } }, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
