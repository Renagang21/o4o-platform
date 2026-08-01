/**
 * EN 누락 복원 V4 — 잔여 46건. 원칙·가드는 V1~V3 과 동일.
 * 용법(intake) 문장은 계속 제외한다(주의 목록 오배치 방지).
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
const APPLY = process.argv.includes('--apply') && process.env.OTC_EN_OMISSION_FIX5 === 'CONFIRM';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const R: Array<{ id: string; re: RegExp; en: (m: RegExpMatchArray) => string }> = [
  { id: 'SKIN_TEST_48H', re: /피부시험 실시 약\s*(\d+)\s*시간 전에는 이 약을 복용하지 마십시오/,
    en: (m) => `Do not take this medicine for about ${m[1]} hours before skin testing.` },
  { id: 'CHICKENPOX_FLU_CONSULT_V5', re: /이 약을 복용하기 전에 알레르기 체질,약에 의한 발열,발진,관절통,천식,가려움증 등의 알레르기 증상 경험자,수두 또는 인플루엔자에 감염되어 있거나 의심되는 영아,유아 및 어린이\s*\((\d+)\s*세 이하\)/,
    en: (m) => `Before taking this medicine, consult a doctor or pharmacist if you have an allergic constitution, have experienced allergic symptoms from medicines such as fever, rash, joint pain, asthma or itching, or if the user is an infant, a young child or a child aged ${m[1]} years or younger who has or is suspected of having chickenpox or influenza.` },
  { id: 'LAXATIVE_CONSULT_V5', re: /이 약을 복용하기 전에 심한 복통 또는 구역,구토 환자,임부 또는 임신하고 있을 가능성이 있는 여성,신장장애 환자,나트륨 제한 식이를 하는 사람,직장의 출혈 혹은 장부전 경험자,만\s*(\d+)\s*세 이하의 어린이/,
    en: (m) => `Before taking this medicine, consult a doctor or pharmacist if you have severe abdominal pain, nausea or vomiting, are pregnant or may be pregnant, have kidney impairment, are on a sodium-restricted diet, have had rectal bleeding or intestinal failure, or if the user is a child aged ${m[1]} years or younger.` },
  { id: 'NO_IMPROVE_DAYS_ORAL_V5', re: /(\d+)\s*일 동안 복용하여도 증상의 개선이 없을 경우 복용을 즉각 중지하고 의사 또는 약사와 상의하십시오/,
    en: (m) => `If there is no improvement in symptoms after taking it for ${m[1]} days, stop taking it immediately and consult a doctor or pharmacist.` },
  { id: 'STOP_WHEN_IMPROVED_THEN_CONSULT', re: /증상이 개선되면 가능한 빠른 시일 내에 사용을 중지하십시오\.\s*(\d+)\s*[∼~,-]\s*(\d+)\s*일간 투여 후에도 증상의 개선이 없을 경우 투여를 중지하고 의사 또는 약사와 상의하십시오/,
    en: (m) => `Stop using it as soon as possible once symptoms improve. If there is no improvement after using it for ${m[1]} to ${m[2]} days, stop using it and consult a doctor or pharmacist.` },
  { id: 'NO_IMPROVE_USED_RANGE', re: /(\d+)\s*[∼~,-]\s*(\d+)\s*일을 사용하였으나 증상의 개선이 없는 경우 사용을 즉각 중지하고 의사 또는 약사와 상의하십시오/,
    en: (m) => `If there is no improvement in symptoms after using it for ${m[1]} to ${m[2]} days, stop using it immediately and consult a doctor or pharmacist.` },
  { id: 'GUARDIAN_THEN_CONSULT', re: /어린이에게 투여할 경우 보호자의 지도 감독하에 투여하십시오\.\s*(\d+)\s*[∼~,-]\s*(\d+)\s*일간 투여 후에도 증상의 개선이 없을 경우 투여를 중지하고 의사 또는 약사와 상의하십시오/,
    en: (m) => `When giving it to a child, do so under the guidance and supervision of a guardian. If there is no improvement after using it for ${m[1]} to ${m[2]} days, stop using it and consult a doctor or pharmacist.` },
  { id: 'TERBINAFINE_CONTRA', re: /테르비나핀 및 이 약에 과민증 환자 또는 경험자, 임부 또는 임신하고 있을 가능성이 있는 부인 및 수유부, 유·소아, (\d+)\s*세 미만의 소아는 이 약을 사용하지 마십시오/,
    en: (m) => `Do not use this medicine if you are hypersensitive to terbinafine or to this medicine or have been in the past, if you are pregnant, may be pregnant, or are breastfeeding, or if the user is an infant, a young child, or a child under ${m[1]} years of age.` },
  { id: 'HYPERSENS_PREG_INFANT_CONTRA', re: /이 약에 과민증 환자 또는 경험자, 임부 또는 임신하고 있을 가능성이 있는 여성, 수유부, (\d+)\s*세 미만의 유·소아는 이 약을 사용하지 마십시오/,
    en: (m) => `Do not use this medicine if you are hypersensitive to it or have been in the past, if you are pregnant, may be pregnant, or are breastfeeding, or if the user is an infant or a child under ${m[1]} years of age.` },
  { id: 'VITAMIN_A_BIRTH_DEFECT', re: /비타민 A를\s*1일\s*([\d,]+)\s*IU 이상 복용 시 선천성 기형을 일으킬 수 있습니다/,
    en: (m) => `Taking ${m[1]} IU or more of vitamin A per day may cause congenital birth defects.` },
  { id: 'LAXATIVE_CONSULT_V4', re: /이 약을 복용하기 전에 심한 복통[^]{0,20}?또는 구역,구토,임부 또는 임신하고 있을 가능성이 있는 여성,신장장애 환자,나트륨 제한 식이를 하는 사람,직장의 출혈 혹은 장부전 경험자,만\s*(\d+)\s*세 이하의 어린이/,
    en: (m) => `Before taking this medicine, consult a doctor or pharmacist if you have severe abdominal pain, nausea or vomiting, are pregnant or may be pregnant, have kidney impairment, are on a sodium-restricted diet, have had rectal bleeding or intestinal failure, or if the user is a child aged ${m[1]} years or younger.` },
  { id: 'ANTICHOLINERGIC_CONTRA', re: /이 약에 과민증,천식발작,폐기종,만성기관지염에 의한 호흡곤란,녹내장,전립선 비대 등 하부 요로 폐색성 질환,협착성 소화성 궤양 또는 유문십이지장 폐색 환자,(\d+)\s*세 미만의 소아/,
    en: (m) => `Do not take this medicine if you are hypersensitive to it, or have asthma attacks, difficulty breathing due to emphysema or chronic bronchitis, glaucoma, an obstructive lower urinary tract disease such as prostate enlargement, stenosing peptic ulcer or pyloroduodenal obstruction; if the user is a child under ${m[1]} years of age; or if you have a convulsive disorder such as epilepsy, or phaeochromocytoma.` },
  { id: 'CHICKENPOX_FLU_CONSULT', re: /이 약을 복용하기 전에 알레르기 체질,약에 의한 발열,발진,관절통,천식,가려움증 등의 알레르기 증상 경험자,수두 또는 인플루엔자에 감염되어 있거나 의심되는 영아,유아 및 \((\d+)\s*세 이하\) 어린이/,
    en: (m) => `Before taking this medicine, consult a doctor or pharmacist if you have an allergic constitution, have experienced allergic symptoms from medicines such as fever, rash, joint pain, asthma or itching, or if the user is an infant, a young child or a child aged ${m[1]} years or younger who has or is suspected of having chickenpox or influenza.` },
  { id: 'MAGNESIUM_CONTRA', re: /이 약에 과민증 환자,투석 요법을 받고 있는 환자,고마그네슘혈증,고인산혈증,변비,장협착증,급성 충수염,임신초기\s*(\d+)\s*개월 이내의 여성,만\s*(\d+)\s*세 미만의 소아는 이 약을 복용하지 마십시오/,
    en: (m) => `Do not take this medicine if you are hypersensitive to it, are receiving dialysis, or have hypermagnesaemia, hyperphosphataemia, constipation, intestinal stenosis or acute appendicitis; if you are within the first ${m[1]} months of pregnancy; or if the user is a child under ${m[2]} years of age.` },
  { id: 'HYPERCALC_STONE_CONTRA', re: /이 약에 과민증 환자,고칼슘혈증\(혈액 중에 칼슘이 과잉으로 존재하는 상태\)환자,유육종증[^]{0,40}?신장결석,심한 증상의 신부전 환자,만\s*(\d+)\s*개월 미만의 젖먹이/,
    en: (m) => `Do not take this medicine if you are hypersensitive to it, have hypercalcaemia (an excess of calcium in the blood), sarcoidosis (a systemic inflammatory disease of unknown cause), kidney stones or severe renal failure, if the user is an infant under ${m[1]} months of age, or if you have galactose intolerance, Lapp lactase deficiency or glucose-galactose malabsorption.` },
  { id: 'MAX_DAILY_TABLETS', re: /단,\s*1일\s*(\d+)\s*회\((\d+)\s*정\)을 초과하여 복용하지 마십시오/,
    en: (m) => `However, do not take more than ${m[1]} times (${m[2]} tablets) a day.` },
  { id: 'IBU_MAX_DAILY', re: /1일 최고\s*([\d,]+)\s*mg까지 복용할 수 있습니다/,
    en: (m) => `Up to ${m[1]} mg a day may be taken.` },
];

async function main(): Promise<void> {
  const src: any[] = JSON.parse(fs.readFileSync(P('otc-en-omission-remaining24.ga.json'), 'utf8')).rows;
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5638', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  const en = new Map<string, any>();
  for (const r of (await pool.query('SELECT id::text id, content, md5(content) h, language, status FROM shared_product_descriptions WHERE id = ANY($1::uuid[])', [src.map((x) => x.enDescriptionId)])).rows) en.set(r.id, r);
  const plans: any[] = [], skips: any[] = [];
  for (const r of src) {
    const cur = en.get(r.enDescriptionId);
    if (!cur || cur.language !== 'en' || cur.status !== 'canonical') { skips.push({ id: r.enDescriptionId, code: 'FIELD_UNEXPECTED' }); continue; }
    const before = String(cur.content);
    if (!/<ul class="sd-warn">/.test(before)) { skips.push({ id: r.enDescriptionId, code: 'NO_WARN_LIST' }); continue; }
    const adds: string[] = [], used: string[] = []; let present = 0;
    for (const ko of r.missingKoSentences as string[])
      for (const rule of R) {
        const m = ko.match(rule.re); if (!m) continue;
        const s = rule.en(m);
        if (T(before).includes(s.slice(0, 50))) { present++; break; }
        adds.push(s); used.push(rule.id); break;
      }
    if (!adds.length) { skips.push({ id: r.enDescriptionId, code: present ? 'ALREADY_PRESENT' : 'NO_RULE_MATCH' }); continue; }
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
  fs.writeFileSync(P(`otc-en-omission-restore-v5-${APPLY ? 'apply' : 'dryrun'}.ga.json`),
    JSON.stringify({ summary, plans: plans.map(({ newContent, ...p }) => p), skips, results }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
