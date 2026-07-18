/**
 * WO-O4O-OTC-CANONICAL-APPLY-PILOT-B01AC06-V1 → 중단·재검토 후속 감사
 *
 * 목적: apply 후보 338제품(ATC후보+안전지문일치) / 25 atc-key 전수에 대해, 진짜 Model A
 *   (기존 authored 대표 설명서를 그대로 재사용 가능) 후보가 존재하는지 read-only 집계.
 *   존재하면 제품 커버리지 순으로 정렬해 가장 큰 단일 fingerprint 그룹을 새 첫 파일럿으로 제안.
 *
 * ⚠️ read-only · DB write 0.
 *
 * 핵심 판정 — "authored 대표와 grounded 원문 완전 일치":
 *   ① authored 대표(source_ref_id → master) 가 e약은요 원문을 보유할 것(hasEasy).
 *   ② authored 대표의 원문 텍스트 서명(효능·용법·주의 = contentSig) 이 대상의 contentSig 와 동일할 것.
 *      ※ fingerprint 는 성분 서명(ingredient|strength)을 포함 → 무성분명 대상 vs 명명 authored 는
 *        원문 동일이어도 fingerprint 불일치. 따라서 '원문 완전 일치'는 contentSig(성분 무관) 로 판정.
 *   ③ 안전지문 일치(모집단이 이미 ATC후보+안전지문일치 → 충족).
 *   ④ 대상에 기존 ko/en canonical 없음(충돌 0).
 *
 * 산출: otc-apply-modelA-candidate-audit-v1.json
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s).normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
function numericSig(s: string): string { const t = normalize(s); const n = (t.match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|정|캡슐|회|시간|일|주|개월|mL|㎖|IU|iu|%)/gi) || []).map((x) => x.replace(/\s+/g, '').toLowerCase()).sort(); return H([...new Set(n)].join('|')); }
function ageSig(s: string): string { const t = normalize(s); const a = (t.match(/(만\s?)?\d+\s*세\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인/g) || []).map((x) => x.replace(/\s+/g, '')).sort(); return H([...new Set(a)].join('|')); }
function durationSig(s: string): string { const t = normalize(s); const d = (t.match(/\d+\s*(주|일|개월|회)\s*(이상|이내|정도|간)?/g) || []).map((x) => x.replace(/\s+/g, '')).sort(); return H([...new Set(d)].join('|')); }
function maxDoseSig(s: string): string { const t = normalize(s); const mx = (t.match(/(1일\s?최대|하루\s?최대|최대)[^,.]{0,20}(\d+[0-9,.]*\s*(mg|밀리그램|정|캡슐|회|㎖|mL))/gi) || []).map((x) => x.replace(/\s+/g, '').toLowerCase()).sort(); return H([...new Set(mx)].join('|')); }
function contraSig(c: string): string { const t = normalize(c); const m = t.match(/(.*?)(복용하지\s?(마|않)|투여하지\s?(마|말)|복용해서는\s?안)/); return H(normalize(m ? m[1] : t.slice(0, 200))); }
function pregnancySig(c: string): string { const t = normalize(c); if (!/임부|임신|수유부/.test(t)) return 'none'; return /임부[^.]{0,20}(복용하지|투여하지|마)|임신[^.]{0,20}(복용하지|마)/.test(t) ? 'ban' : 'consult'; }
function additiveSig(c: string): string { const t = normalize(c); const a: string[] = []; if (/아스파탐|페닐케톤/.test(t)) a.push('aspartame'); if (/대두유|대두레시틴/.test(t)) a.push('soybean'); if (/유당|갈락토/.test(t)) a.push('lactose'); if (/황색\s?\d\s?호|타르색소|타르트라진|선셋옐로우/.test(t)) a.push('dye'); return a.sort().join('+') || 'none'; }
function routeSig(name: string): string {
  if (/질정|질좌|질내정|질\s?삽입/.test(name)) return 'vaginal';
  if (/좌약|좌제/.test(name)) return 'rectal';
  if (/점안|안연고/.test(name)) return 'ophthalmic';
  if (/점이액|귀에/.test(name)) return 'otic';
  if (/점비|비강/.test(name)) return 'nasal';
  if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical';
  if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral';
  return 'unknown';
}
function derive(name: string, spec: string) {
  const ingredient = (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
  const strength = (spec || '').split(' / ')[0].trim();
  const form = /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림' : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽' : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
  const multiIngredient = /[·,]/.test(ingredient) || (name.match(/[·]/g) || []).length >= 2;
  const route = routeSig(name);
  return { ingredient, strength, form, route, multiIngredient, nonOral: route !== 'oral' };
}
/** 원문 텍스트 서명(성분 무관) = 효능·용법·주의 정규화 해시. Model A 원문 완전 일치 판정 키. */
function contentSigOf(content: string): { contentSig: string; safety: string } {
  const sec = sections(content);
  const ind = sec['효능·효과'] || '', dos = sec['용법·용량'] || '';
  const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
  const interaction = sec['상호작용'] || '';
  const d0 = derive('', ''); // multi 판정 불가한 원문 단독 — safety 는 아래에서 대상 derive 로 재계산
  void d0;
  const contentSig = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau))].join('|'));
  const safety = [numericSig(dos), ageSig(dos + ' ' + cau), durationSig(dos + ' ' + cau), maxDoseSig(dos), contraSig(cau), pregnancySig(cau), H(normalize(interaction)), additiveSig(cau), 'single'].join(':');
  return { contentSig, safety };
}

