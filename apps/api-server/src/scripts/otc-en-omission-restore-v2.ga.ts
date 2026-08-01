/**
 * EN 누락 복원 V2 — 1차 사전이 덮지 못한 141건 (dry-run / apply)
 *
 * 원칙은 V1 과 동일: KO 문장 하나가 유일한 번역 기준, 수치·연령·기간 슬롯은 KO 값 그대로,
 * 주의 목록에 `<li>` 삽입만 허용, 삽입 리터럴 역패치 byte 일치로 그 외 변경 0 증명.
 *
 * 이번 사전은 **주의·금기 문장만** 다룬다. 용법(`1일 수회 환부에 바릅니다` 등)은 삽입 위치가
 * 주의 목록이 아니므로 대상에서 제외했다(오배치 방지).
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
const APPLY = process.argv.includes('--apply') && process.env.OTC_EN_OMISSION_FIX2 === 'CONFIRM';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const R: Array<{ id: string; re: RegExp; en: (m: RegExpMatchArray) => string }> = [
  { id: 'IBU_HIGHDOSE_AVOID', re: /조절되지 않는 고혈압,울혈심부전증,확립된 허혈성 심장질환,말초동맥질환,뇌혈관질환을 가진 환자들은 신중히 고려하여 이부프로펜을 사용하고 고용량 이부프로펜\(\s*\d+일\s*([\d,]+)\s*mg\)/,
    en: (m) => `Patients with uncontrolled high blood pressure, congestive heart failure, established ischaemic heart disease, peripheral arterial disease or cerebrovascular disease should use ibuprofen only after careful consideration, and should avoid high-dose ibuprofen (${m[1]} mg a day).` },
  { id: 'SALICYLATE_CONTRA_FULL', re: /이 약 또는 다른 살리실산제제,진통제,소염제,항류마티스제에 대한 과민증 환자,소화성궤양,아스피린천식 또는 경험자,혈우병,심한 간장애,심한 신장애,심한 심기능부전,출혈경향,일주일 동안 메토트렉세이트\s*(\d+)/,
    en: (m) => `Do not take this medicine if you are hypersensitive to it or to other salicylates, analgesics, anti-inflammatory medicines or antirheumatic medicines; if you have peptic ulcer, aspirin-induced asthma or a history of it, haemophilia, severe liver impairment, severe kidney impairment, severe cardiac insufficiency or a bleeding tendency; if you are receiving methotrexate at ${m[1]} mg or more per week; or if you are in the third trimester of pregnancy.` },
  { id: 'SALICYLATE_CONTRA_SHORT', re: /이 약 또는 다른 살리실산제제에 과민증 환자,소화성궤양,아스피린천식 또는 경험자,혈우병,심한 간장애,심한 신장애,심한 심기능부전,출혈경향,일주일 동안 메토트렉세이트\s*(\d+)/,
    en: (m) => `Do not take this medicine if you are hypersensitive to it or to other salicylates, or if you have peptic ulcer, aspirin-induced asthma or a history of it, haemophilia, severe liver impairment, severe kidney impairment, severe cardiac insufficiency or a bleeding tendency; if you are receiving methotrexate at ${m[1]} mg or more per week; or if you are in the third trimester of pregnancy.` },
  { id: 'MAO_AGE_CONTRA', re: /(\d+)\s*세 미만 소아,이 약에 과민증 환자,임부 및 수유부,MAO 억제제[^]{0,60}?복용을 중단한 후\s*(\d+)\s*주 이내의 사람/,
    en: (m) => `Do not take this medicine if the user is a child under ${m[1]} years of age, is hypersensitive to this medicine, is pregnant or breastfeeding, or is taking an MAO inhibitor (antidepressants, antipsychotics, mood regulators, antiparkinsonian medicines and the like) or is within ${m[2]} weeks of stopping one.` },
  { id: 'SKIN_ADVERSE_STOP', re: /이상반응이 나타나면 사용을 중지하고 의사 또는 약사와 상의하세요: 피부 가려움/,
    en: () => 'If an adverse reaction occurs, stop using it and consult a doctor or pharmacist: itching of the skin, scaling or peeling, erythema, redness (congested and reddened skin), dermatitis, dry skin, or hair growth outside the area where this medicine was applied.' },
  { id: 'TINEA_PEDIS_AGE', re: /이 약은\s*(\d+)\s*세 이상의 청소년 및 성인에 한하여 피부사상균에 의한 피부감염증\(족부백선\)에 사용합니다/,
    en: (m) => `This medicine is used only in adolescents aged ${m[1]} years and over and in adults, for skin infections caused by dermatophytes (athlete's foot).` },
  { id: 'NO_USE_UNDER_AGE', re: /^(?:만\s*)?(\d+)\s*세 미만의 소아에 사용하지 마십시오/,
    en: (m) => `Do not use it in children under ${m[1]} years of age.` },
  { id: 'CONTRA_AGE_PREG_HYPERSENS', re: /이 약에 과민증 환자,\s*만\s*(\d+)\s*세 미만 소아,\s*임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부는 이 약을 사용하지 마십시오/,
    en: (m) => `Do not use this medicine if you are hypersensitive to it, if the user is a child under ${m[1]} years of age, or if you are pregnant, may be pregnant, or are breastfeeding.` },
  { id: 'HYPERCALC_CONTRA', re: /이 약에 과민증 환자,고칼슘혈증\(혈액중에 칼슘이 과잉으로 존재하는 상태\)환자,유육종증[^]{0,40}?만\s*(\d+)\s*개월 미만의 젖먹이/,
    en: (m) => `Do not take this medicine if you are hypersensitive to it, have hypercalcaemia (an excess of calcium in the blood), sarcoidosis (a systemic inflammatory disease of unknown cause), kidney disease, hyperkalaemia, or if the user is an infant under ${m[1]} months of age.` },
  { id: 'ERDOSTEINE_CONTRA', re: /이 약에 과민증 환자,임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부,간경변 환자,시스타티오닌 합성효소 결핍환자,소화성궤양,중증 신장장애\(크레아티닌 청소율이<?\s*(\d+)\s*mL/,
    en: (m) => `Do not take this medicine if you are hypersensitive to it, are pregnant or may be pregnant, are breastfeeding, or have liver cirrhosis, cystathionine synthase deficiency, peptic ulcer, or severe renal impairment (creatinine clearance below ${m[1]} mL/min).` },
  { id: 'ERDOSTEINE_CONTRA2', re: /이 약에 과민증 환자,간경변,시스타티오닌 합성효소 결핍,소화성궤양,중증 신장장애\(크레아티닌청소율이<?\s*(\d+)\s*mL/,
    en: (m) => `Do not take this medicine if you are hypersensitive to it, or have liver cirrhosis, cystathionine synthase deficiency, peptic ulcer, or severe renal impairment (creatinine clearance below ${m[1]} mL/min).` },
  { id: 'ELDERLY_EDEMA_THYROID2', re: /이 약을 사용하기 전에\s*(\d+)\s*세 이상의 고령자, 부종이 있는 환자, 갑상샘기능저하증 또는 갑상샘기능항진증 같은 갑상샘 기능 장애 환자는 의사 또는 약사와 상의하십시오/,
    en: (m) => `Before using this medicine, elderly people aged ${m[1]} years and over, patients with edema, and patients with thyroid dysfunction such as hypothyroidism or hyperthyroidism should consult a doctor or pharmacist.` },
  { id: 'NO_IMPROVE_STOP_RANGE2', re: /(\d+)\s*[~,-]\s*(\d+)\s*일간 사용 후 개선효과가?가? 나타나지 않으면 이 약의 사용을 즉각 중지하고 의사 또는 약사와 상의하십시오/,
    en: (m) => `If no improvement appears after using it for ${m[1]} to ${m[2]} days, stop using this medicine immediately and consult a doctor or pharmacist.` },
  { id: 'NO_IMPROVE_CONSULT_RANGE', re: /(\d+)\s*[~,-]\s*(\d+)\s*일간 사용하여도 증상의 개선이 없을 경우 의사 또는 약사와 상의하십시오/,
    en: (m) => `If there is no improvement in symptoms after using it for ${m[1]} to ${m[2]} days, consult a doctor or pharmacist.` },
  { id: 'NO_CONTINUOUS_USE_DAYS2', re: /(\d+)\s*일 이상 계속하여 사용하지 마십시오/,
    en: (m) => `Do not use it continuously for ${m[1]} days or more.` },
  { id: 'LAXATIVE_CONSULT', re: /이 약을 복용하기 전에 임부 또는 임신하고 있을 가능성이 있는 여성,알레르기 체질인 사람,나트륨 제한 식이를 하는 사람,심한 복통\(배 아픔\) 또는 구역,구토 환자/,
    en: () => 'Before taking this medicine, consult a doctor or pharmacist if you are pregnant or may be pregnant, have an allergic constitution, are on a sodium-restricted diet, have severe abdominal pain, nausea or vomiting, or have rectal bleeding or a history of intestinal failure.' },
];

async function main(): Promise<void> {
  const src: any[] = JSON.parse(fs.readFileSync(P('otc-en-omission-remaining141.ga.json'), 'utf8')).rows;
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5626', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  const en = new Map<string, any>();
  const ids = src.map((r) => r.enDescriptionId);
  for (let i = 0; i < ids.length; i += 400)
    for (const r of (await pool.query('SELECT id::text id, content, md5(content) h, language, status FROM shared_product_descriptions WHERE id = ANY($1::uuid[])', [ids.slice(i, i + 400)])).rows) en.set(r.id, r);

  const plans: any[] = [], skips: any[] = [];
  for (const r of src) {
    const cur = en.get(r.enDescriptionId);
    if (!cur) { skips.push({ id: r.enDescriptionId, code: 'EN_ROW_MISSING' }); continue; }
    if (cur.language !== 'en' || cur.status !== 'canonical') { skips.push({ id: r.enDescriptionId, code: 'FIELD_UNEXPECTED' }); continue; }
    const before = String(cur.content);
    if (!/<ul class="sd-warn">/.test(before)) { skips.push({ id: r.enDescriptionId, code: 'NO_WARN_LIST' }); continue; }
    const adds: string[] = [], used: string[] = [];
    for (const ko of r.missingKoSentences as string[]) {
      for (const rule of R) {
        const m = ko.match(rule.re); if (!m) continue;
        const s = rule.en(m);
        if (T(before).includes(s.slice(0, 50))) break;
        adds.push(s); used.push(rule.id); break;
      }
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
  fs.writeFileSync(P(`otc-en-omission-restore-v2-${APPLY ? 'apply' : 'dryrun'}.ga.json`),
    JSON.stringify({ summary, plans: plans.map(({ newContent, ...p }) => p), skips, results }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
