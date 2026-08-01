/**
 * KO·EN 동시 손상 18건 — KO 복원 완료 후 **제품별 EN 저작 복원** (dry-run / apply)
 *
 * KO 손상은 이미 공식 원문으로 복원됐다(otc-ko-damage-restore). 남은 것은 EN 측 누락이며,
 * 문형 사전이 덮지 못하는 개별 문장이라 **제품 단위로 하나씩 저작**했다.
 * 번역 기준은 복원된 KO canonical 문장 하나뿐이고, 수치·연령·기간·금기 대상은 그대로 옮겼다.
 * 원문에 없는 의학 정보는 추가하지 않았다.
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
const APPLY = process.argv.includes('--apply') && process.env.OTC_BOTH18_FIX === 'CONFIRM';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** KO 문장 앞부분(키) → 저작한 EN. 제품별 1건씩 사람이 작성했다. */
const AUTHORED: Array<{ key: string; en: string }> = [
  /* 잼플이부펜시럽(이부프로펜) */
  { key: '조절되지 않는 고혈압,울혈심부전증,확립된 허혈성 심장질환',
    en: 'Patients with uncontrolled high blood pressure, congestive heart failure, established ischaemic heart disease, peripheral arterial disease or cerebrovascular disease should avoid high-dose ibuprofen (2,400 mg a day). Patients with cardiovascular risk factors (high blood pressure, hyperlipidaemia, diabetes, smoking and the like) who need high-dose ibuprofen (2,400 mg a day) should consult a doctor or pharmacist before taking this medicine.' },
  { key: '이 약에 과민증,위장관 궤양,위장관 출혈환자',
    en: 'Do not take this medicine if you have or have had hypersensitivity to it, gastrointestinal ulcer or gastrointestinal bleeding, a severe blood disorder, severe liver impairment, severe kidney impairment, severe cardiac insufficiency, severe high blood pressure, or bronchial asthma; if you have or have had a hypersensitivity reaction such as asthma, hives or an allergic reaction to aspirin or other non-steroidal anti-inflammatory analgesics (including COX-2 inhibitors); if you have pain occurring before or after coronary artery bypass grafting (CABG); if you are in the last 3 months of pregnancy; if you are receiving high-dose methotrexate as cancer chemotherapy; or if you have galactose intolerance, Lapp lactase deficiency, or glucose-galactose malabsorption.' },
  { key: '이 약을 복용하기 전에 혈액이상 또는 경험자,출혈경향이 있는 환자',
    en: 'Before taking this medicine, consult a doctor or pharmacist if you have or have had a blood disorder, have a tendency to bleed, have liver cirrhosis, liver impairment or a history of it, kidney impairment or a history of it, cardiac insufficiency, heart disease, high blood pressure, hypersensitivity, systemic lupus erythematosus (SLE), mixed connective tissue disease (MCTD), ulcerative colitis or Crohn\'s disease, or if you are elderly, a child, pregnant, breastfeeding, or have had hypersensitivity or an allergic reaction to Sunset Yellow FCF (Yellow No. 5).' },
  { key: '의사 또는 약사의 지시 없이 통증에 10일 이상',
    en: 'Without the direction of a doctor or pharmacist, do not take it for pain for 10 days or more (adults) or 5 days or more (children), and do not take it for fever for 3 days or more.' },
  /* 위엔젤더블액션현탁액 */
  { key: '7일 동안 복용하여도 증상의 개선이 없을 경우',
    en: 'If there is no improvement in symptoms after taking it for 7 days, stop taking it immediately and consult a doctor or pharmacist.' },
  { key: '테트라사이클린,디곡신,플루오로퀴놀론,철염',
    en: 'When taking it together with tetracycline, digoxin, fluoroquinolones, iron salts, ketoconazole, neuroleptics, thyroxine, penicillamine, beta blockers (atenolol, metoprolol, propranolol), glucocorticoids, chloroquine, estramustine or diphosphonates, leave an interval of at least 2 hours.' },
  /* 영진아스피린장용정 */
  { key: '이 약 또는 다른 살리실산제제 과민증,소화성궤양',
    en: 'Do not take this medicine if you are hypersensitive to it or to other salicylates, or if you have peptic ulcer, aspirin-induced asthma or a history of it, haemophilia, severe liver impairment, severe kidney impairment, severe cardiac insufficiency or a bleeding tendency; if you are receiving methotrexate at 15 mg or more per week; or if you are in the third trimester of pregnancy.' },
  { key: '임신 1기와 2기에는 반드시 필요한 경우가 아니라면',
    en: 'In the first and second trimesters of pregnancy, do not take this medicine unless it is absolutely necessary.' },
  { key: '이 약을 복용하기 전에 신장애,심혈관 순환기능이상',
    en: 'Before taking this medicine, consult a doctor or pharmacist if you have kidney impairment, impaired cardiovascular circulation (renovascular disease, congestive heart failure, fluid depletion, major surgery, sepsis or a major bleeding event), liver impairment, abnormal cardiac function, a blood disorder or a history of it, or bronchial asthma; if you are about to have surgery; if the user is an infant aged 3 years or younger; if you are hypersensitive to analgesics, anti-inflammatory medicines or antirheumatic medicines; if you are elderly; if you have glucose-6-phosphate dehydrogenase (G6PD) deficiency, Reye\'s syndrome, or chickenpox or influenza infection in a person aged 14 years or younger; or if you have gout.' },
  { key: '다른 비스테로이드성 소염진통제 및 살리실산 제제,일주일 동안 메토트렉세이트',
    en: 'Do not use this medicine together with other non-steroidal anti-inflammatory analgesics or salicylates, or with methotrexate at 15 mg or more per week, because bleeding may increase or kidney function may decline.' },
  /* 메코마그빅정 */
  { key: '이 약에 과민증 환자,콩 또는 땅콩에 과민증 환자',
    en: 'Do not take this medicine if you are hypersensitive to it, are hypersensitive to soybean or peanut, have had an allergic reaction to soybean oil, are an infant under 12 months of age, or have severe renal failure.' },
  /* 메가비텐프리미엄정 */
  { key: '이 약에 과민증 환자,고칼슘혈증',
    en: 'Do not take this medicine if you are hypersensitive to it, have hypercalcaemia (an excess of calcium in the blood), sarcoidosis (a systemic inflammatory disease of unknown cause), kidney disease, kidney stones or severe renal failure; if the user is an infant under 12 months of age; or if you have galactose intolerance, Lapp lactase deficiency, or glucose-galactose malabsorption.' },
  /* 쏙코에스연질캡슐 */
  { key: '아세트아미노펜으로 일일 최대 용량(4,000 mg)을 초과하여',
    en: 'Do not take more than the maximum daily dose of acetaminophen (4,000 mg).' },
  { key: '이 약을 복용하기 전에 수두 또는 인플루엔자에 감염되어',
    en: 'Before taking this medicine, consult a doctor or pharmacist if the user is an infant or a child under 15 years of age who has or is suspected of having chickenpox or influenza, an infant under 2 years of age, or a young child; if the user has an allergic constitution or has experienced allergic symptoms (for example fever, rash, joint pain, asthma or itching); if the user has liver disease, kidney disease, heart disease, thyroid disease, diabetes, high blood pressure, gastric or duodenal ulcer, glaucoma (for example eye pain or blurred vision) or difficulty passing urine; if the user is elderly, physically weak or has a high fever; if the user has persistent or recurring stomach problems such as heartburn, stomach discomfort or stomach pain, or has ulcer or bleeding problems; if the user is pregnant or may be pregnant, or is breastfeeding; or if the user smokes or has asthma, chronic bronchitis, emphysema, a cough with excessive phlegm, a cough lasting or recurring for 1 week or more, a chronic cough, or a cough accompanied by fever, rash or persistent headache.' },
];

