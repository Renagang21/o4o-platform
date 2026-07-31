/**
 * EN 정보 누락 복원 — KO 에 있으나 EN 에서 빠진 **안전·주의 문장**을 최소 삽입 (dry-run / apply)
 *
 * 원칙
 *   · 번역 기준은 KO 문장 하나뿐. 수치·연령·기간 슬롯은 KO 값을 그대로 옮긴다.
 *   · KO 문장이 있던 **같은 섹션**(주의 목록 → `<li>`)에만 삽입한다.
 *   · 허용 변경은 "문장 1개 삽입"뿐. 역패치 byte 일치로 그 외 변경 0 을 증명한다.
 *   · 사전이 덮지 못하는 문장은 건드리지 않는다(REVIEW_REQUIRED).
 *
 * 사전은 **문형별 1건**이며 슬롯만 KO 에서 채운다(원문에 없는 정보 추가 0).
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
const APPLY = process.argv.includes('--apply') && process.env.OTC_EN_OMISSION_FIX === 'CONFIRM';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** KO 문형 → EN 문장. 슬롯은 KO 수치를 그대로 쓴다. */
const RULES: Array<{ id: string; re: RegExp; en: (m: RegExpMatchArray) => string }> = [
  { id: 'CULTURE_TEST_AFTER_WEEKS',
    re: /남아 있는 활성성분이 배양결과에 영향을 주는 것을 피하기 위해 배양검사는 치료가 끝난 후\s*(\d+)\s*주 후에 합니다/,
    en: (m) => `To avoid the remaining active ingredient affecting culture results, carry out culture tests ${m[1]} weeks after the end of treatment.` },
  { id: 'RELIEF_AND_TREATMENT_PERIOD',
    re: /증상의 경감은 통상\s*(\d+)\s*[~,-]\s*(\d+)\s*일 이내에 나타나나 보통 치료기간은\s*(\d+)\s*주일입니다/,
    en: (m) => `Symptom relief usually appears within ${m[1]} to ${m[2]} days, and the usual treatment period is ${m[3]} weeks.` },
  { id: 'NO_CONTINUOUS_USE_DAYS',
    re: /^(\d+)\s*일 이상 계속 사용하지 마십시오/,
    en: (m) => `Do not use it continuously for ${m[1]} days or more.` },
  { id: 'CONTRA_HYPERSENS_PREG_CHILD',
    re: /이 약에 과민증 환자,\s*임부 또는 임신하고 있을 가능성이 있는 여성 및 수유부,\s*(?:만\s*)?(\d+)\s*세 미만 소아는 이 약을 사용하지 마십시오/,
    en: (m) => `Do not use this medicine if you are hypersensitive to it, are pregnant or may be pregnant, are breastfeeding, or are a child under ${m[1]} years of age.` },
  { id: 'NO_IMPROVEMENT_DAYS_RANGE',
    re: /(\d+)\s*[~,-]\s*(\d+)\s*일(?:간|\s*정도)?\s*사용하여도 증상의 개선이 없을 경우 사용을 즉각 중지하고 의사 또는 약사와 상의하십시오/,
    en: (m) => `If there is no improvement in symptoms after using it for ${m[1]} to ${m[2]} days, stop using it immediately and consult a doctor or pharmacist.` },
  { id: 'ONLY_CHILDREN_OVER_AGE',
    re: /만\s*(\d+)\s*세 이상의 어린이 및 성인만 사용하십시오/,
    en: (m) => `Use it only in children aged ${m[1]} years and over and in adults.` },
  { id: 'PREG_MONTHS_NO_TAKE',
    re: /임신\s*(\d+)\s*개월 이내 또는 임신하고 있을 가능성이 있는 여성은 복용하지 마십시오/,
    en: (m) => `Women within ${m[1]} months of pregnancy or who may be pregnant must not take this medicine.` },
  { id: 'ELDERLY_EDEMA_THYROID_CONSULT',
    re: /이 약을 사용하기 전에 고령자\((\d+)\s*세 이상\),\s*부종\(부기\),\s*갑상샘 기능 장애[^.]*는 의사 또는 약사와 상의하십시오/,
    en: (m) => `Before using this medicine, elderly people (${m[1]} years and over) and patients with edema (swelling) or thyroid dysfunction (hypothyroidism or hyperthyroidism) should consult a doctor or pharmacist.` },
  { id: 'NO_IMPROVEMENT_TIMES_RANGE',
    re: /(\d+)\s*[~,-]\s*(\d+)\s*회 사용하여도 증상의 개선이 없을 경우 사용을 즉각 중지하고 의사 또는 약사와 상의하십시오/,
    en: (m) => `If there is no improvement in symptoms after using it ${m[1]} to ${m[2]} times, stop using it immediately and consult a doctor or pharmacist.` },
  { id: 'CONSULT_IF_OVER_DAYS_ORAL',
    re: /(\d+)\s*일 이상 계속 복용이 필요한 사람은 의사 또는 약사와 상의하십시오/,
    en: (m) => `If you need to take it continuously for ${m[1]} days or more, consult a doctor or pharmacist.` },
];

