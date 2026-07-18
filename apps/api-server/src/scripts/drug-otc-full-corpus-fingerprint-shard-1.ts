/**
 * WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-AUDIT-3-AGENT-V1 — 에이전트 나 (shard = 1)
 *
 * 원문 확보 OTC(regulatory_type=DRUG · drug_category=otc · e약은요 STORE canonical 보유)를
 * shard = uint32(first8hex(md5(item_seq))) % 3 로 3분할, shard==1 만 분석. read-only(DB write 0).
 *
 * 원문 = e약은요 SPD content(pde 텍스트 미populate 확인 — shard 0 검증 계승). 원문/정규화/안전 지문 → Tier 1~5.
 * 정규화: HTML·공백·목록기호·문장부호변형·전각/NFC 만 제거. 숫자·함량·횟수·연령·기간·금기·첨가제·경로·제형·성분 보존.
 *
 * shard 0 로직(drug-otc-full-corpus-fingerprint-shard-0.ts 8ba528924 / 17dbc98e3)을 그대로 계승하고,
 * ADDENDUM 두 축을 재현·구현한다:
 *   (A) grounded↔authored bridge (ADDENDUM-...-BRIDGE-V1, c4b2f6665) — bridgeKey=성분|함량|제형|경로
 *   (B) 무성분명 ATC bridge — atc_code|함량|제형|경로 후보 연결 키 + 안전지문 최종 분리 키 (5구획)
 *
 * 산출: otc-fingerprint-shard-1-{summary,groups,exceptions,bridge}-v1.json.
 *
 * 실행: 프로덕션 read-only. Cloud SQL Auth Proxy(127.0.0.1:5433) 경유. 기본 SHARD=1; SHARD=0/2 는
 *       검증(validate) 모드로 콘솔 출력만(파일 미기록) — shard 0/2 산출물 절대 미수정.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SHARD = parseInt(process.env.SHARD || '1', 10);
const WRITE = SHARD === 1; // shard 0/2 산출물 보호: shard 1 일 때만 파일 기록
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

/** 제형(form) 판정 — shard 0 계승 */
function formOf(name: string): string {
  return /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림'
    : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽'
    : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
}
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  // shard 모집단 (원문 확보 OTC). atc_code 동반(무성분명 ATC bridge 축).
  const rows: Array<{ master_id: string; item_seq: string; name: string; spec: string; atc_code: string | null; content: string; has_canonical: number; canon_src: string | null }> = await ds.query(`
    WITH pop AS (
      SELECT DISTINCT pm.id::text master_id, pi.normalized_value item_seq, pm.name, pm.specification spec, e.atc_code
      FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
      JOIN product_identifiers pi ON pi.product_master_id=pm.id AND pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
      WHERE pm.regulatory_type='DRUG'
        AND (('x'||substr(md5(pi.normalized_value),1,8))::bit(32)::bigint % 3) = ${SHARD}
    )
    SELECT pop.*, es.content,
           (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.source_type<>'mfds_easy_drug') has_canonical,
           (SELECT string_agg(DISTINCT s.source_type,',') FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.source_type<>'mfds_easy_drug') canon_src
    FROM pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
  `);

  // canonical 재검증(§5-C 계승): master_id 직접 조인, source_type·language·status 별 집계
  const canonicalBreakdown: Array<{ source_type: string; language: string; status: string; masters: number }> = await ds.query(`
    WITH pop AS (
      SELECT DISTINCT pm.id master_id
      FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
      JOIN product_identifiers pi ON pi.product_master_id=pm.id AND pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
        AND (('x'||substr(md5(pi.normalized_value),1,8))::bit(32)::bigint % 3) = ${SHARD}
      WHERE pm.regulatory_type='DRUG'
        AND EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL)
    )
    SELECT s.source_type, s.language, s.status, count(DISTINCT s.master_id)::int masters
    FROM shared_product_descriptions s JOIN pop ON pop.master_id=s.master_id
    WHERE s.description_type='STORE' AND s.deleted_at IS NULL
    GROUP BY 1,2,3 ORDER BY 1,2,3
  `);

  // authored 모집단(전 shard, global) — bridge 후보 소스. name/spec 로 bridgeKey 파생.
  const authoredRows: Array<{ name: string; spec: string; source_ref_id: string | null; source_type: string }> = await ds.query(`
    SELECT DISTINCT pm.name, pm.specification spec, s.source_ref_id, s.source_type
    FROM shared_product_descriptions s
    JOIN product_masters pm ON pm.id=s.master_id
    WHERE s.description_type='STORE' AND s.status='canonical' AND s.language='ko' AND s.deleted_at IS NULL
      AND s.source_type IN ('mfds_drug_otc','mfds_drug_otc_nutrition_combo')
  `);

  // ─────────────────────────────────────────────────────────────────────────
  // 지문화
  const recs: any[] = [];
  const exceptions: any[] = [];
  for (const r of rows) {
    const sec = sections(r.content);
    const ind = sec['효능·효과'] || '';
    const dos = sec['용법·용량'] || '';
    const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
    const ingredient = ingredientOf(r.name);
    const strength = strengthOf(r.spec);
    const form = formOf(r.name);
    const multiIngredient = /[·,]/.test(ingredient) || (r.name.match(/[·]/g) || []).length >= 2;
    const route = routeSig(r.name);
    if (!ind && !dos && !cau) { exceptions.push({ master_id: r.master_id, item_seq: r.item_seq, name: r.name, reason: 'parse_fail_no_section' }); continue; }
    const rec = {
      master_id: r.master_id, item_seq: r.item_seq, name: r.name, ingredient, strength, form, route,
      atc_code: (r.atc_code || '').trim(), has_canonical: r.has_canonical, canon_src: r.canon_src,
      raw_full_hash: H(r.content), raw_indication_hash: H(ind), raw_dosage_hash: H(dos), raw_caution_hash: H(cau),
      norm_full_hash: H(normalize(r.content)), norm_ind_hash: H(normalize(ind)), norm_dos_hash: H(normalize(dos)), norm_cau_hash: H(normalize(cau)),
      ingredient_strength_signature: H(`${ingredient}|${strength}`), dose_form_signature: H(form), route_signature: route,
      dosage_numeric_signature: numericSig(dos), age_signature: ageSig(dos + ' ' + cau), duration_signature: durationSig(dos + ' ' + cau),
      contraindication_signature: contraSig(cau), pregnancy_signature: pregnancySig(cau), interaction_signature: H(normalize(sec['상호작용'] || '')), allergy_additive_signature: additiveSig(cau),
      multiIngredient, nonOral: route !== 'oral',
    };
    recs.push(rec);
  }

  // 그룹 키: 정규화 섹션(효능+용법+금기) + 성분·함량 + 제형 + 경로 = 공유 설명서 단위
  const groupKey = (x: any): string => H([x.norm_ind_hash, x.norm_dos_hash, x.norm_cau_hash, x.ingredient_strength_signature, x.dose_form_signature, x.route_signature].join('|'));
  const groups = new Map<string, any[]>();
  for (const r of recs) { const k = groupKey(r); (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }

  // Tier 판정(그룹 단위)
  function tierOf(members: any[]): string {
    if (members.some((m) => m.nonOral || m.multiIngredient)) return 'Tier5';
    const rawSet = new Set(members.map((m) => m.raw_full_hash));
    const normSet = new Set(members.map((m) => m.norm_full_hash));
    const safe = new Set(members.map((m) => [m.dosage_numeric_signature, m.age_signature, m.duration_signature, m.contraindication_signature, m.pregnancy_signature, m.allergy_additive_signature].join(':')));
    if (safe.size > 1) return 'Tier4';
    if (rawSet.size === 1) return 'Tier1';
    if (normSet.size === 1) return 'Tier2';
    return 'Tier3';
  }

  const groupList = [...groups.entries()].map(([k, members]) => ({
    fingerprint: k, tier: tierOf(members), size: members.length,
    ingredient: members[0].ingredient, strength: members[0].strength, form: members[0].form, route: members[0].route,
    atc_code: members[0].atc_code,
    itemSeqs: new Set(members.map((m) => m.item_seq)).size,
    withCanonical: members.filter((m) => m.has_canonical > 0).length,
    canonSrc: [...new Set(members.map((m) => m.canon_src).filter(Boolean))].join(','),
    sampleMaster: members[0].master_id, sampleName: members[0].name,
  })).sort((a, b) => b.size - a.size);

  // Tier 집계
  const tierCount: Record<string, { masters: number; groups: number }> = {};
  for (const g of groupList) { (tierCount[g.tier] ??= { masters: 0, groups: 0 }); tierCount[g.tier].masters += g.size; tierCount[g.tier].groups += 1; }

  // 커버리지
  const totalM = recs.length;
  const sortedSizes = groupList.map((g) => g.size);
  const cumcov = (pct: number): number => { let acc = 0, n = 0; for (const s of sortedSizes) { acc += s; n += 1; if (acc / totalM >= pct) break; } return n; };

  // 그룹 규모 분포
  const sizeDist: Record<string, number> = { '1': 0, '2-5': 0, '6-20': 0, '21-50': 0, '51+': 0 };
  for (const g of groupList) sizeDist[g.size === 1 ? '1' : g.size <= 5 ? '2-5' : g.size <= 20 ? '6-20' : g.size <= 50 ? '21-50' : '51+'] += 1;

  // 경로 분포
  const routeDist: Record<string, number> = {};
  for (const r of recs) routeDist[r.route] = (routeDist[r.route] || 0) + 1;
  const oralMasters = recs.filter((x) => !x.nonOral && !x.multiIngredient).length;
  const nonOralMasters = recs.filter((x) => x.nonOral).length;

  // 안전 지문 통합 잠재력 (경구·단일제)
  const safetyKey = (x: any): string => H([
    x.ingredient ? x.ingredient_strength_signature : x.norm_ind_hash + x.strength,
    x.dose_form_signature, x.route_signature,
    x.dosage_numeric_signature, x.age_signature, x.duration_signature, x.contraindication_signature, x.pregnancy_signature, x.allergy_additive_signature,
  ].join('|'));
  const safetyGroups = new Map<string, any[]>();
  for (const r of recs.filter((x) => !x.nonOral && !x.multiIngredient)) { const k = safetyKey(r); (safetyGroups.get(k) ?? safetyGroups.set(k, []).get(k)!).push(r); }
  const safetyList = [...safetyGroups.values()].map((m) => m.length).sort((a, b) => b - a);
  const safetyCov = (pct: number): number => { let acc = 0, n = 0; for (const s of safetyList) { acc += s; n += 1; if (acc / oralMasters >= pct) break; } return n; };

  // ─────────────────────────────────────────────────────────────────────────
  // (A) grounded ↔ authored bridge (ADDENDUM-...-BRIDGE-V1 재현)
  // bridgeKey = 성분|함량|제형|경로. authored 무성분명(성분 empty)은 제외(이질약 과병합 방지).
  const authoredByKey = new Map<string, { refs: Set<string>; masters: number }>();
  for (const a of authoredRows) {
    const ing = ingredientOf(a.name);
    if (!ing) continue; // 무성분명 authored 제외
    const key = `${ing}|${strengthOf(a.spec)}|${formOf(a.name)}|${routeSig(a.name)}`;
    const e = authoredByKey.get(key) ?? authoredByKey.set(key, { refs: new Set(), masters: 0 }).get(key)!;
    if (a.source_ref_id) e.refs.add(a.source_ref_id);
    e.masters += 1;
  }
  const bridgeGroups = groupList.map((g) => {
    const bridgeKey = `${g.ingredient}|${g.strength}|${g.form}|${g.route}`;
    let extendability: string;
    let authoredSourceRefIds: string[] = [];
    let authoredMasters = 0;
    if (g.route !== 'oral') {
      extendability = '비경구-별도트랙';
    } else if (!g.ingredient) {
      extendability = '주성분코드필요(무성분명)';
    } else if (authoredByKey.has(bridgeKey)) {
      extendability = '검토후확장후보';
      const a = authoredByKey.get(bridgeKey)!;
      authoredSourceRefIds = [...a.refs];
      authoredMasters = a.masters;
    } else {
      extendability = '새설명서필요';
    }
    return { fingerprint: g.fingerprint, tier: g.tier, size: g.size, bridgeKey, ingredient: g.ingredient, strength: g.strength, form: g.form, route: g.route, groundedMasters: g.size, extendability, authoredSourceRefIds, authoredMasters };
  });
  const BUCKETS = ['검토후확장후보', '새설명서필요', '주성분코드필요(무성분명)', '비경구-별도트랙'] as const;
  const bridgeSummary: Record<string, { groups: number; masters: number }> = {};
  for (const b of BUCKETS) bridgeSummary[b] = { groups: 0, masters: 0 };
  for (const bg of bridgeGroups) { bridgeSummary[bg.extendability].groups += 1; bridgeSummary[bg.extendability].masters += bg.groundedMasters; }

  // ─────────────────────────────────────────────────────────────────────────
  // (B) 무성분명 ATC bridge — 후보 연결 키 = atc_code|함량|제형|경로, 안전지문 = 최종 분리 키
  // 후보 풀 = shard 내 grounded master 전체(명명+무성분명, 경로 포함) → 무성분명이 명명약에 합류 가능한지 측정.
  // 안전지문 번들(WO 분리 기준 전량): 용법수치·연령·기간·금기·임신·첨가제·상호작용·단일복합.
  const safetyBundle = (x: any): string => [x.dosage_numeric_signature, x.age_signature, x.duration_signature, x.contraindication_signature, x.pregnancy_signature, x.allergy_additive_signature, x.interaction_signature, x.multiIngredient ? 'M' : 'S'].join(':');
  const atcKeyOf = (x: any): string => `${x.atc_code}|${x.strength}|${x.form}|${x.route}`;
  const atcPool = new Map<string, any[]>();
  for (const r of recs) { if (!r.atc_code) continue; const k = atcKeyOf(r); (atcPool.get(k) ?? atcPool.set(k, []).get(k)!).push(r); }

  const noIngredientRecs = recs.filter((r) => !r.ingredient);
  const atcBridge = { 'ATC 후보 있음': 0, 'ATC 후보 + 안전지문 일치': 0, 'ATC 후보 있으나 안전지문 불일치': 0, 'ATC 후보 없음': 0, 'ATC 코드 없음': 0 } as Record<string, number>;
  const atcBridgeMembers: any[] = [];
  for (const r of noIngredientRecs) {
    let bucket: string;
    let namedCandidate = false;
    if (!r.atc_code) {
      bucket = 'ATC 코드 없음';
    } else {
      const peers = (atcPool.get(atcKeyOf(r)) || []).filter((p) => p.master_id !== r.master_id);
      if (peers.length === 0) {
        bucket = 'ATC 후보 없음';
      } else {
        atcBridge['ATC 후보 있음'] += 1;
        const mySafe = safetyBundle(r);
        const matched = peers.filter((p) => safetyBundle(p) === mySafe);
        namedCandidate = peers.some((p) => p.ingredient);
        bucket = matched.length > 0 ? 'ATC 후보 + 안전지문 일치' : 'ATC 후보 있으나 안전지문 불일치';
      }
    }
    atcBridge[bucket] += 1;
    atcBridgeMembers.push({ master_id: r.master_id, item_seq: r.item_seq, name: r.name, atc_code: r.atc_code, strength: r.strength, form: r.form, route: r.route, bucket, hasNamedCandidate: namedCandidate });
  }
  // 안전지문 일치·불일치 합
  const atcSafetyMatch = atcBridge['ATC 후보 + 안전지문 일치'];
  const atcSafetyMismatch = atcBridge['ATC 후보 있으나 안전지문 불일치'];

  // ─────────────────────────────────────────────────────────────────────────
  // 동일 성분·함량·제형인데 원문(content-지문) 분열 (경구·명명·단일제)
  const splitMap = new Map<string, Set<string>>();
  for (const g of groupList) {
    if (g.route !== 'oral' || !g.ingredient) continue;
    const k = `${g.ingredient}|${g.strength}|${g.form}`;
    (splitMap.get(k) ?? splitMap.set(k, new Set()).get(k)!).add(g.fingerprint);
  }
  const splitCases = [...splitMap.entries()].filter(([, fps]) => fps.size > 1)
    .map(([k, fps]) => ({ key: k, groups: fps.size })).sort((a, b) => b.groups - a.groups);

  // 무성분명 그룹·master
  const noIngredientGroups = groupList.filter((g) => !g.ingredient);

  // ─────────────────────────────────────────────────────────────────────────
  const summary = {
    wo: 'WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-AUDIT-3-AGENT-V1', agent: '나', shard: SHARD, dbWrite: 0,
    shardMasters: rows.length, extractOk: recs.length, extractFail: exceptions.length,
    distinctItemSeq: new Set(recs.map((r) => r.item_seq)).size,
    groups: groupList.length, tierCount, sizeDist,
    routeDist, oralMasters, nonOralMasters,
    coverage: { '50%': cumcov(0.5), '70%': cumcov(0.7), '80%': cumcov(0.8), '90%': cumcov(0.9) },
    safetyConsolidation: { oralMasters, safetyGroups: safetyList.length, coverage: { '50%': safetyCov(0.5), '70%': safetyCov(0.7), '80%': safetyCov(0.8), '90%': safetyCov(0.9) }, note: '경구·단일제만. 성분·함량·제형·경로+안전지문 동일 → 문구변이 무시하고 대표 1건 공유 가능(통합단계 후보).' },
    // canonical 재검증(master_id 직접 조인). e약은요-grounded 모집단이라 전건 e약은요 ko canonical(표시본) 보유, authored 는 disjoint.
    existingCanonical: {
      easyCanonicalKoInPopulation: recs.length,
      authoredCanonicalInPopulation: recs.filter((r) => r.has_canonical > 0).length,
      enCanonicalInPopulation: 0,
      breakdown: canonicalBreakdown,
      note: '모집단=e약은요-grounded 라 전건 e약은요 ko canonical 표시본 보유. authored(mfds_drug_otc/nutrition_combo)는 A_no_spd_only(e약은요 미보유) 대상 승격분이라 이 모집단과 구조적 disjoint → authored 0 은 조인버그 아님. 재사용 수치는 통합단계(3 shard + authored 병합) 확정.',
    },
    // (A) authored bridge 4구획
    authoredBridge: bridgeSummary,
    // (B) 무성분명 ATC bridge 5구획 + 안전지문 일치/불일치
    atcBridge: { buckets: atcBridge, noIngredientMasters: noIngredientRecs.length, safetyMatch: atcSafetyMatch, safetyMismatch: atcSafetyMismatch, note: '후보 연결 키=atc_code|함량|제형|경로(후보 풀=shard 내 grounded 전체, 명명+무성분명). 안전지문(용법수치·연령·기간·금기·임신·첨가제·상호작용·단일복합)=최종 분리 키. ⚠️shard-local 값 — twin 이 item_seq 해시로 타 shard 산재 가능 → 전량 후보 수는 통합단계 확정.' },
    noIngredient: { groups: noIngredientGroups.length, masters: noIngredientRecs.length },
    splitCases: { count: splitCases.length, top: splitCases.slice(0, 20) },
    top30: groupList.slice(0, 30).map((g) => ({ fp: g.fingerprint, tier: g.tier, size: g.size, ingredient: g.ingredient, strength: g.strength, form: g.form, atc: g.atc_code, withCanonical: g.withCanonical, sample: g.sampleName })),
  };

  const bridgeOut = {
    wo: 'ADDENDUM-O4O-OTC-FINGERPRINT-GROUNDED-AUTHORED-BRIDGE-V1', shard: SHARD,
    note: 'shard 부분값 — 통합 전 확정 금지. bridge=성분|함량|제형|경로 일치(무성분명 authored 제외). 확장은 검토후(안전지문 대조)만. ATC bridge=무성분명 atc_code 축.',
    groundedGroups: groupList.length,
    bridge: bridgeSummary,
    atcBridge: { buckets: atcBridge, safetyMatch: atcSafetyMatch, safetyMismatch: atcSafetyMismatch, noIngredientMasters: noIngredientRecs.length },
    groups: bridgeGroups,
    atcBridgeMembers,
  };

  if (WRITE) {
    fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-1-summary-v1.json'), JSON.stringify(summary, null, 2), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-1-groups-v1.json'), JSON.stringify({ shard: SHARD, groups: groupList }, null, 1), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-1-exceptions-v1.json'), JSON.stringify({ shard: SHARD, exceptions, tier5Groups: groupList.filter((g) => g.tier === 'Tier5') }, null, 1), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-1-bridge-v1.json'), JSON.stringify(bridgeOut, null, 1), 'utf8');
    console.log('[WRITE] shard-1 산출물 4종 기록 완료');
  } else {
    console.log(`[VALIDATE shard=${SHARD}] 파일 미기록. bridge/atc 요약만 출력.`);
  }

  console.log(JSON.stringify({ shard: SHARD, shardMasters: summary.shardMasters, extractOk: summary.extractOk, extractFail: summary.extractFail, distinctItemSeq: summary.distinctItemSeq, groups: summary.groups, tierCount: summary.tierCount, authoredBridge: summary.authoredBridge, atcBridge: summary.atcBridge.buckets, noIngredient: summary.noIngredient, splitCases: summary.splitCases.count }, null, 2));
  await ds.destroy();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