async function main(): Promise<void> {
  const src: any[] = JSON.parse(fs.readFileSync(P('otc-both18-missing.ga.json'), 'utf8')).rows;
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5602', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  const plans: any[] = [], skips: any[] = [];
  for (const r of src) {
    const cur = (await pool.query('SELECT content, md5(content) h, language, status FROM shared_product_descriptions WHERE id=$1::uuid', [r.enId])).rows[0];
    if (!cur) { skips.push({ id: r.enId, code: 'EN_ROW_MISSING' }); continue; }
    if (cur.h !== r.enHashNow) { skips.push({ id: r.enId, code: 'CONCURRENT_CHANGE_DETECTED' }); continue; }
    if (cur.language !== 'en' || cur.status !== 'canonical') { skips.push({ id: r.enId, code: 'FIELD_UNEXPECTED' }); continue; }
    const before = String(cur.content);
    if (!/<ul class="sd-warn">/.test(before)) { skips.push({ id: r.enId, code: 'NO_WARN_LIST' }); continue; }
    const adds: string[] = [], used: string[] = [];
    for (const ko of r.missingKo as string[]) {
      const hit = AUTHORED.find((a) => ko.startsWith(a.key) || ko.includes(a.key));
      if (!hit) { continue; }
      if (T(before).includes(hit.en.slice(0, 60))) continue;    // 이미 존재
      adds.push(hit.en); used.push(hit.key.slice(0, 24));
    }
    if (!adds.length) { skips.push({ id: r.enId, code: 'NO_AUTHORED_MATCH' }); continue; }
    const at = before.indexOf('</ul>', before.indexOf('<ul class="sd-warn">'));
    const inserted = adds.map((s) => `\n      <li>${esc(s)}</li>`).join('');
    const next = before.slice(0, at) + inserted + '\n    ' + before.slice(at);
    if (next.replace(inserted + '\n    ', '') !== before) { skips.push({ id: r.enId, code: 'DIFF_GUARD_FAILED' }); continue; }
    if ((next.match(/<li>/g) || []).length - (before.match(/<li>/g) || []).length !== adds.length) { skips.push({ id: r.enId, code: 'LI_DELTA_MISMATCH' }); continue; }
    if (/[가-힣]/.test(next)) { skips.push({ id: r.enId, code: 'HANGUL_IN_EN' }); continue; }
    plans.push({ enId: r.enId, master: r.master, product: r.product, oldHash: cur.h, newHash: md5(next), newContent: next, sentences: adds.length, keys: used });
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
  const summary = { mode: APPLY ? 'APPLY' : 'dry-run', input: src.length, planned: plans.length,
    sentencesInserted: plans.reduce((a, p) => a + p.sentences, 0),
    skipped: skips.length, skipByCode: skips.reduce((a: any, s) => { a[s.code] = (a[s.code] || 0) + 1; return a; }, {}),
    green: results.filter((r) => r.status === 'GREEN').length };
  fs.writeFileSync(P(`otc-both18-en-restore-${APPLY ? 'apply' : 'dryrun'}.ga.json`),
    JSON.stringify({ summary, plans: plans.map(({ newContent, ...p }) => p), skips, results }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