interface Plan { enId: string; koId: string; masterId: string; ruleIds: string[]; sentences: string[]; oldHash: string; newHash: string; newContent: string }

async function main(): Promise<void> {
  const src: any[] = JSON.parse(fs.readFileSync(P('otc-en-omission-extract.ga.json'), 'utf8')).rows;
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5590', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  const en = new Map<string, any>();
  const ids = src.map((r) => r.enDescriptionId);
  for (let i = 0; i < ids.length; i += 400)
    for (const r of (await pool.query('SELECT id::text id, content, md5(content) h, language, status FROM shared_product_descriptions WHERE id = ANY($1::uuid[])', [ids.slice(i, i + 400)])).rows) en.set(r.id, r);

  const plans: Plan[] = [], skips: any[] = [];
  for (const r of src) {
    const cur = en.get(r.enDescriptionId);
    if (!cur) { skips.push({ id: r.enDescriptionId, code: 'EN_ROW_MISSING' }); continue; }
    if (cur.h !== r.enHash) { skips.push({ id: r.enDescriptionId, code: 'CONCURRENT_CHANGE_DETECTED' }); continue; }
    if (cur.language !== 'en' || cur.status !== 'canonical') { skips.push({ id: r.enDescriptionId, code: 'FIELD_UNEXPECTED' }); continue; }
    const before = String(cur.content);
    if (!/<ul class="sd-warn">/.test(before)) { skips.push({ id: r.enDescriptionId, code: 'NO_WARN_LIST' }); continue; }

    const adds: string[] = [], rules: string[] = [];
    for (const ko of r.missingKoSentences as string[]) {
      for (const rule of RULES) {
        const m = ko.match(rule.re);
        if (!m) continue;
        const sentence = rule.en(m);
        if (T(before).includes(sentence)) break;            // 이미 존재 → 삽입하지 않는다
        adds.push(sentence); rules.push(rule.id); break;
      }
    }
    if (!adds.length) { skips.push({ id: r.enDescriptionId, code: 'NO_RULE_MATCH' }); continue; }

    const at = before.indexOf('</ul>', before.indexOf('<ul class="sd-warn">'));
    const inserted = adds.map((s) => `\n      <li>${esc(s)}</li>`).join('');
    const next = before.slice(0, at) + inserted + '\n    ' + before.slice(at);
    /* 가드: 삽입 리터럴만 되돌리면 원문과 byte 일치 */
    if (next.replace(inserted + '\n    ', '') !== before) { skips.push({ id: r.enDescriptionId, code: 'DIFF_GUARD_FAILED' }); continue; }
    if ((next.match(/<li>/g) || []).length - (before.match(/<li>/g) || []).length !== adds.length) { skips.push({ id: r.enDescriptionId, code: 'LI_DELTA_MISMATCH' }); continue; }
    if (/[가-힣]/.test(next)) { skips.push({ id: r.enDescriptionId, code: 'HANGUL_IN_EN' }); continue; }
    for (const [o, c] of [[/<ul[\s>]/g, /<\/ul>/g], [/<li>/g, /<\/li>/g], [/<div[\s>]/g, /<\/div>/g]] as any)
      if ((next.match(o) || []).length !== (next.match(c) || []).length) { skips.push({ id: r.enDescriptionId, code: 'HTML_BROKEN' }); }
    if (skips.length && skips[skips.length - 1].id === r.enDescriptionId) continue;
    plans.push({ enId: r.enDescriptionId, koId: r.koDescriptionId, masterId: r.masterId, ruleIds: rules, sentences: adds, oldHash: cur.h, newHash: md5(next), newContent: next });
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
  for (const p of plans) for (const r of p.ruleIds) byRule[r] = (byRule[r] || 0) + 1;
  const summary = { mode: APPLY ? 'APPLY' : 'dry-run', input: src.length, planned: plans.length,
    sentencesInserted: plans.reduce((a, p) => a + p.sentences.length, 0), byRule,
    skipped: skips.length, skipByCode: skips.reduce((a: any, s) => { a[s.code] = (a[s.code] || 0) + 1; return a; }, {}),
    green: results.filter((r) => r.status === 'GREEN').length,
    concurrent: results.filter((r) => r.status !== 'GREEN').length };
  fs.writeFileSync(P(`otc-en-omission-restore-${APPLY ? 'apply' : 'dryrun'}.ga.json`),
    JSON.stringify({ summary, plans: plans.map(({ newContent, ...p }) => p), skips, results }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
