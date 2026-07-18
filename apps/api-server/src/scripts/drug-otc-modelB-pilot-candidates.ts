/**
 * WO 파일럿 재정의 → Model B(grounded 원문 신규 authoring) 첫 파일럿 후보 집계 (read-only)
 *
 * 목적: 무성분명 경구·단일 7,301 을 fingerprint(자기 e약은요 원문 지문)별로 묶어,
 *   가장 단순·안전한 첫 grounded-authoring 파일럿 후보 3개를 커버리지 순으로 제안.
 *
 * 후보 조건(전부 AND): 단일 fingerprint · 동일 원문 · 동일 안전지문 · 단일제 · 경구 · 함량/제형/경로 단일 ·
 *   기존 ko/en canonical 0 · 첨가제/금기/용법 충돌 0 · 원문 확보 100% · 커버리지 순.
 *
 * ⚠️ read-only · DB write 0. target 확정·apply 는 이 보고 후 별도 승인.
 * 입력: otc-global-atc-safety-bridge-groups-v1.json(decided, 92c265035) + DB(e약은요 원문·기존 canonical).
 * 산출: otc-modelB-pilot-candidates-v1.json
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s).normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
function numericSig(s: string): string { const t = normalize(s); const n = (t.match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|정|캡슐|회|시간|일|주|개월|mL|㎖|IU|iu|%)/gi) || []).map((x) => x.replace(/\s+/g, '').toLowerCase()).sort(); return H([...new Set(n)].join('|')); }
function ageSig(s: string): string { const t = normalize(s); const a = (t.match(/(만\s?)?\d+\s*세\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인/g) || []).map((x) => x.replace(/\s+/g, '')).sort(); return H([...new Set(a)].join('|')); }
function durationSig(s: string): string { const t = normalize(s); const d = (t.match(/\d+\s*(주|일|개월|회)\s*(이상|이내|정도|간)?/g) || []).map((x) => x.replace(/\s+/g, '')).sort(); return H([...new Set(d)].join('|')); }
function maxDoseSig(s: string): string { const t = normalize(s); const mx = (t.match(/(1일\s?최대|하루\s?최대|최대)[^,.]{0,20}(\d+[0-9,.]*\s*(mg|밀리그램|정|캡슐|회|㎖|mL))/gi) || []).map((x) => x.replace(/\s+/g, '').toLowerCase()).sort(); return H([...new Set(mx)].join('|')); }
function contraSig(c: string): string { const t = normalize(c); const m = t.match(/(.*?)(복용하지\s?(마|않)|투여하지\s?(마|말)|복용해서는\s?안)/); return H(normalize(m ? m[1] : t.slice(0, 200))); }
function pregnancySig(c: string): string { const t = normalize(c); if (!/임부|임신|수유부/.test(t)) return 'none'; return /임부[^.]{0,20}(복용하지|투여하지|마)|임신[^.]{0,20}(복용하지|마)/.test(t) ? 'ban' : 'consult'; }
function additiveSig(c: string): string { const t = normalize(c); const a: string[] = []; if (/아스파탐|페닐케톤/.test(t)) a.push('aspartame'); if (/대두유|대두레시틴/.test(t)) a.push('soybean'); if (/유당|갈락토/.test(t)) a.push('lactose'); if (/황색\s?\d\s?호|타르색소|타르트라진|선셋옐로우/.test(t)) a.push('dye'); return a.sort().join('+') || 'none'; }
function safety9(dos: string, cau: string, interaction: string): string {
  return [numericSig(dos), ageSig(dos + ' ' + cau), durationSig(dos + ' ' + cau), maxDoseSig(dos), contraSig(cau), pregnancySig(cau), H(normalize(interaction)), additiveSig(cau), 'single'].join(':');
}
function extractSafety(content: string | null): { has: boolean; safety: string; additive: string; contra: string; numeric: string } {
  if (!content) return { has: false, safety: 'NO_EASY', additive: 'NO_EASY', contra: 'NO_EASY', numeric: 'NO_EASY' };
  const sec = sections(content);
  const dos = sec['용법·용량'] || '';
  const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
  const interaction = sec['상호작용'] || '';
  return { has: true, safety: safety9(dos, cau, interaction), additive: additiveSig(cau), contra: contraSig(cau), numeric: numericSig(dos) };
}

type Decided = { master_id: string; name: string; atc_code: string; strength: string; form: string; route: string; fingerprint: string; bucket: string };

async function main(): Promise<void> {
  const decided: Decided[] = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'otc-global-atc-safety-bridge-groups-v1.json'), 'utf8')).decided;
  const universe = decided; // 무성분명 경구·단일 7,301

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const ids = [...new Set(universe.map((d) => d.master_id))].sort();
  const rows: Array<{ mid: string; content: string | null; ko: number; en: number }> = await ds.query(`
    SELECT pm.id::text mid,
      (SELECT es.content FROM shared_product_descriptions es WHERE es.master_id=pm.id AND es.source_type='mfds_easy_drug' AND es.description_type='STORE' AND es.status='canonical' AND es.deleted_at IS NULL ORDER BY length(es.content) DESC LIMIT 1) content,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) ko,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) en
    FROM product_masters pm WHERE pm.id::text = ANY($1)
  `, [ids]);
  await ds.destroy();
  const info = new Map(rows.map((r) => [r.mid, { ...r, sig: extractSafety(r.content) }]));

  // fingerprint 그룹화 + 그룹 내 검증
  const byFp = new Map<string, Decided[]>();
  for (const d of universe) (byFp.get(d.fingerprint) ?? byFp.set(d.fingerprint, []).get(d.fingerprint)!).push(d);

  const groups = [...byFp.entries()].map(([fp, members]) => {
    const buckets: Record<string, number> = {}; for (const m of members) buckets[m.bucket] = (buckets[m.bucket] || 0) + 1;
    const sigs = members.map((m) => info.get(m.master_id)!.sig);
    const withEasy = sigs.filter((s) => s.has).length;
    const distinctSafety = new Set(sigs.map((s) => s.safety)).size;
    const distinctAdditive = new Set(sigs.map((s) => s.additive)).size;
    const distinctContra = new Set(sigs.map((s) => s.contra)).size;
    const distinctNumeric = new Set(sigs.map((s) => s.numeric)).size;
    const existingCanon = members.filter((m) => { const c = info.get(m.master_id)!; return c.ko > 0 || c.en > 0; }).length;
    const strengths = [...new Set(members.map((m) => m.strength))];
    const forms = [...new Set(members.map((m) => m.form))];
    const routes = [...new Set(members.map((m) => m.route))];
    const atcs = [...new Set(members.map((m) => m.atc_code).filter(Boolean))];
    const safetyCorroborated = buckets['ATC후보+안전지문일치'] || 0;
    const 원문확보율 = members.length ? +(withEasy / members.length * 100).toFixed(1) : 0;
    // 첫 파일럿 clean 조건: 기존 canonical 0 · 단일 함량/제형/경로 · 그룹 내 안전/첨가제/금기/용법 동일 · 원문 100%
    const conflict0 = distinctSafety === 1 && distinctAdditive === 1 && distinctContra === 1 && distinctNumeric === 1;
    const cleanForPilot = existingCanon === 0 && strengths.length === 1 && forms.length === 1 && routes.length === 1 && withEasy === members.length && conflict0;
    return {
      fingerprint: fp, masters: members.length,
      strength: strengths.length === 1 ? strengths[0] : strengths, form: forms.length === 1 ? forms[0] : forms, route: routes.length === 1 ? routes[0] : routes,
      atcCodes: atcs, buckets, safetyCorroborated, fullyCorroborated: safetyCorroborated === members.length,
      원문확보율, distinctSafety, distinctAdditive, distinctContra, distinctNumeric, conflict0, existingCanon, cleanForPilot,
      예상: { ko_needs_review_INSERT: members.length - existingCanon, en_needs_review_INSERT: members.length - existingCanon, ko_canonical_flip: members.length - existingCanon, en_canonical_flip: members.length - existingCanon },
      sampleNames: [...new Set(members.map((m) => m.name))].slice(0, 5),
      masterIds: members.map((m) => m.master_id).sort(),
    };
  }).sort((a, b) => b.masters - a.masters);

  // 추천 = clean + 안전 corroboration 있음, 커버리지 순 상위 3
  const clean = groups.filter((g) => g.cleanForPilot);
  const cleanCorroborated = clean.filter((g) => g.safetyCorroborated > 0).sort((a, b) => b.masters - a.masters || b.safetyCorroborated - a.safetyCorroborated);
  const top3 = cleanCorroborated.slice(0, 3);

  const summary = {
    wo: 'Model B(grounded 원문 신규 authoring) 첫 파일럿 후보 집계', dbWrite: 0, readOnly: true,
    총_무성분명대상: universe.length, 총_fingerprint그룹: groups.length,
    singleton그룹: groups.filter((g) => g.masters === 1).length,
    기존canonical보유_master: [...info.values()].filter((c) => c.ko > 0 || c.en > 0).length,
    clean_후보그룹수: clean.length, clean_corroborated_수: cleanCorroborated.length,
    추천_top3: top3.map((g) => ({
      fingerprint: g.fingerprint, atcCodes: g.atcCodes, masters: g.masters, strength: g.strength, form: g.form, route: g.route,
      원문확보율: g.원문확보율, 안전지문일치_corroborated: g.safetyCorroborated, fullyCorroborated: g.fullyCorroborated,
      그룹내_안전동일: g.distinctSafety === 1, 첨가제금기용법_충돌: g.distinctAdditive - 1 + (g.distinctContra - 1) + (g.distinctNumeric - 1),
      기존canonical: g.existingCanon, 예상: g.예상, sample: g.sampleNames, rollback_master_ids: g.masterIds,
    })),
    clean_corroborated_top15: cleanCorroborated.slice(0, 15).map((g) => ({ fingerprint: g.fingerprint, masters: g.masters, atc: g.atcCodes, strength: g.strength, form: g.form, corroborated: g.safetyCorroborated, sample: g.sampleNames[0] })),
    전체_커버리지_top10: groups.slice(0, 10).map((g) => ({ fingerprint: g.fingerprint, masters: g.masters, cleanForPilot: g.cleanForPilot, corroborated: g.safetyCorroborated, existingCanon: g.existingCanon, 원문확보율: g.원문확보율, buckets: g.buckets, sample: g.sampleNames[0] })),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'otc-modelB-pilot-candidates-v1.json'), JSON.stringify({ ...summary, allGroups: groups }, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
