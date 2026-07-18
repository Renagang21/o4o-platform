/**
 * WO-O4O-OTC-AUTHORED-CORPUS-FINGERPRINT-AUDIT-AGENT-NA-V1 — 에이전트 나
 *
 * 기존 작성(authored-ungrounded) OTC 설명서 3,128 master 를 전수 지문화해, e약은요-grounded 19,131
 * (shard 0·1·2) 과 통합할 입력을 만든다. read-only(DB write 0).
 *
 * 모집단: shared_product_descriptions
 *   source_type IN (authored set) · language='ko' · status='canonical'
 * ⚠️ WO 는 source_type 을 'mfds_drug_otc','nutrition_combo' 로 표기하나, shard 조사(§5-C)의 실측 리터럴은
 *    'mfds_drug_otc','mfds_drug_otc_nutrition_combo' 이다. 본 스크립트는 두 표기 모두 후보로 넣고
 *    실측 distinct source_type 을 리포트하여 자기검증한다(예상 3,128 master 대조).
 *
 * 방법론: shard-1(drug-otc-full-corpus-fingerprint-shard-1.ts 565546b7f) 의 정규화·지문·경로/제형/성분
 *    추출 로직을 그대로 계승 → grounded 와 동일 축으로 bridge 가능. authored 는 원문이 e약은요 SPD 가
 *    아니라 자체 작성 content 이므로 섹션 파서는 e약은요 포맷 + 자유형(fallback) 둘 다 시도한다.
 *
 * bridge 키(WO 고정): 성분 있으면 성분|함량|제형|경로 · 없으면 atc_code|함량|제형|경로.
 *    ATC = 후보 연결 키 / 안전지문 = 최종 분리 키.
 *
 * 산출: src/scripts/data/otc-authored-corpus-fingerprint-v1.json (단일 종합 파일).
 *
 * 실행(프로덕션 read-only, Cloud SQL Auth Proxy 경유):
 *    DB_HOST=127.0.0.1 DB_PORT=<proxy> npx tsx src/scripts/drug-otc-authored-corpus-fingerprint-audit.ts
 *    기본 read-only. WRITE=0 로 콘솔 요약만(파일 미기록) 가능.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const WRITE = process.env.WRITE !== '0'; // 기본 기록. WRITE=0 이면 콘솔 요약만.
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_FILE = path.join(OUT_DIR, 'otc-authored-corpus-fingerprint-v1.json');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ── shard-1 계승: 섹션 파서 (e약은요 <p><strong>제목</strong><br>본문</p>) ──────────────
function easySections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
/** 자유형 authored 파서 fallback — <h*>/<strong>/줄머리 제목: 뒤 본문을 다음 제목 전까지 수집 */
function freeSections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  // <h1..h4> 또는 <strong> 헤더 기반
  const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const title = m[2].replace(/[:：]\s*$/, '').trim();
    const body = m[3].trim();
    if (title) out[title] = (out[title] ? out[title] + '\n' : '') + body;
  }
  return out;
}
/** 제목 → 표준 축(indication/dosage/caution/interaction) 매핑 */
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string; itx: string } {
  let ind = '', dos = '', cau = '', itx = '';
  for (const [t, b] of Object.entries(sec)) {
    if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b;
    else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b;
    else if (/상호\s*작용|병용/.test(t)) itx += (itx ? '\n' : '') + b;
    else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b;
  }
  return { ind, dos, cau, itx };
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s)
    .normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',')
    .replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim();
}
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
  const m = t.match(/(.*?)(복용하지\s?(마|않)|투여하지\s?(마|말)|복용해서는\s?안)/);
  return H(normalize(m ? m[1] : t.slice(0, 200)));
}
function pregnancySig(caution: string): string {
  const t = normalize(caution);
  if (!/임부|임신|수유부/.test(t)) return 'none';
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
/** 투여경로 = 제형(name) 기반. shard-1 정정 로직 계승(연질캡슐→질캡슐 오매칭 방지). */
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

  const AUTHORED_SOURCE_TYPES = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'nutrition_combo'];

  // 자기검증: authored 후보 source_type 별 ko canonical master 실측
  const sourceTypeBreakdown: Array<{ source_type: string; language: string; status: string; masters: number }> = await ds.query(`
    SELECT s.source_type, s.language, s.status, count(DISTINCT s.master_id)::int masters
    FROM shared_product_descriptions s
    WHERE s.source_type = ANY($1) AND s.deleted_at IS NULL
    GROUP BY 1,2,3 ORDER BY 1,2,3
  `, [AUTHORED_SOURCE_TYPES]);

  // authored 모집단(ko canonical). content + master 메타 + atc_code + en/ko 보유 여부.
  const rows: Array<{
    master_id: string; item_seq: string | null; name: string; spec: string; atc_code: string | null;
    source_type: string; content: string; has_en: number; has_ko: number;
  }> = await ds.query(`
    WITH authored AS (
      SELECT s.master_id, s.source_type,
             (SELECT s2.content FROM shared_product_descriptions s2
                WHERE s2.master_id=s.master_id AND s2.source_type=s.source_type
                  AND s2.language='ko' AND s2.status='canonical' AND s2.deleted_at IS NULL
                ORDER BY length(s2.content) DESC LIMIT 1) content
      FROM shared_product_descriptions s
      WHERE s.source_type = ANY($1) AND s.language='ko' AND s.status='canonical' AND s.deleted_at IS NULL
      GROUP BY s.master_id, s.source_type
    )
    SELECT a.master_id::text master_id, a.source_type, a.content,
           pm.name, pm.specification spec, e.atc_code,
           pi.normalized_value item_seq,
           (SELECT count(*)::int FROM shared_product_descriptions x WHERE x.master_id=a.master_id
              AND x.source_type=a.source_type AND x.language='en' AND x.status='canonical' AND x.deleted_at IS NULL) has_en,
           1 has_ko
    FROM authored a
    JOIN product_masters pm ON pm.id=a.master_id
    LEFT JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.deleted_at IS NULL
    LEFT JOIN product_identifiers pi ON pi.product_master_id=pm.id AND pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
  `, [AUTHORED_SOURCE_TYPES]);

  // grounded(e약은요) bridge 후보 풀 — 통합 대상 확인용(성분/atc 키 존재 여부만, read-only 참조).
  const groundedKeys: Array<{ name: string; spec: string; atc_code: string | null }> = await ds.query(`
    SELECT DISTINCT pm.name, pm.specification spec, e.atc_code
    FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    WHERE pm.regulatory_type='DRUG'
      AND EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id
        AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL)
  `);

  // ── 지문화 ─────────────────────────────────────────────────────────────────
  const recs: any[] = [];
  const exceptions: any[] = [];
  for (const r of rows) {
    const content = r.content || '';
    let sec = easySections(content);
    if (Object.keys(sec).length === 0) sec = freeSections(content);
    const { ind, dos, cau, itx } = bucketSections(sec);
    const ingredient = ingredientOf(r.name);
    const strength = strengthOf(r.spec);
    const form = formOf(r.name);
    const route = routeSig(r.name);
    const multiIngredient = /[·,]/.test(ingredient) || (r.name.match(/[·]/g) || []).length >= 2;
    const atc = (r.atc_code || '').trim();
    if (!content) { exceptions.push({ master_id: r.master_id, name: r.name, reason: 'empty_content' }); continue; }
    const parsedAny = !!(ind || dos || cau || itx);
    const rec = {
      master_id: r.master_id, item_seq: r.item_seq, name: r.name, source_type: r.source_type,
      ingredient, strength, form, route, atc_code: atc,
      has_en: r.has_en, has_ko: r.has_ko,
      parsed: parsedAny,
      raw_full_hash: H(content), norm_full_hash: H(normalize(content)),
      norm_ind_hash: H(normalize(ind)), norm_dos_hash: H(normalize(dos)), norm_cau_hash: H(normalize(cau)),
      ingredient_strength_signature: H(`${ingredient}|${strength}`), dose_form_signature: H(form), route_signature: route,
      dosage_numeric_signature: numericSig(dos), age_signature: ageSig(dos + ' ' + cau), duration_signature: durationSig(dos + ' ' + cau),
      contraindication_signature: contraSig(cau), pregnancy_signature: pregnancySig(cau),
      interaction_signature: H(normalize(itx)), allergy_additive_signature: additiveSig(cau),
      multiIngredient, nonOral: route !== 'oral',
    };
    recs.push(rec);
  }

  // content-지문 그룹(shard 계승 키)
  const groupKey = (x: any): string => H([x.norm_ind_hash, x.norm_dos_hash, x.norm_cau_hash, x.ingredient_strength_signature, x.dose_form_signature, x.route_signature].join('|'));
  const groups = new Map<string, any[]>();
  for (const r of recs) { const k = groupKey(r); (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }

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
    withEn: members.filter((m) => m.has_en > 0).length,
    sourceTypes: [...new Set(members.map((m) => m.source_type))].join(','),
    sampleMaster: members[0].master_id, sampleName: members[0].name,
    masters: members.map((m) => m.master_id),
  })).sort((a, b) => b.size - a.size);

  const tierCount: Record<string, { masters: number; groups: number }> = {};
  for (const g of groupList) { (tierCount[g.tier] ??= { masters: 0, groups: 0 }); tierCount[g.tier].masters += g.size; tierCount[g.tier].groups += 1; }

  // ── 약학적 키(pharmKey) — 동일 키에 여러 authored 설명서 = 충돌 그룹 ─────────────
  // 키: 성분 있으면 성분|함량|제형|경로 · 없으면 atc_code|함량|제형|경로 (WO bridge 키)
  const pharmKeyOf = (x: any): { key: string; keyType: 'ingredient' | 'atc' | 'none' } => {
    if (x.ingredient) return { key: `ing:${x.ingredient}|${x.strength}|${x.form}|${x.route}`, keyType: 'ingredient' };
    if (x.atc_code) return { key: `atc:${x.atc_code}|${x.strength}|${x.form}|${x.route}`, keyType: 'atc' };
    return { key: `none:${x.master_id}`, keyType: 'none' };
  };
  const safetyBundle = (x: any): string => [x.dosage_numeric_signature, x.age_signature, x.duration_signature, x.contraindication_signature, x.pregnancy_signature, x.allergy_additive_signature, x.interaction_signature, x.multiIngredient ? 'M' : 'S'].join(':');

  const pharmMap = new Map<string, { keyType: string; recs: any[] }>();
  for (const r of recs) {
    const { key, keyType } = pharmKeyOf(r);
    const e = pharmMap.get(key) ?? pharmMap.set(key, { keyType, recs: [] }).get(key)!;
    e.recs.push(r);
  }
  // 충돌 = 같은 pharmKey 인데 authored content-지문(norm_full)이 2개 이상 (설명서 실차이)
  const conflicts = [...pharmMap.entries()]
    .filter(([k]) => !k.startsWith('none:'))
    .map(([key, v]) => {
      const distinctDocs = new Set(v.recs.map((r) => r.norm_full_hash)).size;
      const distinctSafety = new Set(v.recs.map((r) => safetyBundle(r))).size;
      return {
        pharmKey: key, keyType: v.keyType, authoredMasters: v.recs.length,
        distinctDocs, distinctSafety,
        safetyConflict: distinctSafety > 1,
        masters: v.recs.map((r) => r.master_id), sampleName: v.recs[0].name,
      };
    })
    .filter((c) => c.authoredMasters > 1 && c.distinctDocs > 1)
    .sort((a, b) => b.distinctDocs - a.distinctDocs);

  // ── grounded bridge 기계 판독 목록 ──────────────────────────────────────────
  // authored 1건이 grounded 몇 개 제품으로 확장 가능한지 산정할 입력. authored pharmKey ↔ grounded pharmKey.
  const groundedKeySet = new Map<string, number>(); // pharmKey -> grounded master 수(근사, name/spec/atc 기반)
  for (const g of groundedKeys) {
    const ing = ingredientOf(g.name);
    const strength = strengthOf(g.spec);
    const form = formOf(g.name);
    const route = routeSig(g.name);
    const atc = (g.atc_code || '').trim();
    const key = ing ? `ing:${ing}|${strength}|${form}|${route}` : atc ? `atc:${atc}|${strength}|${form}|${route}` : null;
    if (!key) continue;
    groundedKeySet.set(key, (groundedKeySet.get(key) || 0) + 1);
  }
  // authored pharmKey 단위 machine-readable bridge 목록
  const bridgeList = [...pharmMap.entries()]
    .filter(([k]) => !k.startsWith('none:'))
    .map(([key, v]) => {
      const rep = v.recs[0];
      return {
        pharmKey: key, keyType: v.keyType,
        ingredient: rep.ingredient, strength: rep.strength, form: rep.form, route: rep.route, atc_code: rep.atc_code,
        authoredMasters: v.recs.length,
        authoredDistinctDocs: new Set(v.recs.map((r) => r.norm_full_hash)).size,
        groundedMatchMasters: groundedKeySet.get(key) || 0,
        extendable: (groundedKeySet.get(key) || 0) > 0,
        authoredMasterIds: v.recs.map((r) => r.master_id),
      };
    })
    .sort((a, b) => b.groundedMatchMasters - a.groundedMatchMasters);

  // ── 집계 ────────────────────────────────────────────────────────────────────
  const totalMasters = new Set(rows.map((r) => r.master_id)).size;
  const single = recs.filter((r) => !r.multiIngredient).length;
  const multi = recs.filter((r) => r.multiIngredient).length;
  const ingredientExtractable = recs.filter((r) => r.ingredient).length;
  const ingredientMissing = recs.filter((r) => !r.ingredient).length;
  const hasAtc = recs.filter((r) => r.atc_code).length;
  const noAtc = recs.filter((r) => !r.atc_code).length;
  const koEnComplete = recs.filter((r) => r.has_ko > 0 && r.has_en > 0).length;
  const koOnly = recs.filter((r) => r.has_ko > 0 && !(r.has_en > 0)).length;
  const routeDist: Record<string, number> = {};
  for (const r of recs) routeDist[r.route] = (routeDist[r.route] || 0) + 1;
  const bySourceType: Record<string, number> = {};
  for (const r of recs) bySourceType[r.source_type] = (bySourceType[r.source_type] || 0) + 1;

  const bridgeExtendableGroups = bridgeList.filter((b) => b.extendable).length;
  const bridgeExtendableGroundedMasters = bridgeList.filter((b) => b.extendable).reduce((s, b) => s + b.groundedMatchMasters, 0);

  const summary = {
    wo: 'WO-O4O-OTC-AUTHORED-CORPUS-FINGERPRINT-AUDIT-AGENT-NA-V1', agent: '나', dbWrite: 0,
    generatedFrom: 'authored-ungrounded OTC canonical (ko)',
    sourceTypeBreakdown,
    populationMasters: totalMasters, extractOk: recs.length, extractFail: exceptions.length,
    bySourceType,
    contentGroups: groupList.length, tierCount,
    singleIngredient: single, multiIngredient: multi,
    ingredientExtractable, ingredientMissing,
    hasAtc, noAtc,
    koEnComplete, koOnly,
    routeDist,
    pharmConflicts: { count: conflicts.length, safetyConflicts: conflicts.filter((c) => c.safetyConflict).length, top: conflicts.slice(0, 25) },
    groundedBridge: {
      note: 'authored pharmKey ↔ grounded(e약은요) pharmKey 매칭. ATC=후보 연결 키, 안전지문=최종 분리 키. grounded 매칭 수는 name/spec/atc 파생 근사값 — 최종 확장수는 통합단계(shard 0·1·2 fingerprint 병합 + 안전지문 대조) 확정.',
      authoredPharmKeys: bridgeList.length,
      extendableGroups: bridgeExtendableGroups,
      extendableGroundedMasters: bridgeExtendableGroundedMasters,
      top: bridgeList.slice(0, 30),
    },
    top30Groups: groupList.slice(0, 30).map((g) => ({ fp: g.fingerprint, tier: g.tier, size: g.size, ingredient: g.ingredient, strength: g.strength, form: g.form, atc: g.atc_code, sample: g.sampleName })),
  };

  const out = {
    ...summary,
    _detail: {
      groups: groupList,
      conflicts,
      bridgeList,
      exceptions,
    },
  };

  if (WRITE) {
    fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 1), 'utf8');
    console.log(`[WRITE] ${OUT_FILE}`);
  } else {
    console.log('[VALIDATE] WRITE=0 — 파일 미기록, 요약만 출력.');
  }
  console.log(JSON.stringify({
    sourceTypeBreakdown, populationMasters: totalMasters, extractOk: recs.length, extractFail: exceptions.length,
    contentGroups: groupList.length, tierCount, singleIngredient: single, multiIngredient: multi,
    ingredientExtractable, ingredientMissing, hasAtc, noAtc, koEnComplete, koOnly,
    pharmConflicts: summary.pharmConflicts.count, bridgeExtendableGroups, bridgeExtendableGroundedMasters,
  }, null, 2));
  await ds.destroy();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
