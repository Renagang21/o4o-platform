/**
 * WO-…-KO-DATA-LINEAGE-AND-VALIDITY-AUDIT-V1 — 실행 B 정밀 대조 (READ-ONLY)
 *
 * 앞선 광범위 지문 검사는 "뭔가 다르다"까지만 말한다. 의약품 설명서에서 실제로 위험한 것은
 * **용법 횟수와 연령 하한**이므로, 이 두 축만 떼어 **원문과 1:1로 정확히 대조**한다.
 *
 * 대상: 같은 ProductMaster 에 e약은요 원문이 남아 있는 문서 전량(표본 아님).
 * DB write 0.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots, T } from './otc-zh-slots.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };

/** e약은요 원문의 용법·용량 절만 뽑는다. */
function rawDosage(html: string): string {
  const m = /<strong>\s*용법[·ㆍ・]?\s*용량\s*<\/strong>([\s\S]*?)(?=<strong>|$)/.exec(html);
  return m ? T(m[1]) : '';
}
/** 현행 매장용 설명서의 복용 안내 텍스트 — 레이아웃 4종을 모두 흡수한다. */
function koDosage(html: string): string {
  const sl = slots(html);
  const intake = sl.filter((s) => s.kind === 'intake').map((s) => s.text).join(' ');
  if (intake.trim()) return intake;
  /* TABLE/PARA 레이아웃: <strong>복용 안내</strong> 뒤의 문단 */
  const m = /<strong>\s*(복용\s*안내|용법[·ㆍ・]?\s*용량|복용법)\s*<\/strong>([\s\S]*?)(?=<strong>|<\/p>|$)/.exec(html);
  return m ? T(m[2]) : '';
}

/** 1일 N회 — 투여 빈도. 설명서에서 가장 위험한 수치다. */
const freq = (s: string): string[] => [...new Set((s.match(/1\s*일\s*\d+\s*회/g) || []).map((x) => x.replace(/\s+/g, '')))];
/** 연령 하한 — `만 N세 이상` / `N세 이상` / `N개월 이상`. `만` 유무는 표기 차이이므로 정규화한다. */
function ageFloor(s: string): number | null {
  const out: number[] = [];
  for (const m of s.matchAll(/(?:만\s*)?(\d+)\s*(세|개월|살)\s*이상/g)) {
    const n = parseInt(m[1], 10);
    out.push(m[2] === '개월' ? n / 12 : n);
  }
  return out.length ? Math.min(...out) : null;
}

async function main(): Promise<void> {
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5700', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  const docs = (await pool.query(`
    SELECT d.id::text ko_id, d.master_id::text mid, d.source_type, d.content, pm.name
      FROM shared_product_descriptions d JOIN product_masters pm ON pm.id=d.master_id
     WHERE d.description_type='STORE' AND d.status='canonical' AND COALESCE(d.language,'ko')='ko'
       AND d.deleted_at IS NULL AND d.source_type IN
       ('mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical','mfds_easy_drug','manual')`)).rows;
  const raw = new Map<string, string>();
  const mids = [...new Set(docs.map((d: any) => d.mid))];
  for (let i = 0; i < mids.length; i += 500)
    for (const r of (await pool.query(`SELECT master_id::text mid, content FROM shared_product_descriptions
       WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE'
         AND deleted_at IS NULL`, [mids.slice(i, i + 500)])).rows) if (!raw.has(r.mid)) raw.set(r.mid, r.content || '');
  await pool.end();

  const verdictCount: Record<string, number> = {}, bySource: Record<string, Record<string, number>> = {};
  const mismatches: any[] = [];
  for (const d of docs) {
    const rh = raw.get(d.mid);
    let verdict: string;
    let detail: any = {};
    if (!rh || !rh.trim()) verdict = 'NO_RAW';
    else {
      const rd = rawDosage(rh), kd = koDosage(String(d.content || ''));
      if (!rd.trim()) verdict = 'RAW_NO_DOSAGE';
      else if (!kd.trim()) verdict = 'KO_NO_DOSAGE';
      else {
        const rf = freq(rd), kf = freq(kd);
        const ra = ageFloor(rd) ?? ageFloor(T(rh)), ka = ageFloor(kd);
        const freqBad = rf.length && kf.length && !kf.every((v) => rf.includes(v));
        const ageBad = ra != null && ka != null && Math.abs(ra - ka) > 0.01;
        detail = { rawFreq: rf, koFreq: kf, rawAgeFloor: ra, koAgeFloor: ka };
        verdict = freqBad && ageBad ? 'FREQ_AND_AGE_MISMATCH'
          : freqBad ? 'FREQ_MISMATCH' : ageBad ? 'AGE_FLOOR_MISMATCH'
          : (!rf.length || !kf.length) ? 'FREQ_UNPARSEABLE' : 'MATCH';
      }
    }
    inc(verdictCount, verdict);
    (bySource[d.source_type] ||= {}); inc(bySource[d.source_type], verdict);
    if (verdict.includes('MISMATCH') && mismatches.length < 4000)
      mismatches.push({ koId: d.ko_id, mid: d.mid, name: d.name, sourceType: d.source_type, verdict, ...detail });
  }

  const out = { mode: 'READ-ONLY / DB write 0', total: docs.length, verdictCount, bySource,
    mismatchTotal: Object.entries(verdictCount).filter(([k]) => k.includes('MISMATCH')).reduce((a, [, v]) => a + v, 0),
    mismatches };
  fs.writeFileSync(P('otc-ko-dosage-fidelity.ga.json'), JSON.stringify(out, null, 1), 'utf8');
  console.log(JSON.stringify({ ...out, mismatches: mismatches.length }, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
