/**
 * EN 누락 복원 V3 — 잔여 79건. 원칙·가드는 V1/V2 와 동일.
 * 용법(intake) 문장은 주의 목록에 넣으면 오배치이므로 계속 제외한다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');
const APPLY = process.argv.includes('--apply') && process.env.OTC_EN_OMISSION_FIX3 === 'CONFIRM';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const R: Array<{ id: string; re: RegExp; en: (m: RegExpMatchArray) => string }> = [
  { id: 'CONTRA_AGE_PREG_V3', re: /이 약에 과민증 환자,\s*만\s*(\d+)\s*세 미만 소아,\s*임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부는 이 약을 사용하지 마십시오/,
    en: (m) => `Do not use this medicine if you are hypersensitive to it, if the user is a child under ${m[1]} years of age, or if you are pregnant, may be pregnant, or are breastfeeding.` },
  { id: 'LAXATIVE_CONSULT_V3A', re: /이 약을 복용하기 전에 임부 또는 임신하고 있을 가능성이 있는 여성,알레르기 체질,심한 복통[^]{0,20}?또는 구역,구토 환자,직장의 출혈 혹은 장부전 경험자,만\s*(\d+)\s*세 이하의 어린이/,
    en: (m) => `Before taking this medicine, consult a doctor or pharmacist if you are pregnant or may be pregnant, have an allergic constitution, have severe abdominal pain, nausea or vomiting, have had rectal bleeding or intestinal failure, or if the user is a child aged ${m[1]} years or younger.` },
  { id: 'LAXATIVE_CONSULT_V3B', re: /이 약을 복용하기 전에 심한 복통 또는 구역,구토,임부 또는 임신하고 있을 가능성이 있는 여성,나트륨 제한식이를 하고 있는 사람,직장의 출혈 혹은 장부전의 병력이 있는 사람,만\s*(\d+)\s*세 이하의/,
    en: (m) => `Before taking this medicine, consult a doctor or pharmacist if you have severe abdominal pain, nausea or vomiting, are pregnant or may be pregnant, are on a sodium-restricted diet, have a history of rectal bleeding or intestinal failure, or if the user is a child aged ${m[1]} years or younger.` },
  { id: 'RHINITIS_CONSULT', re: /이 약을 복용하기 전에\s*(\d+)\s*세 미만의 소아,\s*(\d+)\s*세 이상의 고령자,알레르기성 비염이나 감기 등 다른 원인에 의한 것인지 모르는 사람/,
    en: (m) => `Before taking this medicine, consult a doctor or pharmacist if the user is a child under ${m[1]} years of age or an elderly person aged ${m[2]} years and over, if it is not known whether the symptoms are due to allergic rhinitis, a cold or another cause, if the user has been diagnosed with another allergic disease, or if nasal congestion is severe.` },
  { id: 'ERDOSTEINE_CONTRA_V3', re: /이 약에 과민증 환자,간경변,시스타티오닌 합성효소 결핍,소화성궤양 환자,중증 신장장애\(크레아티닌청소율이<?\s*(\d+)\s*mL/,
    en: (m) => `Do not take this medicine if you are hypersensitive to it, or have liver cirrhosis, cystathionine synthase deficiency, peptic ulcer, or severe renal impairment (creatinine clearance below ${m[1]} mL/min).` },
  { id: 'NO_IMPROVE_DAYS_ORAL', re: /(\d+)\s*일\s*간 복용 후에도 증상의 개선이 없을 경우 복용을 즉각 중지하고 의사 또는 약사와 상의하십시오/,
    en: (m) => `If there is no improvement in symptoms after taking it for ${m[1]} days, stop taking it immediately and consult a doctor or pharmacist.` },
  { id: 'NO_IMPROVE_RANGE_TILDE', re: /(\d+)\s*[∼~,-]\s*(\d+)\s*일간 사용하여도 증상의 개선이 없을 경우 사용을 즉각 중지하고 의사 또는 약사와 상의하십시오/,
    en: (m) => `If there is no improvement in symptoms after using it for ${m[1]} to ${m[2]} days, stop using it immediately and consult a doctor or pharmacist.` },
  { id: 'NO_IMPROVE_RANGE_CONSULT2', re: /(\d+)\s*[∼~,-]\s*(\d+)\s*일간 사용 후 개선효과가 나타나지 않으면,?\s*의사 또는 약사와 상의하십시오/,
    en: (m) => `If no improvement appears after using it for ${m[1]} to ${m[2]} days, consult a doctor or pharmacist.` },
  { id: 'GALACTOSE_CONTRA', re: /갈락토오스 불내성,Lapp 유당분해효소결핌?증 또는 포도당,갈락토오스 흡수장애 등의 유전적인 문제가 있는 환자,임부 또는 임신하고 있을 가능성이 있는 여성,수유부,신생아,만\s*(\d+)\s*세 이하의 어린/,
    en: (m) => `Do not take this medicine if you have a genetic problem such as galactose intolerance, Lapp lactase deficiency or glucose-galactose malabsorption, if you are pregnant or may be pregnant, are breastfeeding, or if the user is a newborn or a child aged ${m[1]} years or younger.` },
  { id: 'DIALYSIS_CONTRA', re: /투석요법을 받고 있는 환자,갈락토오스 불내성,Lapp 유당\(젖당\)분해효소 결핍증 또는 포도당,갈락토오스 흡수장애 등의 유전적인 문제가 있는 환자,소아\((\d+)\s*세 미만\)/,
    en: (m) => `Do not take this medicine if you are receiving dialysis, have a genetic problem such as galactose intolerance, Lapp lactase deficiency or glucose-galactose malabsorption, if the user is a child under ${m[1]} years of age, or if you are pregnant, may be pregnant, or are breastfeeding.` },
  { id: 'ACET_MAX_DOSE_V3', re: /아세트아미노펜으로 일일 최대 용량\(\s*([\d,]+)\s*mg\s*\)을 초과하여 복용하지 마십시오/,
    en: (m) => `Do not take more than the maximum daily dose of acetaminophen (${m[1]} mg).` },
  { id: 'NO_USE_UNDER_AGE_V3', re: /(\d+)\s*세 미만의 소아에는 사용하지 마십시오/,
    en: (m) => `Do not use it in children under ${m[1]} years of age.` },
  { id: 'SOY_PEANUT_CONTRA', re: /이 약 및 콩 또는 땅콩에 과민증 환자,대두유 과민증 환자 또는 경험자,만\s*(\d+)\s*개월 미만의 젖먹이,심한 증상의 신부전 환자는 이 약을 복용하지 마십시오/,
    en: (m) => `Do not take this medicine if you are hypersensitive to it or to soybean or peanut, are hypersensitive to soybean oil or have been in the past, if the user is an infant under ${m[1]} months of age, or if you have severe renal failure.` },
  { id: 'TINEA_SPECIES_AGE', re: /Microsporum canis 및 Epidermophyton floccosum과 같은 피부사상균에 의한 피부감염증\(족부백선\((\d+)\s*세 이상의 청소년 및 성인에 한함\)\)/,
    en: (m) => `This medicine is used for skin infections caused by dermatophytes such as Trichophyton violaceum, Microsporum canis and Epidermophyton floccosum (athlete's foot; only in adolescents aged ${m[1]} years and over and in adults).` },
];

async function main(): Promise<void> {
  const src: any[] = JSON.parse(fs.readFileSync(P('otc-en-omission-remaining79.ga.json'), 'utf8')).rows;
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5632', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  const en = new Map<string, any>();
  const ids = src.map((r) => r.enDescriptionId);
  for (let i = 0; i < ids.length; i += 400)
    for (const r of (await pool.query('SELECT id::text id, content, md5(content) h, language, status FROM shared_product_descriptions WHERE id = ANY($1::uuid[])', [ids.slice(i, i + 400)])).rows) en.set(r.id, r);
  const plans: any[] = [], skips: any[] = [];
  for (const r of src) {
    const cur = en.get(r.enDescriptionId);
    if (!cur || cur.language !== 'en' || cur.status !== 'canonical') { skips.push({ id: r.enDescriptionId, code: 'FIELD_UNEXPECTED' }); continue; }
    const before = String(cur.content);
    if (!/<ul class="sd-warn">/.test(before)) { skips.push({ id: r.enDescriptionId, code: 'NO_WARN_LIST' }); continue; }
    const adds: string[] = [], used: string[] = [];
    for (const ko of r.missingKoSentences as string[])
      for (const rule of R) {
        const m = ko.match(rule.re); if (!m) continue;
        const s = rule.en(m);
        if (T(before).includes(s.slice(0, 50))) break;
        adds.push(s); used.push(rule.id); break;
      }
    if (!adds.length) { skips.push({ id: r.enDescriptionId, code: 'NO_RULE_MATCH' }); continue; }
    const at = before.indexOf('</ul>', before.indexOf('<ul class="sd-warn">'));
    const inserted = adds.map((s) => `\n      <li>${esc(s)}</li>`).join('');
    const next = before.slice(0, at) + inserted + '\n    ' + before.slice(at);
    if (next.replace(inserted + '\n    ', '') !== before) { skips.push({ id: r.enDescriptionId, code: 'DIFF_GUARD_FAILED' }); continue; }
    if ((next.match(/<li>/g) || []).length - (before.match(/<li>/g) || []).length !== adds.length) { skips.push({ id: r.enDescriptionId, code: 'LI_DELTA_MISMATCH' }); continue; }
    if (/[가-힣]/.test(next)) { skips.push({ id: r.enDescriptionId, code: 'HANGUL_IN_EN' }); continue; }
    plans.push({ enId: r.enDescriptionId, master: r.masterId, product: r.productName, oldHash: cur.h, newHash: md5(next), newContent: next, rules: used });
  }
  const results: any[] = [];
  if (APPLY) for (const p of plans) {
    const q = await pool.query(
      `UPDATE shared_product_descriptions SET content=$2, updated_at=now()
        WHERE id=$1::uuid AND language='en' AND status='canonical' AND description_type='STORE'
          AND deleted_at IS NULL AND md5(content)=$3 RETURNING id`, [p.enId, p.newContent, p.oldHash]);
    results.push({ enId: p.enId, status: q.rowCount === 1 ? 'GREEN' : 'CONCURRENT_CHANGE_DETECTED' });
  }
  await pool.end();
  const byRule: Record<string, number> = {};
  for (const p of plans) for (const x of p.rules) byRule[x] = (byRule[x] || 0) + 1;
  const summary = { mode: APPLY ? 'APPLY' : 'dry-run', input: src.length, planned: plans.length,
    sentencesInserted: plans.reduce((a, p) => a + p.rules.length, 0), byRule,
    skipped: skips.length, skipByCode: skips.reduce((a: any, s) => { a[s.code] = (a[s.code] || 0) + 1; return a; }, {}),
    green: results.filter((r) => r.status === 'GREEN').length };
  fs.writeFileSync(P(`otc-en-omission-restore-v3-${APPLY ? 'apply' : 'dryrun'}.ga.json`),
    JSON.stringify({ summary, plans: plans.map(({ newContent, ...p }) => p), skips, results }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
