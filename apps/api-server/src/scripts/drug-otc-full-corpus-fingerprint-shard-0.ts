/**
 * WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-AUDIT-3-AGENT-V1 — 에이전트 가 (shard = 0)
 *
 * 원문 확보 OTC(regulatory_type=DRUG · drug_category=otc · e약은요 STORE canonical 보유)를
 * shard = uint32(first8hex(md5(item_seq))) % 3 로 3분할, shard==0 만 분석. read-only(DB write 0).
 *
 * 원문 = e약은요 SPD content(pde 텍스트 미populate 확인). 원문 지문/정규화 지문/안전 지문 → Tier 1~5.
 * 정규화: HTML·공백·목록기호·문장부호변형·전각/NFC 만 제거. 숫자·함량·횟수·연령·기간·금기·첨가제·경로·제형·성분 보존.
 * 산출: otc-fingerprint-shard-0-{summary,groups,exceptions}-v1.json.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SHARD = 0;
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

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  // shard-0 모집단 (원문 확보 OTC)
  const rows: Array<{ master_id: string; item_seq: string; name: string; spec: string; content: string; has_canonical: number; canon_src: string | null }> = await ds.query(`
    WITH pop AS (
      SELECT DISTINCT pm.id::text master_id, pi.normalized_value item_seq, pm.name, pm.specification spec
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

  const recs: any[] = [];
  const exceptions: any[] = [];
  for (const r of rows) {
    const sec = sections(r.content);
    const ind = sec['효능·효과'] || '';
    const dos = sec['용법·용량'] || '';
    const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
    const ingredient = (r.name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
    const strength = (r.spec || '').split(' / ')[0].trim();
    const form = /연질캡슐/.test(r.name) ? '연질캡슐' : /캡슐/.test(r.name) ? '캡슐' : /연고/.test(r.name) ? '연고' : /크림/.test(r.name) ? '크림' : /플라스타|첩부|패치|패취|카타플/.test(r.name) ? '첩부제' : /점안/.test(r.name) ? '점안액' : /시럽/.test(r.name) ? '시럽' : /과립|산\(/.test(r.name) ? '과립/산' : /정/.test(r.name) ? '정' : /액/.test(r.name) ? '액' : '기타';
    const multiIngredient = /[·,]/.test(ingredient) || (r.name.match(/[·]/g) || []).length >= 2;
    const route = routeSig(r.name);
    // 파싱 실패 / 예외
    if (!ind && !dos && !cau) { exceptions.push({ master_id: r.master_id, item_seq: r.item_seq, name: r.name, reason: 'parse_fail_no_section' }); continue; }
    const rec = {
      master_id: r.master_id, item_seq: r.item_seq, name: r.name, ingredient, strength, form, route,
      has_canonical: r.has_canonical, canon_src: r.canon_src,
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
    itemSeqs: new Set(members.map((m) => m.item_seq)).size,
    withCanonical: members.filter((m) => m.has_canonical > 0).length,
    canonSrc: [...new Set(members.map((m) => m.canon_src).filter(Boolean))].join(','),
    sampleMaster: members[0].master_id, sampleName: members[0].name,
  })).sort((a, b) => b.size - a.size);

  // Tier 집계
  const tierCount: Record<string, { masters: number; groups: number }> = {};
  for (const g of groupList) { (tierCount[g.tier] ??= { masters: 0, groups: 0 }); tierCount[g.tier].masters += g.size; tierCount[g.tier].groups += 1; }

  // 커버리지 (대표 그룹 N개로 덮는 master %)
  const totalM = recs.length;
  const sortedSizes = groupList.map((g) => g.size);
  const cumcov = (pct: number): number => { let acc = 0, n = 0; for (const s of sortedSizes) { acc += s; n += 1; if (acc / totalM >= pct) break; } return n; };

  // 그룹 규모 분포
  const sizeDist: Record<string, number> = { '1': 0, '2-5': 0, '6-20': 0, '21-50': 0, '51+': 0 };
  for (const g of groupList) sizeDist[g.size === 1 ? '1' : g.size <= 5 ? '2-5' : g.size <= 20 ? '6-20' : g.size <= 50 ? '21-50' : '51+'] += 1;

  // 안전 지문 통합 잠재력: 성분·함량·제형·경로 + 안전 지문 동일 → 대표 1건 공유 가능(문구 변이 무시)
  // ⚠️ 무성분명(name에 (성분) 없음)은 content-fp 를 안전키에 포함해 오병합 방지
  const safetyKey = (x: any): string => H([
    x.ingredient ? x.ingredient_strength_signature : x.norm_ind_hash + x.strength,
    x.dose_form_signature, x.route_signature,
    x.dosage_numeric_signature, x.age_signature, x.duration_signature, x.contraindication_signature, x.pregnancy_signature, x.allergy_additive_signature,
  ].join('|'));
  const safetyGroups = new Map<string, any[]>();
  for (const r of recs.filter((x) => !x.nonOral && !x.multiIngredient)) { const k = safetyKey(r); (safetyGroups.get(k) ?? safetyGroups.set(k, []).get(k)!).push(r); }
  const safetyList = [...safetyGroups.values()].map((m) => m.length).sort((a, b) => b - a);
  const oralMasters = recs.filter((x) => !x.nonOral && !x.multiIngredient).length;
  const safetyCov = (pct: number): number => { let acc = 0, n = 0; for (const s of safetyList) { acc += s; n += 1; if (acc / oralMasters >= pct) break; } return n; };

  const summary = {
    wo: 'WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-AUDIT-3-AGENT-V1', agent: '가', shard: SHARD, dbWrite: 0,
    safetyConsolidation: { oralMasters, safetyGroups: safetyList.length, coverage: { '50%': safetyCov(0.5), '70%': safetyCov(0.7), '80%': safetyCov(0.8), '90%': safetyCov(0.9) }, note: '경구·단일제만. 성분·함량·제형·경로+안전지문 동일 → 문구변이 무시하고 대표 1건 공유 가능(통합단계 후보). content-fp 보다 훨씬 적음 = 문구변이로 인한 fp 분열 규모' },
    shardMasters: rows.length, extractOk: recs.length, extractFail: exceptions.length,
    distinctItemSeq: new Set(recs.map((r) => r.item_seq)).size,
    groups: groupList.length, tierCount, sizeDist,
    coverage: { '50%': cumcov(0.5), '70%': cumcov(0.7), '80%': cumcov(0.8), '90%': cumcov(0.9) },
    // ⚠️ canonical 재검증(ADDENDUM): master_id 직접 조인. 내 모집단=e약은요-grounded 라 전건 e약은요 ko canonical 보유(=기존 표시본), authored(mfds_drug_otc*)는 0(구조적 disjoint — 승격분은 A_no_spd_only ungrounded master).
    existingCanonical: {
      easyCanonicalKoInPopulation: recs.length, // 전건(모집단 정의상 e약은요 ko canonical 보유)
      authoredCanonicalInPopulation: recs.filter((r) => r.has_canonical > 0).length, // 0 (disjoint)
      enCanonicalInPopulation: 0,
      note: '내 모집단(e약은요-grounded)은 전건 e약은요 ko canonical(표시본) 보유. authored OTC canonical(mfds_drug_otc/nutrition_combo, 전체 3,128 master)은 e약은요 미보유(A_no_spd_only)라 이 모집단과 완전 disjoint → 이 값 0 은 조인버그 아닌 구조. **canonical 재사용 수치는 e약은요-grounded + authored-ungrounded 두 모집단을 통합단계에서 fingerprint/그룹으로 연결해 산정해야 하며 shard 단독 확정 불가.**',
    },
    top30: groupList.slice(0, 30).map((g) => ({ fp: g.fingerprint, tier: g.tier, size: g.size, ingredient: g.ingredient, strength: g.strength, form: g.form, withCanonical: g.withCanonical, sample: g.sampleName })),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-0-summary-v1.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-0-groups-v1.json'), JSON.stringify({ shard: SHARD, groups: groupList }, null, 1), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'otc-fingerprint-shard-0-exceptions-v1.json'), JSON.stringify({ shard: SHARD, exceptions, tier5Groups: groupList.filter((g) => g.tier === 'Tier5') }, null, 1), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
  await ds.destroy();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
