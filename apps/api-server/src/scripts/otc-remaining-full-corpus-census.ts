/**
 * WO-O4O-OTC-REMAINING-FULL-CORPUS-CENSUS-AND-THREE-SHARD-DESIGN-V1 — 에이전트 라 (조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성/apply 금지. 완료 트랙을 제외한 실제 잔여 생산 대상을 전수 집계한다.
 *
 * 모집단 = drug_category='otc' ProductMaster 전량(product_drug_extensions).
 * e약은요 원문(mfds_easy_drug STORE ko canonical) 보유분은 shard-0 정본 지문 규칙으로 fingerprint 그룹핑.
 * 완료 판정은 authored STORE canonical 존재로 DB 에서 직접 파생(트랙 이름 무관):
 *   authored source_type ∈ {mfds_drug_otc, nutrition_combo, mfds_drug_otc_nutrition_combo}
 *   ko = language ko canonical · en = language en canonical · needs_review = authored status needs_review
 * 공식 원문 = product_candidates.source_label ∈ {MFDS_EASY_DRUG_INFO, MFDS_DRUG_OTC} (itemSeq 조인) 또는
 *   easy/authored STORE canonical 존재. 셋 다 없으면 HOLD_SOURCE.
 *
 * 분류(라가 JSON 으로 확정하는 근거를 그대로 산출): READY / SPLIT_REQUIRED / HOLD_SOURCE / HOLD_IDENTITY /
 *   HOLD_ROUTE / EXCLUDE / ALREADY_COMPLETE (+ KO_ONLY, NEEDS_REVIEW, OTHER_SOURCE_NON_EASY 부가 버킷).
 *
 * 결정론: 산출물에 타임스탬프 미포함. fp/master IDs asc. 2회 실행 byte-identical.
 * 접속(사용자 신뢰 세션): Cloud SQL Auth Proxy 127.0.0.1:5442. env: DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME.
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-remaining-full-corpus-census.ts
 * 산출: src/scripts/data/otc-remaining-full-corpus-census-v1.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_FILE = path.join(OUT_DIR, 'otc-remaining-full-corpus-census-v1.json');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo', 'mfds_drug_otc_nutrition_combo'];
// 국내 소매 대상 아님(수출/군납/보건소용/비매품) — 소비자 콘텐츠 대상 제외
const EXCLUDE_RE = /전량\s*수출|수출\s*전용|수출용|for\s*export|군납|보건소\s*용|보건소납품|비매품|임상\s*시험\s*용|샘플\s*용/i;

// ── shard-0 정본 fingerprint 규칙 VERBATIM ────────────────────────────────────────
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
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
function routeSig(name: string): string {
  if (/질정|질좌|질내정|질\s?삽입/.test(name)) return 'vaginal';
  if (/좌약|좌제/.test(name)) return 'rectal';
  if (/점안|안연고/.test(name)) return 'ophthalmic';
  if (/점이액|귀에/.test(name)) return 'otic';
  if (/점비|비강/.test(name)) return 'nasal';
  if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical';
  if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral';
  return 'unknown';
}
function formOf(name: string): string {
  return /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림'
    : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽'
    : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
}
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string | null): string => (spec || '').split(' / ')[0].trim();
const isMultiIngredient = (ingredient: string, name: string): boolean =>
  /[·,/+]/.test(ingredient) || /혼합|복합/.test(ingredient) || (name.match(/[·]/g) || []).length >= 2;

async function loadSet(ds: any, q: string): Promise<Set<string>> {
  const r: Array<{ id: string }> = await ds.query(q);
  return new Set(r.map((x) => x.id));
}

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
    extra: { statement_timeout: 600000 },
  });
  await ds.initialize();

  // ── 1) OTC 모집단 ────────────────────────────────────────────────────────────────
  const otc: Array<{ id: string; name: string; spec: string | null; reg: string | null }> = await ds.query(`
    SELECT DISTINCT pm.id::text id, pm.name, pm.specification spec, pm.regulatory_type reg
    FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL`);

  // ── 2) 완료/원천 상태 집합(소규모, JS 조인) ─────────────────────────────────────────
  const AUTHORED_SQL = `ARRAY['${AUTHORED_SOURCES.join("','")}']`;
  const easyKo = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND status='canonical'
      AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`);
  const authoredKo = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type = ANY(${AUTHORED_SQL}) AND status='canonical'
      AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`);
  const enCanon = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='en' AND deleted_at IS NULL`);
  const needsReview = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type = ANY(${AUTHORED_SQL})
      AND status='needs_review' AND deleted_at IS NULL`);

  // itemSeq(MFDS_CODE) per master + 공식 원문 후보 존재(itemSeq 기준)
  const idRows: Array<{ mid: string; seq: string }> = await ds.query(
    `SELECT product_master_id::text mid, identifier_value seq FROM product_identifiers
     WHERE identifier_type='MFDS_CODE' AND deleted_at IS NULL`);
  const seqByMid = new Map<string, string>();
  for (const r of idRows) if (!seqByMid.has(r.mid)) seqByMid.set(r.mid, r.seq);
  const srcSeqRows: Array<{ seq: string }> = await ds.query(
    `SELECT DISTINCT identifier_value seq FROM product_candidates
     WHERE source_label IN ('MFDS_EASY_DRUG_INFO','MFDS_DRUG_OTC') AND deleted_at IS NULL`);
  const officialSourceSeq = new Set(srcSeqRows.map((r) => r.seq));
  // 허가사항(MFDS_DRUG_OTC) 원문 존재 itemSeq (e약은요와 무관한 grounding)
  const otcSourceSeqRows: Array<{ seq: string }> = await ds.query(
    `SELECT DISTINCT identifier_value seq FROM product_candidates
     WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL`);
  const mfdsOtcSourceSeq = new Set(otcSourceSeqRows.map((r) => r.seq));
  // candidate ↔ master 연결(axis 6): master 의 itemSeq 가 product_candidates 에 존재하는지
  // (드래프트 링크 단절은 draft seed 의 master 참조 유효성으로 별도 확인)

  // ── 3) e약은요 원문 content per easy-grounded master (fingerprint 근거) ────────────
  const easyContentRows: Array<{ id: string; name: string; spec: string | null; content: string }> = await ds.query(`
    SELECT pop.id, pop.name, pop.spec, es.content
    FROM (
      SELECT DISTINCT pm.id::text id, pm.name, pm.specification spec
      FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    ) pop
    JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1
    ) es ON true`);
  await ds.destroy();

  // ── 4) master → record (모든 OTC) ────────────────────────────────────────────────
  const contentByMid = new Map<string, string>();
  for (const r of easyContentRows) contentByMid.set(r.id, r.content);

  type Rec = {
    id: string; name: string; spec: string | null;
    ingredient: string; strength: string; form: string; route: string; multi: boolean;
    exclude: boolean; grounded: boolean; hasItemSeq: boolean; hasOfficialSource: boolean; hasMfdsOtcSource: boolean;
    koDone: boolean; enDone: boolean; nr: boolean; easyOnly: boolean; complete: boolean; koOnly: boolean;
    fp: string | null; identityKey: string | null; parseFail: boolean;
  };
  const recs: Rec[] = [];
  for (const m of otc) {
    const seq = seqByMid.get(m.id) || '';
    const hasItemSeq = seq !== '';
    const ingredient = ingredientOf(m.name);
    const strength = strengthOf(m.spec);
    const form = formOf(m.name);
    const route = routeSig(m.name);
    const multi = isMultiIngredient(ingredient, m.name);
    const grounded = easyKo.has(m.id);
    const koDone = authoredKo.has(m.id);
    const enDone = enCanon.has(m.id);
    const nr = needsReview.has(m.id);
    const hasOfficialSource = officialSourceSeq.has(seq) || grounded || koDone;
    const hasMfdsOtcSource = mfdsOtcSourceSeq.has(seq);

    let fp: string | null = null; let identityKey: string | null = null; let parseFail = false;
    const content = contentByMid.get(m.id);
    if (grounded && content) {
      const sec = sections(content);
      const ind = sec['효능·효과'] || '';
      const dos = sec['용법·용량'] || '';
      const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
      if (!ind && !dos && !cau) { parseFail = true; }
      else {
        const normInd = H(normalize(ind)), normDos = H(normalize(dos)), normCau = H(normalize(cau));
        const ingStr = H(`${ingredient}|${strength}`), formSig = H(form);
        fp = H([normInd, normDos, normCau, ingStr, formSig, route].join('|'));
        identityKey = `${ingredient}|${strength}|${form}`;
      }
    }
    recs.push({
      id: m.id, name: m.name, spec: m.spec,
      ingredient, strength, form, route, multi,
      exclude: EXCLUDE_RE.test(m.name) || EXCLUDE_RE.test(ingredient),
      grounded, hasItemSeq, hasOfficialSource, hasMfdsOtcSource,
      koDone, enDone, nr,
      easyOnly: grounded && !koDone && !nr,
      complete: koDone && enDone,
      koOnly: koDone && !enDone,
      fp, identityKey, parseFail,
    });
  }

  // identityKey → distinct fp set (axis 7 분산 탐지, 미완료 grounded 만)
  const identityFps = new Map<string, Set<string>>();
  for (const r of recs) {
    if (r.fp && r.identityKey && !r.complete && !r.exclude) {
      (identityFps.get(r.identityKey) ?? identityFps.set(r.identityKey, new Set()).get(r.identityKey)!).add(r.fp);
    }
  }

  // ── 5) 분류(master 단위, 상호배타 · 우선순위 고정) ────────────────────────────────
  type Cls = 'EXCLUDE' | 'ALREADY_COMPLETE' | 'KO_ONLY' | 'NEEDS_REVIEW' | 'HOLD_SOURCE'
    | 'HOLD_ROUTE' | 'HOLD_IDENTITY' | 'SPLIT_REQUIRED' | 'READY' | 'OTHER_SOURCE_NON_EASY';
  const classify = (r: Rec): Cls => {
    if (r.exclude) return 'EXCLUDE';
    if (r.complete) return 'ALREADY_COMPLETE';
    if (r.koOnly) return 'KO_ONLY';                       // ko 완료·en 부재 → EN 완결 대상
    if (r.nr) return 'NEEDS_REVIEW';                        // authored 검토중 잔재
    if (!r.grounded) {                                     // e약은요 STORE canonical 미보유
      if (r.hasOfficialSource) return 'OTHER_SOURCE_NON_EASY'; // 허가사항/e약은요 원문 존재(미승격) — 별도 트랙
      return 'HOLD_SOURCE';                                // 공식 원문 전무
    }
    // grounded & 미완료 & 미검토중
    if (r.parseFail) return 'HOLD_SOURCE';                  // 원문 파싱 불가(섹션 0)
    if (r.route === 'unknown') return 'HOLD_ROUTE';
    if (!r.ingredient || r.multi) return 'HOLD_IDENTITY';   // 무성분명/복합 → 정체성 미확정
    const disp = r.identityKey ? (identityFps.get(r.identityKey)?.size ?? 1) : 1;
    if (disp > 1) return 'SPLIT_REQUIRED';                  // 동일 성분|함량|제형 다중 fp
    return 'READY';
  };
  for (const r of recs) (r as any).cls = classify(r);

  const byCls = (c: Cls): Rec[] => recs.filter((r) => (r as any).cls === c);
  const count: Record<string, number> = {};
  for (const r of recs) count[(r as any).cls] = (count[(r as any).cls] || 0) + 1;

  // ── 6) fingerprint 그룹 집계(READY / SPLIT_REQUIRED) ──────────────────────────────
  type FpGroup = {
    fp: string; ingredient: string; strength: string; form: string; route: string;
    identityKey: string; size: number; masterIds: string[]; cls: Cls; identityDispersed: boolean;
  };
  const fpMap = new Map<string, FpGroup>();
  for (const r of recs) {
    const c = (r as any).cls as Cls;
    if ((c === 'READY' || c === 'SPLIT_REQUIRED') && r.fp && r.identityKey) {
      let g = fpMap.get(r.fp);
      if (!g) {
        g = { fp: r.fp, ingredient: r.ingredient, strength: r.strength, form: r.form, route: r.route,
          identityKey: r.identityKey, size: 0, masterIds: [], cls: c,
          identityDispersed: (identityFps.get(r.identityKey)?.size ?? 1) > 1 };
        fpMap.set(r.fp, g);
      }
      g.size++; g.masterIds.push(r.id);
    }
  }
  const fpGroups = [...fpMap.values()];
  for (const g of fpGroups) g.masterIds.sort();
  fpGroups.sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : a.fp > b.fp ? 1 : 0));
  const readyGroups = fpGroups.filter((g) => g.cls === 'READY');
  const splitGroups = fpGroups.filter((g) => g.cls === 'SPLIT_REQUIRED');

  // SPLIT_REQUIRED 를 identityKey 로 묶어 인계 편의 제공
  const splitByIdentity = new Map<string, { identityKey: string; fps: { fp: string; size: number; route: string }[]; masters: number }>();
  for (const g of splitGroups) {
    let s = splitByIdentity.get(g.identityKey);
    if (!s) { s = { identityKey: g.identityKey, fps: [], masters: 0 }; splitByIdentity.set(g.identityKey, s); }
    s.fps.push({ fp: g.fp, size: g.size, route: g.route }); s.masters += g.size;
  }
  const splitIdentities = [...splitByIdentity.values()]
    .map((s) => ({ ...s, fps: s.fps.sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1)) }))
    .sort((a, b) => b.masters - a.masters || (a.identityKey < b.identityKey ? -1 : 1));

  // ── 7) READY 3-shard 결정론 균형 분할(가·나·다) ──────────────────────────────────
  //     fp = 정확히 한 shard. size desc→fp asc 순회, master 최소 shard 에 greedy 배정. route/위험도 부차 균형.
  const SHARDS = ['ga', 'na', 'da'] as const;
  const shardAssign: Record<string, { fps: string[]; masters: number; masterIds: string[]; routes: Record<string, number> }> =
    { ga: { fps: [], masters: 0, masterIds: [], routes: {} }, na: { fps: [], masters: 0, masterIds: [], routes: {} }, da: { fps: [], masters: 0, masterIds: [], routes: {} } };
  for (const g of readyGroups) {
    const target = [...SHARDS].sort((a, b) =>
      shardAssign[a].masters - shardAssign[b].masters ||
      shardAssign[a].fps.length - shardAssign[b].fps.length ||
      (a < b ? -1 : 1))[0];
    const s = shardAssign[target];
    s.fps.push(g.fp); s.masters += g.size; s.masterIds.push(...g.masterIds);
    s.routes[g.route] = (s.routes[g.route] || 0) + g.size;
  }
  for (const k of SHARDS) shardAssign[k].masterIds.sort();
  // 교집합 0 검증
  const allShardFps = SHARDS.flatMap((k) => shardAssign[k].fps);
  const shardFpIntersection = allShardFps.length - new Set(allShardFps).size;
  const allShardMasters = SHARDS.flatMap((k) => shardAssign[k].masterIds);
  const shardMasterIntersection = allShardMasters.length - new Set(allShardMasters).size;

  // ── 8) 필수 집계(11) ─────────────────────────────────────────────────────────────
  const readyMasters = readyGroups.reduce((a, g) => a + g.size, 0);
  const splitMasters = splitGroups.reduce((a, g) => a + g.size, 0);
  const holdSource = byCls('HOLD_SOURCE'), holdIdentity = byCls('HOLD_IDENTITY'), holdRoute = byCls('HOLD_ROUTE');
  const exclude = byCls('EXCLUDE'), complete = byCls('ALREADY_COMPLETE'), koOnly = byCls('KO_ONLY');
  const nrBucket = byCls('NEEDS_REVIEW'), otherSrc = byCls('OTHER_SOURCE_NON_EASY');
  const distinctFp = (rs: Rec[]): number => new Set(rs.map((r) => r.fp).filter(Boolean)).size;

  const tallies = {
    t1_otcProductMasterTotal: otc.length,
    t2_authoredKoEnCompleteMasters: complete.length,
    t3_koOnlyMasters: koOnly.length,
    t4_easyOnlyMasters: recs.filter((r) => r.easyOnly && !r.exclude && !r.complete).length,
    t5_needsReviewMasters: nrBucket.length,
    t6_readyFp: readyGroups.length, t6_readyMasters: readyMasters,
    t7_splitRequiredFp: splitGroups.length, t7_splitRequiredMasters: splitMasters,
    t8_holdSourceFp: distinctFp(holdSource), t8_holdSourceMasters: holdSource.length,
    t8a_holdSource_noItemSeq_linkageBroken: holdSource.filter((r) => !r.hasItemSeq).length, // axis 6: candidate 연결 단절
    t8b_holdSource_hasItemSeq_noOfficialSource: holdSource.filter((r) => r.hasItemSeq).length, // axis 8: 코드 있으나 공식원문 부재
    t9_holdIdentityFp: distinctFp(holdIdentity), t9_holdIdentityMasters: holdIdentity.length,
    t10_holdRouteFp: distinctFp(holdRoute), t10_holdRouteMasters: holdRoute.length,
    t11_excludeFp: distinctFp(exclude), t11_excludeMasters: exclude.length,
    x_otherSourceNonEasyMasters: otherSrc.length,
    x_groundedEasyMasters: easyKo.size,
    x_parseFailMasters: recs.filter((r) => r.parseFail).length,
  };

  // 정합 게이트
  const sumCls = Object.values(count).reduce((a, b) => a + b, 0);
  const gates = {
    classSumEqualsUniverse: sumCls === otc.length,
    universe: otc.length, classSum: sumCls,
    readyCompleteIntersection: readyGroups.some((g) => g.masterIds.some((id) => complete.find((c) => c.id === id))) ? 'FAIL' : 0,
    shardFpIntersection, shardMasterIntersection,
    shardFpSumEqualsReadyFp: allShardFps.length === readyGroups.length,
    shardMasterSumEqualsReadyMasters: allShardMasters.length === readyMasters,
    dbWrite: 0,
  };

  const report = {
    wo: 'WO-O4O-OTC-REMAINING-FULL-CORPUS-CENSUS-AND-THREE-SHARD-DESIGN-V1',
    agent: 'la', readOnly: true, dbWrite: 0,
    definitions: {
      universe: "drug_category='otc' product_masters (deleted_at IS NULL)",
      grounded: "mfds_easy_drug STORE ko canonical 보유",
      authoredKo: AUTHORED_SOURCES,
      complete: 'authored ko canonical AND en canonical',
      holdSource: 'e약은요·허가사항 원문·authored canonical 전무 (또는 원문 파싱 0섹션)',
      excludeKeywords: EXCLUDE_RE.source,
    },
    determinism: 'no timestamp · fp/master IDs asc · fpGroups size desc→fp asc · shard greedy(min-master)',
    tallies, classificationCounts: count, gates,
    shardDesign: {
      note: 'READY fp 만 배정. fp 정확히 1 shard. 각 shard KO+EN 공동 책임. LIVE apply 는 단일 write-owner 순차.',
      ga: { fp: shardAssign.ga.fps.length, masters: shardAssign.ga.masters, routes: shardAssign.ga.routes },
      na: { fp: shardAssign.na.fps.length, masters: shardAssign.na.masters, routes: shardAssign.na.routes },
      da: { fp: shardAssign.da.fps.length, masters: shardAssign.da.masters, routes: shardAssign.da.routes },
      intersectionFp: shardFpIntersection, intersectionMaster: shardMasterIntersection,
    },
    readyGroups: readyGroups.map((g) => ({ fp: g.fp, ingredient: g.ingredient, strength: g.strength, form: g.form, route: g.route, size: g.size, masterIds: g.masterIds })),
    splitRequiredIdentities: splitIdentities,
    holdSourceSample: holdSource.slice(0, 100).map((r) => ({ id: r.id, name: r.name, hasItemSeq: r.hasItemSeq })).sort((a, b) => (a.id < b.id ? -1 : 1)),
    holdIdentitySample: holdIdentity.slice(0, 60).map((r) => ({ id: r.id, name: r.name, ingredient: r.ingredient })).sort((a, b) => (a.id < b.id ? -1 : 1)),
    holdRouteSample: holdRoute.slice(0, 60).map((r) => ({ id: r.id, name: r.name })).sort((a, b) => (a.id < b.id ? -1 : 1)),
    excludeSample: exclude.slice(0, 60).map((r) => ({ id: r.id, name: r.name })).sort((a, b) => (a.id < b.id ? -1 : 1)),
    shardAssignment: {
      ga: shardAssign.ga.fps.sort(), na: shardAssign.na.fps.sort(), da: shardAssign.da.fps.sort(),
      gaMasterIds: shardAssign.ga.masterIds, naMasterIds: shardAssign.na.masterIds, daMasterIds: shardAssign.da.masterIds,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log('=== OTC REMAINING FULL CORPUS CENSUS (read-only, dbWrite=0) ===');
  console.log('universe OTC =', otc.length, ' grounded(easy) =', easyKo.size);
  console.log('tallies =', JSON.stringify(tallies, null, 2));
  console.log('classificationCounts =', JSON.stringify(count));
  console.log('gates =', JSON.stringify(gates));
  console.log('shardDesign =', JSON.stringify(report.shardDesign, null, 2));
  console.log('OUT:', OUT_FILE);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
