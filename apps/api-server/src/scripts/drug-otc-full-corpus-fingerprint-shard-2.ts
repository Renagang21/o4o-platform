/**
 * WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-AUDIT-3-AGENT-V1 — 에이전트 다 (shard = 2)
 *
 * 원문 확보 OTC(regulatory_type=DRUG · drug_category=otc · e약은요 STORE canonical 보유)를
 * shard = uint32(first8hex(md5(item_seq))) % 3 로 3분할, shard==2 만 분석. read-only(DB write 0).
 *
 * 원문 = e약은요 SPD content(pde 텍스트 미populate 확인). 원문 지문/정규화 지문/안전 지문 → Tier 1~5.
 * 정규화: HTML·공백·목록기호·문장부호변형·전각/NFC 만 제거. 숫자·함량·횟수·연령·기간·금기·첨가제·경로·제형·성분 보존.
 *
 * shard 0(에이전트 가) 로직·판정 기준 계승(md5 결정론 동일). shard 0 파일 미수정.
 * 추가: canonical 6-버킷 상세 · authored bridge(4구획, 안전지문 대조) · 무성분명 ATC bridge(5구획).
 *
 * 산출: otc-fingerprint-shard-2-{summary,groups,exceptions,bridge}-v1.json.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SHARD = 2;
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

/** e약은요 content → 섹션 맵 */
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
/** 정규화: 태그·공백·목록기호·문장부호변형·전각/NFC 제거, 핵심(숫자·연령·용량 등) 보존 */
function normalize(s: string): string {
  return stripTags(s)
    .normalize('NFKC') // 전각→반각 + 호환문자
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',') // 목록/구분 기호 → ,
    .replace(/^\s*\d+\)\s*/gm, '') // 1) 2) 목록 번호
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim();
}
/** 숫자+단위 신호(용량·횟수·간격·최대) */
function numericSig(s: string): string {
  const t = normalize(s);
  const nums = (t.match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|정|캡슐|회|시간|일|주|개월|mL|㎖|IU|iu|%)/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()).sort();
  return H([...new Set(nums)].join('|'));
}
function ageSig(s: string): string {
  const t = normalize(s);
  const a = (t.match(/(만\s?)?\d+\s*세\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인/g) || [])
    .map((x) => x.replace(/\s+/g, '')).sort();
  return H([...new Set(a)].join('|'));
}
function durationSig(s: string): string {
  const t = normalize(s);
  const d = (t.match(/\d+\s*(주|일|개월|회)\s*(이상|이내|정도|간)?/g) || []).map((x) => x.replace(/\s+/g, '')).sort();
  return H([...new Set(d)].join('|'));
}
function contraSig(caution: string): string {
  const t = normalize(caution);
  // 금기 절: "복용하지 (마|않)" 앞 구간 토큰
  const m = t.match(/(.*?)(복용하지\s?(마|않)|투여하지\s?(마|말)|복용해서는\s?안)/);
  return H(normalize(m ? m[1] : t.slice(0, 200)));
}
function pregnancySig(caution: string): string {
  const t = normalize(caution);
  const preg = /임부|임신|수유부/.test(t);
  if (!preg) return 'none';
  const ban = /임부[^.]{0,20}(복용하지|투여하지|마)|임신[^.]{0,20}(복용하지|마)/.test(t);
  return ban ? 'ban' : 'consult';
}
function additiveSig(caution: string): string {
  const t = normalize(caution);
  const a: string[] = [];
  if (/아스파탐|페닐케톤/.test(t)) a.push('aspartame');
  if (/대두유|대두레시틴/.test(t)) a.push('soybean');
  if (/유당|갈락토/.test(t)) a.push('lactose');
  if (/황색\s?\d\s?호|타르색소|타르트라진|선셋옐로우/.test(t)) a.push('dye');
  return a.sort().join('+') || 'none';
}
/** 투여경로 = 제형(name) 기반 전수. 증상 키워드로 판정하지 않음. ⚠️`연질캡슐`이 `질캡슐`에 오매칭되지 않도록 vaginal 은 질정/질좌/질내만. */
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
/** name·spec 에서 성분·함량·제형·경로 파생(grounded·authored 동일 로직으로 bridgeKey 일치 보장) */
function derive(name: string, spec: string): { ingredient: string; strength: string; form: string; route: string; multiIngredient: boolean; nonOral: boolean } {
  const ingredient = (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
  const strength = (spec || '').split(' / ')[0].trim();
  const form = /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림' : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽' : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
  const multiIngredient = /[·,]/.test(ingredient) || (name.match(/[·]/g) || []).length >= 2;
  const route = routeSig(name);
  return { ingredient, strength, form, route, multiIngredient, nonOral: route !== 'oral' };
}
const bridgeKeyOf = (d: { ingredient: string; strength: string; form: string; route: string }): string => `${d.ingredient}|${d.strength}|${d.form}|${d.route}`;

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  // shard-2 모집단 (원문 확보 OTC) + canonical 6-버킷 상세(master_id 직접 조인) + atc_code
  const rows: Array<{
    master_id: string; item_seq: string; name: string; spec: string; content: string; atc_code: string | null;
    authored_ko_canon: number; authored_en_canon: number; authored_ko_review: number; authored_en_review: number; canon_src: string | null;
  }> = await ds.query(`
    WITH pop AS (
      SELECT DISTINCT pm.id::text master_id, pi.normalized_value item_seq, pm.name, pm.specification spec
      FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
      JOIN product_identifiers pi ON pi.product_master_id=pm.id AND pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
      WHERE pm.regulatory_type='DRUG'
        AND (('x'||substr(md5(pi.normalized_value),1,8))::bit(32)::bigint % 3) = ${SHARD}
    )
    SELECT pop.*, es.content,
      (SELECT e2.atc_code FROM product_drug_extensions e2 WHERE e2.product_master_id=pop.master_id::uuid AND e2.deleted_at IS NULL AND e2.atc_code IS NOT NULL AND e2.atc_code<>'' LIMIT 1) atc_code,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) authored_ko_canon,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) authored_en_canon,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='needs_review' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) authored_ko_review,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='needs_review' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) authored_en_review,
      (SELECT string_agg(DISTINCT s.source_type,',') FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.source_type<>'mfds_easy_drug') canon_src
    FROM pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
  `);

  // authored OTC canonical 코퍼스(전량 — bridge 재사용 대상, shard 비제한). ko 기준 bridgeKey / atc-key 색인.
  const authoredRows: Array<{ mid: string; ref: string | null; name: string; spec: string; atc: string | null }> = await ds.query(`
    SELECT s.master_id::text mid, s.source_ref_id::text ref, pm.name, pm.specification spec,
      (SELECT e.atc_code FROM product_drug_extensions e WHERE e.product_master_id=pm.id AND e.deleted_at IS NULL AND e.atc_code IS NOT NULL AND e.atc_code<>'' LIMIT 1) atc
    FROM shared_product_descriptions s
    JOIN product_masters pm ON pm.id=s.master_id
    WHERE s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.language='ko' AND s.status='canonical'
      AND s.description_type='STORE' AND s.deleted_at IS NULL
  `);

  // === 지문 추출 ===
  const recs: any[] = [];
  const exceptions: any[] = [];
  for (const r of rows) {
    const sec = sections(r.content);
    const ind = sec['효능·효과'] || '';
    const dos = sec['용법·용량'] || '';
    const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
    const d = derive(r.name, r.spec);
    if (!ind && !dos && !cau) { exceptions.push({ master_id: r.master_id, item_seq: r.item_seq, name: r.name, reason: 'parse_fail_no_section' }); continue; }
    const rec = {
      master_id: r.master_id, item_seq: r.item_seq, name: r.name,
      ingredient: d.ingredient, strength: d.strength, form: d.form, route: d.route,
      atc_code: r.atc_code || '',
      authored_ko_canon: r.authored_ko_canon, authored_en_canon: r.authored_en_canon,
      authored_ko_review: r.authored_ko_review, authored_en_review: r.authored_en_review,
      has_canonical: r.authored_ko_canon + r.authored_en_canon, canon_src: r.canon_src,
      raw_full_hash: H(r.content), raw_indication_hash: H(ind), raw_dosage_hash: H(dos), raw_caution_hash: H(cau),
      norm_full_hash: H(normalize(r.content)), norm_ind_hash: H(normalize(ind)), norm_dos_hash: H(normalize(dos)), norm_cau_hash: H(normalize(cau)),
      ingredient_strength_signature: H(`${d.ingredient}|${d.strength}`), dose_form_signature: H(d.form), route_signature: d.route,
      dosage_numeric_signature: numericSig(dos), age_signature: ageSig(dos + ' ' + cau), duration_signature: durationSig(dos + ' ' + cau),
      contraindication_signature: contraSig(cau), pregnancy_signature: pregnancySig(cau), interaction_signature: H(normalize(sec['상호작용'] || '')), allergy_additive_signature: additiveSig(cau),
      multiIngredient: d.multiIngredient, nonOral: d.nonOral,
    };
    // 안전 지문(6요소 결합) — bridge 대조에 재사용
    (rec as any).safety_signature = [rec.dosage_numeric_signature, rec.age_signature, rec.duration_signature, rec.contraindication_signature, rec.pregnancy_signature, rec.allergy_additive_signature].join(':');
    recs.push(rec);
  }

  // === 그룹화(shard 0 동일 키) ===
  const groupKey = (x: any): string => H([x.norm_ind_hash, x.norm_dos_hash, x.norm_cau_hash, x.ingredient_strength_signature, x.dose_form_signature, x.route_signature].join('|'));
  const groups = new Map<string, any[]>();
  for (const r of recs) { const k = groupKey(r); (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }

  function tierOf(members: any[]): string {
    if (members.some((m) => m.nonOral || m.multiIngredient)) return 'Tier5';
    const rawSet = new Set(members.map((m) => m.raw_full_hash));
    const normSet = new Set(members.map((m) => m.norm_full_hash));
    const safe = new Set(members.map((m) => m.safety_signature));
    if (safe.size > 1) return 'Tier4';
    if (rawSet.size === 1) return 'Tier1';
    if (normSet.size === 1) return 'Tier2';
    return 'Tier3';
  }

  // === authored bridge 색인(성분|함량|제형|경로) ===
  const authoredBridge = new Map<string, { masters: Set<string>; refs: Set<string> }>();
  const authoredAtc = new Map<string, { masters: Set<string>; refs: Set<string> }>(); // atc|함량|제형|경로
  for (const a of authoredRows) {
    const d = derive(a.name, a.spec);
    if (d.ingredient) { // 무성분명 authored 는 bridgeKey 제외(이질약 과병합 방지)
      const bk = bridgeKeyOf(d);
      const e = authoredBridge.get(bk) ?? authoredBridge.set(bk, { masters: new Set(), refs: new Set() }).get(bk)!;
      e.masters.add(a.mid); if (a.ref) e.refs.add(a.ref);
    }
    if (a.atc) {
      const ak = `${a.atc}|${d.strength}|${d.form}|${d.route}`;
      const e = authoredAtc.get(ak) ?? authoredAtc.set(ak, { masters: new Set(), refs: new Set() }).get(ak)!;
      e.masters.add(a.mid); if (a.ref) e.refs.add(a.ref);
    }
  }

  // === grounded 내 named atc-key 색인(무성분명 ATC bridge 안전지문 대조용, shard-local) ===
  //  성분명 있는 경구·단일제만 후보 identity 로 사용(무성분명 → 성분 identity 차용).
  const groundedNamedAtc = new Map<string, { safetySigs: Set<string>; sample: string; masters: Set<string> }>();
  for (const r of recs) {
    if (r.nonOral || r.multiIngredient || !r.ingredient || !r.atc_code) continue;
    const ak = `${r.atc_code}|${r.strength}|${r.form}|${r.route}`;
    const e = groundedNamedAtc.get(ak) ?? groundedNamedAtc.set(ak, { safetySigs: new Set(), sample: r.name, masters: new Set() }).get(ak)!;
    e.safetySigs.add(r.safety_signature); e.masters.add(r.master_id);
  }

  // === 그룹 리스트 + bridge 판정 ===
  const groupList = [...groups.entries()].map(([k, members]) => {
    const m0 = members[0];
    const bk = bridgeKeyOf(m0);
    const nonOralGroup = members.some((m) => m.nonOral || m.multiIngredient);
    const noIngredient = !m0.ingredient;
    // 4구획 extendability
    let extendability: string;
    let authoredRefs: string[] = [];
    let authoredMasters = 0;
    if (nonOralGroup) extendability = '비경구-별도트랙';
    else if (noIngredient) extendability = '주성분코드필요(무성분명)';
    else if (authoredBridge.has(bk)) {
      extendability = '검토후확장후보';
      const ab = authoredBridge.get(bk)!;
      authoredRefs = [...ab.refs]; authoredMasters = ab.masters.size;
    } else extendability = '새설명서필요';
    // 안전지문 대조: 같은 bridgeKey grounded 멤버 간 안전 지문 분열 수(1=일관, >1=검토후 분리 필요)
    const safetyVariants = new Set(members.map((m) => m.safety_signature)).size;
    return {
      fingerprint: k, tier: tierOf(members), size: members.length,
      bridgeKey: bk, ingredient: m0.ingredient, strength: m0.strength, form: m0.form, route: m0.route,
      itemSeqs: new Set(members.map((m) => m.item_seq)).size,
      withCanonical: members.filter((m) => m.has_canonical > 0).length,
      canonSrc: [...new Set(members.map((m) => m.canon_src).filter(Boolean))].join(','),
      extendability, authoredSourceRefIds: authoredRefs, authoredMasters, safetyVariants,
      sampleMaster: m0.master_id, sampleName: m0.name,
    };
  }).sort((a, b) => b.size - a.size);

  const tierCount: Record<string, { masters: number; groups: number }> = {};
  for (const g of groupList) { (tierCount[g.tier] ??= { masters: 0, groups: 0 }); tierCount[g.tier].masters += g.size; tierCount[g.tier].groups += 1; }

  const totalM = recs.length;
  const sortedSizes = groupList.map((g) => g.size);
  const cumcov = (pct: number): number => { let acc = 0, n = 0; for (const s of sortedSizes) { acc += s; n += 1; if (acc / totalM >= pct) break; } return n; };

  const sizeDist: Record<string, number> = { '1': 0, '2-5': 0, '6-20': 0, '21-50': 0, '51+': 0 };
  for (const g of groupList) sizeDist[g.size === 1 ? '1' : g.size <= 5 ? '2-5' : g.size <= 20 ? '6-20' : g.size <= 50 ? '21-50' : '51+'] += 1;

  // === 안전통합 잠재력(경구·단일제) ===
  const safetyKey = (x: any): string => H([
    x.ingredient ? x.ingredient_strength_signature : x.norm_ind_hash + x.strength,
    x.dose_form_signature, x.route_signature, x.safety_signature,
  ].join('|'));
  const safetyGroups = new Map<string, any[]>();
  for (const r of recs.filter((x) => !x.nonOral && !x.multiIngredient)) { const k = safetyKey(r); (safetyGroups.get(k) ?? safetyGroups.set(k, []).get(k)!).push(r); }
  const safetyList = [...safetyGroups.values()].map((m) => m.length).sort((a, b) => b - a);
  const oralMasters = recs.filter((x) => !x.nonOral && !x.multiIngredient).length;
  const safetyCov = (pct: number): number => { let acc = 0, n = 0; for (const s of safetyList) { acc += s; n += 1; if (acc / oralMasters >= pct) break; } return n; };

  // === authored bridge 4구획 집계 ===
  const bridge4: Record<string, { groups: number; masters: number }> = {
    '검토후확장후보': { groups: 0, masters: 0 }, '새설명서필요': { groups: 0, masters: 0 },
    '주성분코드필요(무성분명)': { groups: 0, masters: 0 }, '비경구-별도트랙': { groups: 0, masters: 0 },
  };
  for (const g of groupList) { const b = bridge4[g.extendability]; b.groups += 1; b.masters += g.size; }
  // 동일 약학적 단위(성분|함량|제형|경로) bridgeKey 가 여러 fingerprint 그룹으로 분열 + 그 안전지문 변이(경구·단일제만).
  // ⚠️ 그룹-내 안전은 그룹 키 정의상 균일 → 의미 있는 대조는 같은 bridgeKey 를 공유하는 그룹 '간' 안전지문 변이(§7 분열).
  const bkAgg = new Map<string, { fps: Set<string>; masters: number; safetySigs: Set<string>; sample: string }>();
  for (const r of recs) {
    if (r.nonOral || r.multiIngredient || !r.ingredient) continue;
    const bk = bridgeKeyOf(r);
    const e = bkAgg.get(bk) ?? bkAgg.set(bk, { fps: new Set(), masters: 0, safetySigs: new Set(), sample: r.name }).get(bk)!;
    e.fps.add(groupKey(r)); e.masters += 1; e.safetySigs.add(r.safety_signature);
  }
  const bridgeKeySplit = [...bkAgg.entries()]
    .filter(([, v]) => v.fps.size > 1)
    .map(([bk, v]) => ({ bridgeKey: bk, fpGroups: v.fps.size, masters: v.masters, safetyVariants: v.safetySigs.size, hasAuthored: authoredBridge.has(bk), sample: v.sample }))
    .sort((a, b) => b.fpGroups - a.fpGroups);
  const reviewSplit = bridgeKeySplit.filter((x) => x.safetyVariants > 1);

  // === 무성분명 ATC bridge 5구획(master 단위) ===
  //  대상 = 경구·단일제·무성분명(=주성분코드필요 버킷). 후보 = authored(atc-key) ∪ grounded-named(atc-key).
  //  안전지문 일치 = grounded-named 후보(같은 atc-key) 안전지문에 본 master 안전지문 포함(=identity 안전 차용 가능).
  const atcBridge = { 'ATC코드없음': 0, 'ATC후보없음': 0, 'ATC후보있음': 0, 'ATC후보_안전일치': 0, 'ATC후보_안전불일치': 0 } as Record<string, number>;
  let noIngredientOral = 0;
  for (const r of recs) {
    if (r.nonOral || r.multiIngredient || r.ingredient) continue; // 무성분명·경구·단일제만
    noIngredientOral += 1;
    if (!r.atc_code) { atcBridge['ATC코드없음'] += 1; continue; }
    const ak = `${r.atc_code}|${r.strength}|${r.form}|${r.route}`;
    const named = groundedNamedAtc.get(ak);
    const authored = authoredAtc.get(ak);
    const hasCandidate = (named && named.masters.size > 0) || (authored && authored.masters.size > 0);
    if (!hasCandidate) { atcBridge['ATC후보없음'] += 1; continue; }
    atcBridge['ATC후보있음'] += 1;
    // 안전지문 대조: grounded-named 후보가 있고 그 안전지문에 본 master 안전지문 포함 → 일치
    if (named && named.safetySigs.has(r.safety_signature)) atcBridge['ATC후보_안전일치'] += 1;
    else atcBridge['ATC후보_안전불일치'] += 1;
  }

  // === canonical 6-버킷(master_id 직접 조인) ===
  const existingCanonical = {
    easyCanonicalKo: recs.length, // 모집단 정의상 전건 e약은요 ko 표시본 보유
    authoredCanonicalKo: recs.filter((r) => r.authored_ko_canon > 0).length,
    authoredCanonicalEn: recs.filter((r) => r.authored_en_canon > 0).length,
    koNeedsReview: recs.filter((r) => r.authored_ko_review > 0).length,
    enNeedsReview: recs.filter((r) => r.authored_en_review > 0).length,
    noDescription: 0, // 모집단 정의상 전건 e약은요 ko 표시본 보유 → STORE 설명서 미보유 master=0
    note: '모집단=e약은요-grounded 라 전건 e약은요 ko canonical(표시본) 보유. authored(mfds_drug_otc·nutrition_combo)는 A_no_spd_only(e약은요 미보유) 대상 승격이라 구조적 disjoint → authored ko/en·needs_review 0 은 조인버그 아닌 구조. 재사용 수치는 통합단계에서 두 모집단 fingerprint 연결로 산정, shard 단독 확정 불가.',
  };

  const summary = {
    wo: 'WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-AUDIT-3-AGENT-V1', agent: '다', shard: SHARD, dbWrite: 0,
    shardMasters: rows.length, extractOk: recs.length, extractFail: exceptions.length,
    distinctItemSeq: new Set(recs.map((r) => r.item_seq)).size,
    groups: groupList.length, tierCount, sizeDist,
    coverage: { '50%': cumcov(0.5), '70%': cumcov(0.7), '80%': cumcov(0.8), '90%': cumcov(0.9) },
    oralMasters, nonOralMasters: recs.filter((x) => x.nonOral || x.multiIngredient).length,
    noIngredientMasters: recs.filter((r) => !r.ingredient).length,
    safetyConsolidation: { oralMasters, safetyGroups: safetyList.length, coverage: { '50%': safetyCov(0.5), '70%': safetyCov(0.7), '80%': safetyCov(0.8), '90%': safetyCov(0.9) }, note: '경구·단일제만. 성분·함량·제형·경로+안전지문 동일 → 문구변이 무시하고 대표 1건 공유 가능(통합단계 후보).' },
    existingCanonical,
    authoredCorpus: { koCanonicalMasters: authoredRows.length, distinctSourceRefIds: new Set(authoredRows.map((a) => a.ref).filter(Boolean)).size, bridgeKeys: authoredBridge.size, note: 'authored OTC canonical(전량). nutrition_combo 는 현재 0(shard-0 시점 1,915 → 이후 제거/변경). mfds_drug_otc ko 만 존재.' },
    authoredBridge4: bridge4,
    pharmacologicalSplit: {
      splitBridgeKeys: bridgeKeySplit.length,
      splitWithSafetyVariance: reviewSplit.length,
      note: '경구·단일제 성분|함량|제형|경로(bridgeKey) 중 여러 fingerprint 그룹으로 원문 분열된 수 = splitBridgeKeys(§7 동일 약학단위 분열). 그중 안전지문까지 다른 것 = splitWithSafetyVariance → authored 1건으로 일괄 확장 불가, 안전 변이별 검토 필수(후보키만으로 확정 금지 근거).',
      top: bridgeKeySplit.slice(0, 15),
    },
    atcBridge5: {
      대상_무성분명경구단일: noIngredientOral,
      'ATC코드없음': atcBridge['ATC코드없음'],
      'ATC후보없음': atcBridge['ATC후보없음'],
      'ATC후보있음': atcBridge['ATC후보있음'],
      'ATC후보있음_안전지문일치': atcBridge['ATC후보_안전일치'],
      'ATC후보있음_안전지문불일치': atcBridge['ATC후보_안전불일치'],
      note: 'ATC=후보 연결 키 / 안전지문=최종 분리 키. 같은 ATC라도 안전정보 다르면 분리. 안전 대조는 grounded-named 후보(shard-local) 기준 — cross-shard named twin 은 통합단계 보강. authored-only 후보는 e약은요 미보유라 안전 대조 불가 → 불일치(별도 확인)로 보수 분류.',
    },
    top30: groupList.slice(0, 30).map((g) => ({ fp: g.fingerprint, tier: g.tier, size: g.size, ingredient: g.ingredient, strength: g.strength, form: g.form, route: g.route, ext: g.extendability, authoredMasters: g.authoredMasters, safetyVariants: g.safetyVariants, sample: g.sampleName })),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-2-summary-v1.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-2-groups-v1.json'), JSON.stringify({ shard: SHARD, groups: groupList }, null, 1), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-2-exceptions-v1.json'), JSON.stringify({ shard: SHARD, exceptions, tier5Groups: groupList.filter((g) => g.tier === 'Tier5') }, null, 1), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-2-bridge-v1.json'), JSON.stringify({
    wo: 'ADDENDUM-O4O-OTC-FINGERPRINT-GROUNDED-AUTHORED-BRIDGE-V1', shard: SHARD,
    note: 'shard 부분값 — 통합 전 확정 금지. authored bridge=성분|함량|제형|경로 일치(무성분명 authored 제외). 확장은 검토후(안전지문 대조)만. ATC bridge=무성분명 atc|함량|제형|경로.',
    groundedGroups: groupList.length,
    bridge4, authoredCorpus: summary.authoredCorpus, atcBridge5: summary.atcBridge5,
    pharmacologicalSplit: { splitBridgeKeys: bridgeKeySplit.length, splitWithSafetyVariance: reviewSplit.length, keys: bridgeKeySplit },
    groups: groupList.map((g) => ({ fingerprint: g.fingerprint, tier: g.tier, size: g.size, bridgeKey: g.bridgeKey, ingredient: g.ingredient, strength: g.strength, form: g.form, route: g.route, groundedMasters: g.size, extendability: g.extendability, authoredSourceRefIds: g.authoredSourceRefIds, authoredMasters: g.authoredMasters, safetyVariants: g.safetyVariants })),
  }, null, 1), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
  await ds.destroy();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
