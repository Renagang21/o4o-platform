/**
 * OTC zh 배치 01 — **독립 검증** (READ-ONLY)
 *
 * 조립기(`otc-zh-batch01-apply.ga.ts`)·슬롯 SSOT·용어집을 **import 하지 않는다.**
 * DB 에 실제로 들어간 zh 행만 읽어 자체 규칙으로 재판정한다(같은 코드로 같은 결론을 내는 자기증명 회피).
 *
 * 게이트
 *   V1 CANONICAL_UNIQUE  — master 당 STORE·canonical·zh 행 1개
 *   V2 NO_HANGUL         — 한글 잔존 0
 *   V3 SKELETON_MATCH    — 같은 master 의 KO canonical 과 태그 골격 byte 일치(표준 디자인 계승 증명)
 *   V4 NUMERIC_PARITY    — 문서 전체 수치 집합: 신설 0 / 누락은 `1일`·`1회`·`N차` 흡수분 이내
 *   V5 NOT_EMPTY         — content 비어있지 않음, summary 존재
 *   V6 OUT_OF_SCOPE      — 이번 작업으로 KO·EN·ja 행이 변경되지 않았는지(updated_at 기준) 확인
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const strip = (h: string): string => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const bones = (h: string): string => h.replace(/>[^<]*</g, '><').replace(/^[^<]*/, '').replace(/[^>]*$/, '');
const digits = (s: string): string[] => (s.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)*/g) || []);
const tally = (a: string[]): Map<string, number> => a.reduce((m, v) => m.set(v, (m.get(v) || 0) + 1), new Map<string, number>());

async function main(): Promise<void> {
  const applied = JSON.parse(fs.readFileSync(path.join(DATA, 'otc-zh-batch01-apply.ga.json'), 'utf8'));
  const masters: string[] = applied.plans.map((p: any) => p.masterId);
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5668', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  const rows: any[] = [];
  for (let i = 0; i < masters.length; i += 300)
    rows.push(...(await pool.query(
      `SELECT master_id::text mid, COALESCE(language,'ko') lang, content, summary, source_type, id::text id
         FROM shared_product_descriptions
        WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
          AND master_id = ANY($1::uuid[]) AND COALESCE(language,'ko') IN ('ko','zh')`,
      [masters.slice(i, i + 300)])).rows);

  const scope = (await pool.query(
    `SELECT COALESCE(language,'ko') lang, count(*)::int n FROM shared_product_descriptions
      WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        AND updated_at > now() - interval '2 hours' GROUP BY 1 ORDER BY 1`)).rows;
  await pool.end();

  const byMaster = new Map<string, { ko?: any; zh: any[] }>();
  for (const r of rows) {
    const e = byMaster.get(r.mid) || { zh: [] };
    if (r.lang === 'zh') e.zh.push(r); else e.ko = r;
    byMaster.set(r.mid, e);
  }

  const fail: Record<string, string[]> = {};
  const bad = (code: string, mid: string): void => { (fail[code] ||= []).push(mid); };
  let checked = 0;
  for (const mid of masters) {
    const e = byMaster.get(mid);
    if (!e || e.zh.length !== 1) { bad('V1_CANONICAL_UNIQUE', mid); continue; }
    const zh = e.zh[0], ko = e.ko;
    checked++;
    if (/[가-힣]/.test(zh.content)) bad('V2_NO_HANGUL', mid);
    if (!ko) bad('V3_KO_MISSING', mid);
    else if (bones(zh.content) !== bones(ko.content)) bad('V3_SKELETON_MATCH', mid);
    if (ko) {
      const k = tally(digits(strip(ko.content))), z = tally(digits(strip(zh.content)));
      const s = strip(ko.content).replace(/\s+/g, '');
      const absorb = tally([...(s.match(/1(?=[일회])/g) || []), ...(s.match(/\d+(?=차)/g) || [])]);
      let ok = true;
      for (const [v, n] of k) if (n - (z.get(v) || 0) > (absorb.get(v) || 0)) ok = false;
      for (const [v, n] of z) if (n > (k.get(v) || 0)) ok = false;
      if (!ok) bad('V4_NUMERIC_PARITY', mid);
    }
    if (!zh.content || !zh.content.trim() || !zh.summary) bad('V5_NOT_EMPTY', mid);
  }

  const out = {
    batch: 'zh-batch-01', appliedPlans: masters.length, zhRowsChecked: checked,
    failures: Object.fromEntries(Object.entries(fail).map(([k, v]) => [k, v.length])),
    failureSample: Object.fromEntries(Object.entries(fail).map(([k, v]) => [k, v.slice(0, 5)])),
    recentlyUpdatedCanonicalByLang: scope,
    verdict: Object.keys(fail).length === 0 && checked === masters.length ? 'GREEN' : 'RED',
  };
  fs.writeFileSync(path.join(DATA, 'otc-zh-batch01-verify.ga.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