async function main(): Promise<void> {
  // 재계산 산출(92c265035)의 안전일치 대상 로드
  const decided: Array<{ master_id: string; name: string; atc_code: string; strength: string; form: string; route: string; fingerprint: string; bucket: string; authoredRefs: string[] }> =
    JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'otc-global-atc-safety-bridge-groups-v1.json'), 'utf8')).decided;
  const targets = decided.filter((d) => d.bucket === 'ATC후보+안전지문일치');

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();

  // 대상 master 의 e약은요 원문 + 기존 canonical (contentSig 재계산·충돌 확인)
  const tgtIds = [...new Set(targets.map((t) => t.master_id))].sort();
  const tgtRows: Array<{ mid: string; content: string; ko_canon: number; en_canon: number }> = await ds.query(`
    SELECT pm.id::text mid,
      (SELECT es.content FROM shared_product_descriptions es WHERE es.master_id=pm.id AND es.source_type='mfds_easy_drug' AND es.description_type='STORE' AND es.status='canonical' AND es.deleted_at IS NULL ORDER BY length(es.content) DESC LIMIT 1) content,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) ko_canon,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) en_canon
    FROM product_masters pm WHERE pm.id::text = ANY($1)
  `, [tgtIds]);
  const tgtMap = new Map(tgtRows.map((r) => [r.mid, r]));

  // authored 대표(source_ref_id) → master → e약은요 보유 여부 + contentSig
  const refIds = [...new Set(targets.flatMap((t) => t.authoredRefs))].sort();
  const repRows: Array<{ ref: string; mid: string; content: string | null }> = await ds.query(`
    SELECT s.source_ref_id::text ref, s.master_id::text mid,
      (SELECT es.content FROM shared_product_descriptions es WHERE es.master_id=s.master_id AND es.source_type='mfds_easy_drug' AND es.description_type='STORE' AND es.status='canonical' AND es.deleted_at IS NULL ORDER BY length(es.content) DESC LIMIT 1) content
    FROM shared_product_descriptions s
    WHERE s.source_ref_id::text = ANY($1) AND s.description_type='STORE' AND s.deleted_at IS NULL
    GROUP BY s.source_ref_id, s.master_id
  `, [refIds]);
  // ref → { masters, hasEasy 수, contentSigs }
  const refInfo = new Map<string, { masters: number; hasEasy: number; contentSigs: Set<string> }>();
  for (const r of repRows) {
    const e = refInfo.get(r.ref) ?? refInfo.set(r.ref, { masters: 0, hasEasy: 0, contentSigs: new Set() }).get(r.ref)!;
    e.masters += 1;
    if (r.content) { e.hasEasy += 1; e.contentSigs.add(contentSigOf(r.content).contentSig); }
  }

  // atc-key 별 집계
  const byAtc = new Map<string, typeof targets>();
  for (const t of targets) { const k = `${t.atc_code}|${t.strength}|${t.form}|${t.route}`; (byAtc.get(k) ?? byAtc.set(k, []).get(k)!).push(t); }

  const atcReport = [...byAtc.entries()].map(([atcKey, members]) => {
    const refs = [...new Set(members.flatMap((m) => m.authoredRefs))];
    const repHasEasy = refs.some((r) => (refInfo.get(r)?.hasEasy ?? 0) > 0);
    const repContentSigs = new Set<string>(); for (const r of refs) for (const s of refInfo.get(r)?.contentSigs ?? []) repContentSigs.add(s);
    // 대상 contentSig 재계산 + fingerprint 그룹
    const byFp = new Map<string, { masters: string[]; contentSigs: Set<string>; existingCanon: number }>();
    for (const m of members) {
      const tr = tgtMap.get(m.master_id);
      const cs = tr?.content ? contentSigOf(tr.content).contentSig : 'NO_EASY';
      const g = byFp.get(m.fingerprint) ?? byFp.set(m.fingerprint, { masters: [], contentSigs: new Set(), existingCanon: 0 }).get(m.fingerprint)!;
      g.masters.push(m.master_id); g.contentSigs.add(cs);
      if ((tr?.ko_canon ?? 0) > 0 || (tr?.en_canon ?? 0) > 0) g.existingCanon += 1;
    }
    const fpGroups = [...byFp.entries()].map(([fp, g]) => {
      // Model A: authored 대표 e약은요 보유 + 원문(contentSig) 완전 일치 + 기존 canonical 0
      const 원문완전일치 = repHasEasy && [...g.contentSigs].every((s) => s !== 'NO_EASY' && repContentSigs.has(s));
      const modelA = 원문완전일치 && g.existingCanon === 0;
      return { fingerprint: fp, masters: g.masters.length, distinctContentSigs: g.contentSigs.size, existingCanon: g.existingCanon, 원문완전일치, modelA, masterIds: g.masters.sort() };
    }).sort((a, b) => b.masters - a.masters);
    return {
      atcKey, targetMasters: members.length, authoredRefs: refs, authoredRep_hasEasy: repHasEasy,
      authoredRep_contentSigCount: repContentSigs.size,
      modelA_viable: fpGroups.some((f) => f.modelA),
      fpGroups,
    };
  }).sort((a, b) => b.targetMasters - a.targetMasters);

  // Model A 후보 fingerprint 그룹 커버리지 순
  const modelACandidates = atcReport.flatMap((a) => a.fpGroups.filter((f) => f.modelA).map((f) => ({ atcKey: a.atcKey, fingerprint: f.fingerprint, masters: f.masters })))
    .sort((a, b) => b.masters - a.masters);

  const summary = {
    wo: 'WO-O4O-OTC-CANONICAL-APPLY-PILOT — 중단·재검토 후속 Model A 감사', dbWrite: 0, readOnly: true,
    기준: 'ATC후보+안전지문일치 338제품 / 25 atc-key. Model A = authored 대표 e약은요 보유 + 원문(contentSig, 성분무관) 완전 일치 + 기존 canonical 0.',
    총_안전일치_대상: targets.length,
    atc_key_수: byAtc.size,
    authored대표_e약은요보유_atc_key수: atcReport.filter((a) => a.authoredRep_hasEasy).length,
    modelA_viable_atc_key수: atcReport.filter((a) => a.modelA_viable).length,
    modelA_후보_fingerprint그룹: modelACandidates,
    제안_새첫파일럿: modelACandidates[0] ?? null,
    atcReport,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'otc-apply-modelA-candidate-audit-v1.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify({
    총대상: targets.length, atcKey수: byAtc.size,
    authored대표_e약은요보유_atcKey수: summary['authored대표_e약은요보유_atc_key수'],
    modelA_viable_atcKey수: summary['modelA_viable_atc_key수'],
    modelA후보수: modelACandidates.length,
    제안: summary['제안_새첫파일럿'],
    top: modelACandidates.slice(0, 10),
  }, null, 2));
  await ds.destroy();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
