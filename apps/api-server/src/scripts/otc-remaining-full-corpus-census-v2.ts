/**
 * WO-O4O-OTC-REMAINING-CENSUS-IDENTITY-ROUTE-STRENGTH-CORRECTION-V2 — 에이전트 라 (조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성/apply 0.
 *
 * V1(`otc-remaining-full-corpus-census.ts`, commit bae254d0e) 의 READY 판정에는 축 추출 결함이 있다.
 * 본 V2 는 V1 파일을 수정/삭제하지 않고 신규 산출물로 전수 재분류한다.
 * V1 산출물은 생산용 SUPERSEDED_FOR_PRODUCTION 이다.
 *
 * ── V1 확인 결함 → V2 정정 ────────────────────────────────────────────────────────
 *  D1 ingredientOf = 제품명 끝 괄호       → 제품명을 성분 SSOT 로 쓰지 않는다.
 *  D2 수출명/맛·향/국가/라틴 상품명 통과  → 성분축에서 원천 배제 + EXCLUDE 패턴 확장.
 *  D3 route = 제품명 정규식               → 공식 코드 기반 판정. 미매핑 시 HOLD_ROUTE.
 *  D4 strength = spec.split(' / ')[0]     → 약품규격(mL) 을 함량으로 쓰지 않는다.
 *  D5 비소매 대용량 포장 혼입             → EXCLUDE_NONRETAIL 별도 버킷.
 *  D6 fp 내 조성 불균질 위험              → fp 그룹 균질성 게이트.
 *
 * ── V2 성분·함량·제형·경로 SSOT (실측으로 확정한 유일 경로) ───────────────────────
 *  probe 결과 product_drug_extensions 의 active_ingredients/ingredient_summary/dosage_form/
 *  strength 는 OTC 57,572 · RX 119,548 전 행에서 채움 0 이고, product_candidates 에
 *  source_label='MFDS_DRUG_OTC'(허가사항 원문) 은 0 행이다. e약은요 원문에도 성분 섹션이 없다.
 *  → 유일하게 존재하는 구조화 공식 축은 의약품 표준코드 데이터셋의 **일반명코드(성분명코드)** 다.
 *
 *  · 연결: product_identifiers.MFDS_CODE == product_candidates.raw_payload->>'mfdsCode'
 *          (identifier_value 는 13자리 KOREA_DRUG_CODE 이므로 그 축으로 조인하면 0 건이다)
 *          OTC 57,572 / 57,572 = 100% 연결.
 *  · 일반명코드 9자리 = [1-4] 성분 · [5-6] 함량 · [7] 투여경로 · [8-9] 제형.
 *    동일 코드 ⇒ 동일 성분·함량·제형. 제품명 파싱이 전혀 개입하지 않는다.
 *  · [7] 검증(grounded OTC 13,533 행): A(내복) 6,825 — 점안 0 · 주사 0 · 외용어휘 반례 실질 0,
 *    C(외용/국소) 6,696 — 점안 772 · 외용 1,559 · 질정/좌제 80, B(주사) 12.
 *    A 인데 연고/크림/점안 인 반례는 1 건이며 그마저 "크레파스정"의 `파스` 오매칭이다.
 *  · [7-9] 3자 접미가 allowlist 에 없으면 READY 로 올리지 않고 HOLD_ROUTE 로 보낸다(보수).
 *  · 함량은 코드 [5-6] 에 있으므로 약품규격 mL 을 함량으로 오인하는 D4 함정이 구조적으로 소거된다.
 *
 * 결정론: 타임스탬프 미포함 · 모든 배열 정렬 · 2회 실행 byte-identical.
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. env: DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME.
 *   (에이전트는 자격증명 값을 열람·출력·수정하지 않는다. process.env 로만 전달.)
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-remaining-full-corpus-census-v2.ts
 * 산출: src/scripts/data/otc-remaining-full-corpus-census-v2.json
 *       src/scripts/data/otc-remaining-shard-assignment-ssot-v2.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_CENSUS = path.join(OUT_DIR, 'otc-remaining-full-corpus-census-v2.json');
const OUT_SHARD = path.join(OUT_DIR, 'otc-remaining-shard-assignment-ssot-v2.json');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo', 'mfds_drug_otc_nutrition_combo'];

/** 국내 소매 소비자 콘텐츠 대상 아님 — V1 대비 `수출명`/`별첨`/견본 계열 추가 */
const EXCLUDE_RE =
  /수출\s*명|수출\s*용|수출\s*전용|전량\s*수출|for\s*export|export\s*only|군납|군납명|보건소\s*용|보건소\s*납품|비매품|임상\s*시험\s*용|샘플\s*용|견본\s*품|별첨/i;

// ── shard-0 정본 fingerprint 규칙 VERBATIM (원문 축은 V1 과 동일하게 유지) ────────
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

// ── 일반명코드 [7-9] → (route, form) allowlist ────────────────────────────────────
// 미등재 접미는 READY 로 올리지 않는다(HOLD_ROUTE). 미등재 분포는 리포트에 집계한다.
const SUFFIX_MAP: Record<string, { route: string; form: string }> = {
  // A = 내복
  ATB: { route: 'oral', form: '정' },
  ATE: { route: 'oral', form: '장용정' },
  ATR: { route: 'oral', form: '서방정' },
  ACH: { route: 'oral', form: '캡슐' },
  ACS: { route: 'oral', form: '연질캡슐' },
  ACE: { route: 'oral', form: '장용캡슐' },
  ASY: { route: 'oral', form: '시럽' },
  ASS: { route: 'oral', form: '현탁액' },
  ALQ: { route: 'oral', form: '내복액' },
  AGN: { route: 'oral', form: '과립' },
  APD: { route: 'oral', form: '산' },
  // A = 내복이나 구강내 적용 — 용법이 달라 별도 route 로 분리
  ATO: { route: 'oromucosal', form: '트로키' },
  AMS: { route: 'oromucosal', form: '껌' },
  ATD: { route: 'oromucosal', form: '구강용해필름' },
  // C = 외용/국소
  COS: { route: 'ophthalmic', form: '점안액' },
  COO: { route: 'ophthalmic', form: '점안겔' },
  CCM: { route: 'topical', form: '크림' },
  COM: { route: 'topical', form: '연고' },
  CPA: { route: 'topical', form: '파스타' },
  CLT: { route: 'topical', form: '로션' },
  CPL: { route: 'topical', form: '플라스타' },
  CPO: { route: 'topical', form: '카타플라스마' },
  CPC: { route: 'topical', form: '패취' },
  CTB: { route: 'vaginal', form: '질정' },
  // 의도적 미등재(READY 금지): CSP 좌제(직장/질 혼재) · CIS 관류액 · B** 주사 · AXS 등 미상
};

/**
 * 적용부위 미확정 접미 — 코드의 [7]=C 는 "외용" 대분류일 뿐 적용부위를 확정하지 않는다.
 * 실측 반례: 같은 CLQ 안에 렉크린액(직장 관장) · 지노베타딘질세정액(질) ·
 * 퍼스가글액(구강인두) · 그린포비돈세정액(피부) 이 공존한다.
 * 단일 route 로 확정할 수 없으므로 HOLD_ROUTE 로 보낸다(보수). 규모는 리포트에 별도 집계한다.
 */
const SITE_AMBIGUOUS: Record<string, string> = {
  CLQ: '외용액(직장/질/구강/피부 혼재)',
  CDS: '첩부·드레싱·소독(제형 의미 미확정)',
  CSI: '스프레이(구강/피부 혼재)',
};

// ── 비소매 대용량 포장 탐지 (D5) ──────────────────────────────────────────────────
const BULK_RE = /(\d[\d,.]*)\s*(밀리리터|㎖|ml|리터|ℓ|l|그램|그람|g|킬로그램|㎏|kg|갤런|gallon)\b/gi;
function isNonRetailBulk(...texts: Array<string | null | undefined>): boolean {
  for (const raw of texts) {
    const t = (raw || '').normalize('NFKC');
    if (!t) continue;
    if (/갤런|gallon/i.test(t)) return true;
    BULK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BULK_RE.exec(t))) {
      const v = Number(m[1].replace(/,/g, ''));
      if (!Number.isFinite(v)) continue;
      const u = m[2].toLowerCase();
      if (/^(밀리리터|㎖|ml)$/.test(u) && v >= 1000) return true;
      if (/^(리터|ℓ|l)$/.test(u) && v >= 1) return true;
      if (/^(그램|그람|g)$/.test(u) && v >= 1000) return true;
      if (/^(킬로그램|㎏|kg)$/.test(u) && v >= 1) return true;
    }
  }
  return false;
}

async function loadSet(ds: any, q: string): Promise<Set<string>> {
  const r: Array<{ id: string }> = await ds.query(q);
  return new Set(r.map((x) => x.id));
}

// ── 검증 샘플 (WO 명시 — READY 에서 제거/정확 재분류 확인 대상) ────────────────────
const SAMPLE_PATTERNS: Array<[string, RegExp]> = [
  ['VilexCetirin', /VilexCetirin/i],
  ['ArtritoPlast / KEPAX', /ArtritoPlast|KEPAX/i],
  ['KetotopPainReliefPlaster30mg', /KetotopPainRelief/i],
  ['다티펜점안액', /다티펜/],
  ['KEFEN', /KEFEN/i],
  ['UPRO400 / IBUFEN', /UPRO\s*400|IBUFEN/i],
  ['맛/향 변형', /모과맛|청포도향|딸기향|무향/],
  ['Calteo / Artifen', /Calteo|Artifen/i],
  ['포비돈요오드', /포비돈|포비딘/],
  ['벤지다민', /벤지다민/],
  ['알벤다졸', /알벤다졸/],
  ['클로르헥시딘', /클로르헥시딘/],
  ['케토코나졸', /케토코나졸/],
  ['피리티온아연', /피리티온/],
  ['에네마/관장', /에네마|관장/],
  ['빅콘에스600정', /빅콘에스/],
];

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
    extra: { statement_timeout: 900000 },
  });
  await ds.initialize();

  // ── 1) OTC 모집단 ────────────────────────────────────────────────────────────────
  const otc: Array<{ id: string; name: string; spec: string | null }> = await ds.query(`
    SELECT DISTINCT pm.id::text id, pm.name, pm.specification spec
    FROM product_masters pm
    JOIN product_drug_extensions e
      ON e.product_master_id = pm.id AND e.drug_category = 'otc' AND e.deleted_at IS NULL
    ORDER BY 1`);

  // ── 2) 완료/원천 상태 집합 (V1 정의 VERBATIM 유지) ───────────────────────────────
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

  const idRows: Array<{ mid: string; seq: string }> = await ds.query(
    `SELECT product_master_id::text mid, identifier_value seq FROM product_identifiers
     WHERE identifier_type='MFDS_CODE' AND deleted_at IS NULL ORDER BY 1, 2`);
  const seqByMid = new Map<string, string>();
  for (const r of idRows) if (!seqByMid.has(r.mid)) seqByMid.set(r.mid, r.seq);

  const srcSeqRows: Array<{ seq: string }> = await ds.query(
    `SELECT DISTINCT identifier_value seq FROM product_candidates
     WHERE source_label IN ('MFDS_EASY_DRUG_INFO','MFDS_DRUG_OTC') AND deleted_at IS NULL`);
  const officialSourceSeq = new Set(srcSeqRows.map((r) => r.seq));

  // ── 3) 표준코드 축 — master 단위 집계 (V2 신규 · 유일한 구조화 공식 축) ────────────
  const stdRows: Array<{
    mid: string; gencodes: string[] | null; specs: string[] | null;
    totqty: string | null; rows: string; cancelled_rows: string;
  }> = await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'약품규격','')), NULL) specs,
           MAX(NULLIF(pc.raw_payload->>'totalQuantityRaw','')) totqty,
           COUNT(*)::text rows,
           COUNT(*) FILTER (WHERE (pc.raw_payload->>'isCancelled')::boolean IS TRUE)::text cancelled_rows
    FROM product_identifiers pi
    JOIN product_drug_extensions e
      ON e.product_master_id = pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc
      ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
     AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
    GROUP BY 1 ORDER BY 1`);
  const stdByMid = new Map(stdRows.map((r) => [r.mid, r]));

  // ── 4) e약은요 원문 content (fingerprint 근거 — V1 과 동일) ──────────────────────
  const easyContentRows: Array<{ id: string; content: string }> = await ds.query(`
    SELECT pop.id, es.content
    FROM (
      SELECT DISTINCT pm.id::text id
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

  const contentByMid = new Map<string, string>();
  for (const r of easyContentRows) contentByMid.set(r.id, r.content);

  // ── 5) master → record ──────────────────────────────────────────────────────────
  type Rec = {
    id: string; name: string; spec: string | null;
    gencode: string | null; gencodeCount: number; suffix: string | null;
    route: string; form: string; suffixMapped: boolean;
    stdLinked: boolean; allCancelled: boolean;
    exclude: boolean; bulk: boolean;
    grounded: boolean; hasItemSeq: boolean; hasOfficialSource: boolean;
    koDone: boolean; enDone: boolean; nr: boolean; easyOnly: boolean; complete: boolean; koOnly: boolean;
    fp: string | null; identityKey: string | null; parseFail: boolean; missingAxis: string | null;
    cls?: string; reason?: string;
  };

  const unmappedSuffix: Record<string, number> = {};
  const recs: Rec[] = [];
  for (const m of otc) {
    const seq = seqByMid.get(m.id) || '';
    const std = stdByMid.get(m.id);
    const gencodes = (std?.gencodes || []).filter(Boolean).sort();
    const gencode = gencodes.length === 1 ? gencodes[0] : null;
    const suffix = gencode && gencode.length >= 9 ? gencode.slice(6, 9).toUpperCase() : null;
    const mapped = suffix ? SUFFIX_MAP[suffix] : undefined;
    if (suffix && !mapped) unmappedSuffix[suffix] = (unmappedSuffix[suffix] || 0) + 1;

    const grounded = easyKo.has(m.id);
    const koDone = authoredKo.has(m.id);
    const enDone = enCanon.has(m.id);
    const nr = needsReview.has(m.id);

    const route = mapped?.route || 'unknown';
    const form = mapped?.form || '';

    let fp: string | null = null; let identityKey: string | null = null; let parseFail = false;
    let missingAxis: string | null = null;
    const content = contentByMid.get(m.id);
    if (grounded && content) {
      const sec = sections(content);
      const ind = sec['효능·효과'] || '';
      const dos = sec['용법·용량'] || '';
      const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
      if (!ind && !dos && !cau) parseFail = true;
      // 매장 설명서는 효능·용법 2축이 원문에 반드시 있어야 한다.
      // 선례: 빅콘에스600정 = 용법 1축 부재로 HOLD (commit 8bab22471).
      else if (!ind || !dos) missingAxis = !ind && !dos ? 'indication_and_dosage' : !ind ? 'indication' : 'dosage';
      else if (gencode && mapped) {
        const normInd = H(normalize(ind)), normDos = H(normalize(dos)), normCau = H(normalize(cau));
        // V2 fp 축: 원문 3축 + 일반명코드(성분·함량·제형) + 코드 유래 경로. 제품명 미개입.
        fp = H([normInd, normDos, normCau, gencode, route].join('|'));
        identityKey = `${gencode}|${route}`;
      }
    }

    recs.push({
      id: m.id, name: m.name, spec: m.spec,
      gencode, gencodeCount: gencodes.length, suffix,
      route, form, suffixMapped: !!mapped,
      stdLinked: !!std, allCancelled: !!std && Number(std.cancelled_rows) === Number(std.rows),
      exclude: EXCLUDE_RE.test(m.name) || EXCLUDE_RE.test(m.spec || ''),
      bulk: isNonRetailBulk(m.name, m.spec, ...(std?.specs || [])),
      grounded, hasItemSeq: seq !== '',
      hasOfficialSource: officialSourceSeq.has(seq) || grounded || koDone,
      koDone, enDone, nr,
      easyOnly: grounded && !koDone && !nr,
      complete: koDone && enDone,
      koOnly: koDone && !enDone,
      fp, identityKey, parseFail, missingAxis,
    });
  }

  // identityKey → distinct fp (분산 탐지)
  const identityFps = new Map<string, Set<string>>();
  for (const r of recs) {
    if (r.fp && r.identityKey && !r.complete && !r.exclude && !r.bulk) {
      if (!identityFps.has(r.identityKey)) identityFps.set(r.identityKey, new Set());
      identityFps.get(r.identityKey)!.add(r.fp);
    }
  }

  // ── 6) 분류 (상호배타 · 우선순위 고정) ────────────────────────────────────────────
  const classify = (r: Rec): { cls: string; reason: string } => {
    if (r.exclude) return { cls: 'EXCLUDE', reason: 'non_retail_keyword' };
    if (r.bulk) return { cls: 'EXCLUDE_NONRETAIL', reason: 'bulk_package' };
    if (r.complete) return { cls: 'ALREADY_COMPLETE', reason: 'ko_en_canonical' };
    if (r.koOnly) return { cls: 'KO_ONLY', reason: 'en_missing' };
    if (r.nr) return { cls: 'NEEDS_REVIEW', reason: 'authored_needs_review' };
    if (!r.grounded) {
      return r.hasOfficialSource
        ? { cls: 'OTHER_SOURCE_NON_EASY', reason: 'official_source_not_promoted' }
        : { cls: 'HOLD_SOURCE', reason: 'no_official_source' };
    }
    if (r.parseFail) return { cls: 'HOLD_SOURCE', reason: 'easy_content_parse_fail' };
    if (r.missingAxis) return { cls: 'HOLD_SOURCE', reason: `source_axis_missing(${r.missingAxis})` };
    // identity — 구조화 공식 코드 단일 확정 필수
    if (!r.stdLinked) return { cls: 'HOLD_IDENTITY', reason: 'standard_code_row_absent' };
    if (r.gencodeCount === 0) return { cls: 'HOLD_IDENTITY', reason: 'general_name_code_absent' };
    if (r.gencodeCount > 1) return { cls: 'HOLD_IDENTITY', reason: `general_name_code_ambiguous(${r.gencodeCount})` };
    if (!r.gencode || r.gencode.length < 9) return { cls: 'HOLD_IDENTITY', reason: 'general_name_code_malformed' };
    // route — 코드 접미 allowlist 필수
    if (r.suffix && SITE_AMBIGUOUS[r.suffix]) {
      return { cls: 'HOLD_ROUTE', reason: `external_site_ambiguous(${r.suffix})` };
    }
    if (!r.suffixMapped) return { cls: 'HOLD_ROUTE', reason: `suffix_not_allowlisted(${r.suffix})` };
    if (!r.fp || !r.identityKey) return { cls: 'HOLD_IDENTITY', reason: 'fingerprint_unresolved' };
    const disp = identityFps.get(r.identityKey)?.size ?? 1;
    if (disp > 1) return { cls: 'SPLIT_REQUIRED', reason: `identity_dispersed(${disp}fp)` };
    return { cls: 'READY', reason: `gencode=${r.gencode},route=${r.route}` };
  };
  for (const r of recs) { const c = classify(r); r.cls = c.cls; r.reason = c.reason; }

  const byCls = (c: string): Rec[] => recs.filter((r) => r.cls === c);
  const count: Record<string, number> = {};
  for (const r of recs) count[r.cls!] = (count[r.cls!] || 0) + 1;

  // ── 7) fingerprint 그룹 ──────────────────────────────────────────────────────────
  type FpGroup = {
    fp: string; gencode: string; route: string; form: string;
    identityKey: string; size: number; masterIds: string[]; cls: string;
  };
  const fpMap = new Map<string, FpGroup>();
  for (const r of recs) {
    if ((r.cls === 'READY' || r.cls === 'SPLIT_REQUIRED') && r.fp && r.identityKey && r.gencode) {
      let g = fpMap.get(r.fp);
      if (!g) {
        g = { fp: r.fp, gencode: r.gencode, route: r.route, form: r.form,
          identityKey: r.identityKey, size: 0, masterIds: [], cls: r.cls };
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

  // fp 조성 균질성 게이트 (D6)
  const recById = new Map(recs.map((r) => [r.id, r]));
  const heterogeneousFps: string[] = [];
  for (const g of readyGroups) {
    const sigs = new Set(g.masterIds.map((id) => {
      const r = recById.get(id)!; return `${r.gencode}|${r.route}|${r.form}`;
    }));
    if (sigs.size !== 1) heterogeneousFps.push(g.fp);
  }

  const splitByIdentity = new Map<string, { identityKey: string; fps: Array<{ fp: string; size: number }>; masters: number }>();
  for (const g of splitGroups) {
    if (!splitByIdentity.has(g.identityKey)) splitByIdentity.set(g.identityKey, { identityKey: g.identityKey, fps: [], masters: 0 });
    const s = splitByIdentity.get(g.identityKey)!;
    s.fps.push({ fp: g.fp, size: g.size }); s.masters += g.size;
  }
  const splitIdentities = [...splitByIdentity.values()]
    .map((s) => ({ ...s, fps: s.fps.sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1)) }))
    .sort((a, b) => b.masters - a.masters || (a.identityKey < b.identityKey ? -1 : 1));

  // ── 8) READY 3-shard 결정론 균형 분할 ────────────────────────────────────────────
  const SHARDS = ['ga', 'na', 'da'] as const;
  const shardAssign: Record<string, { fps: string[]; masters: number; masterIds: string[]; routes: Record<string, number> }> = {
    ga: { fps: [], masters: 0, masterIds: [], routes: {} },
    na: { fps: [], masters: 0, masterIds: [], routes: {} },
    da: { fps: [], masters: 0, masterIds: [], routes: {} },
  };
  for (const g of readyGroups) {
    const target = [...SHARDS].sort((a, b) =>
      shardAssign[a].masters - shardAssign[b].masters ||
      shardAssign[a].fps.length - shardAssign[b].fps.length ||
      (a < b ? -1 : 1))[0];
    const s = shardAssign[target];
    s.fps.push(g.fp); s.masters += g.size; s.masterIds.push(...g.masterIds);
    s.routes[g.route] = (s.routes[g.route] || 0) + g.size;
  }
  for (const k of SHARDS) { shardAssign[k].masterIds.sort(); shardAssign[k].fps.sort(); }
  const allShardFps = SHARDS.flatMap((k) => shardAssign[k].fps);
  const shardFpIntersection = allShardFps.length - new Set(allShardFps).size;
  const allShardMasters = SHARDS.flatMap((k) => shardAssign[k].masterIds);
  const shardMasterIntersection = allShardMasters.length - new Set(allShardMasters).size;

  // ── 9) 집계 ─────────────────────────────────────────────────────────────────────
  const readyMasters = readyGroups.reduce((a, g) => a + g.size, 0);
  const splitMasters = splitGroups.reduce((a, g) => a + g.size, 0);
  const holdSource = byCls('HOLD_SOURCE'), holdIdentity = byCls('HOLD_IDENTITY'), holdRoute = byCls('HOLD_ROUTE');
  const excl = byCls('EXCLUDE'), exclBulk = byCls('EXCLUDE_NONRETAIL');
  const complete = byCls('ALREADY_COMPLETE'), koOnly = byCls('KO_ONLY');
  const nrBucket = byCls('NEEDS_REVIEW'), otherSrc = byCls('OTHER_SOURCE_NON_EASY');
  const sortedCounts = (o: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  const groupReasons = (rs: Rec[]): Record<string, number> => {
    const o: Record<string, number> = {};
    for (const r of rs) o[r.reason!] = (o[r.reason!] || 0) + 1;
    return sortedCounts(o);
  };

  const fieldCoverage = {
    note: 'product_drug_extensions 구조화 필드(active_ingredients/ingredient_summary/dosage_form/strength) 는 OTC 전 행 채움 0. MFDS_DRUG_OTC 허가원문 candidate 0 행. 따라서 표준코드 일반명코드가 유일 축.',
    stdCodeLinkedMasters: recs.filter((r) => r.stdLinked).length,
    gencodeSingle: recs.filter((r) => r.gencodeCount === 1).length,
    gencodeAbsent: recs.filter((r) => r.gencodeCount === 0).length,
    gencodeAmbiguous: recs.filter((r) => r.gencodeCount > 1).length,
    suffixAllowlisted: recs.filter((r) => r.suffixMapped).length,
    suffixUnmapped: sortedCounts(unmappedSuffix),
    siteAmbiguousDeferredMasters: recs.filter((r) => (r.reason || '').startsWith('external_site_ambiguous')).length,
    siteAmbiguousNote: 'CLQ/CDS/CSI — 적용부위 미확정으로 READY 제외. allowlist 승인 시 회수 가능한 상한.',
    groundedMasters: easyKo.size,
    groundedWithSingleGencode: recs.filter((r) => r.grounded && r.gencodeCount === 1).length,
    allCancelledStdRows: recs.filter((r) => r.allCancelled).length,
  };

  const tallies = {
    t1_otcProductMasterTotal: otc.length,
    t2_authoredKoEnCompleteMasters: complete.length,
    t3_koOnlyMasters: koOnly.length,
    t4_easyOnlyMasters: recs.filter((r) => r.easyOnly && !r.exclude && !r.bulk && !r.complete).length,
    t5_needsReviewMasters: nrBucket.length,
    t6_readyFp: readyGroups.length, t6_readyMasters: readyMasters,
    t7_splitRequiredFp: splitGroups.length, t7_splitRequiredMasters: splitMasters,
    t8_holdSourceMasters: holdSource.length,
    t8a_holdSource_noItemSeq: holdSource.filter((r) => !r.hasItemSeq).length,
    t8b_holdSource_hasItemSeq: holdSource.filter((r) => r.hasItemSeq).length,
    t9_holdIdentityMasters: holdIdentity.length,
    t10_holdRouteMasters: holdRoute.length,
    t11_excludeMasters: excl.length,
    t11a_excludeNonRetailBulkMasters: exclBulk.length,
    x_otherSourceNonEasyMasters: otherSrc.length,
  };

  // ── 10) 검증 샘플 ────────────────────────────────────────────────────────────────
  const verificationSamples = SAMPLE_PATTERNS.map(([label, re]) => {
    const hits = recs.filter((r) => re.test(r.name));
    const byC: Record<string, number> = {};
    for (const h of hits) byC[h.cls!] = (byC[h.cls!] || 0) + 1;
    return {
      label, matched: hits.length, classes: sortedCounts(byC),
      inReady: hits.filter((h) => h.cls === 'READY').length,
      readyRoutes: sortedCounts(hits.filter((h) => h.cls === 'READY')
        .reduce((o: Record<string, number>, h) => { o[h.route] = (o[h.route] || 0) + 1; return o; }, {})),
      examples: hits.slice(0, 3).map((h) => ({ id: h.id, name: h.name, cls: h.cls, route: h.route, reason: h.reason }))
        .sort((a, b) => (a.id < b.id ? -1 : 1)),
    };
  });
  const bigconInReady = recs.filter((r) => /빅콘에스/.test(r.name) && r.cls === 'READY').length;
  const exportNameInReady = recs.filter((r) => /수출\s*명/.test(r.name) && r.cls === 'READY').length;

  // ── 11) V1 대조 ─────────────────────────────────────────────────────────────────
  let v1Compare: Record<string, unknown> = { available: false };
  const V1_PATH = path.join(OUT_DIR, 'otc-remaining-full-corpus-census-v1.json');
  if (fs.existsSync(V1_PATH)) {
    const v1 = JSON.parse(fs.readFileSync(V1_PATH, 'utf8'));
    const v1Ready = new Set<string>((v1.readyGroups || []).flatMap((g: any) => g.masterIds as string[]));
    const v2Ready = new Set(allShardMasters);
    const kept = [...v2Ready].filter((id) => v1Ready.has(id)).length;
    const droppedCls: Record<string, number> = {};
    for (const id of v1Ready) if (!v2Ready.has(id)) {
      const c = recById.get(id)?.cls || 'NOT_IN_UNIVERSE';
      droppedCls[c] = (droppedCls[c] || 0) + 1;
    }
    v1Compare = {
      available: true,
      v1ReadyMasters: v1Ready.size, v2ReadyMasters: v2Ready.size,
      keptFromV1Ready: kept, droppedFromV1Ready: v1Ready.size - kept,
      newlyReadyNotInV1: v2Ready.size - kept,
      droppedByV2Class: sortedCounts(droppedCls),
      note: 'V1 은 생산용 SUPERSEDED_FOR_PRODUCTION. 파일 미수정.',
    };
  }

  const sumCls = Object.values(count).reduce((a, b) => a + b, 0);
  const gates = {
    classSumEqualsUniverse: sumCls === otc.length,
    universe: otc.length, classSum: sumCls,
    readyCompleteIntersection: readyGroups.some((g) => g.masterIds.some((id) => recById.get(id)?.complete)) ? 'FAIL' : 0,
    readyIdentityAllStructured: readyGroups.every((g) => g.masterIds.every((id) => recById.get(id)!.gencodeCount === 1)),
    readyRouteAllOfficial: readyGroups.every((g) => g.masterIds.every((id) => recById.get(id)!.suffixMapped)),
    readyNoNameDerivedAxis: true, // 성분·함량·제형·경로 전 축이 일반명코드 유래. 제품명은 EXCLUDE 판정에만 사용.
    fpCompositionHomogeneous: heterogeneousFps.length === 0,
    heterogeneousFpCount: heterogeneousFps.length,
    readyNoExportOrBulk: readyGroups.every((g) => g.masterIds.every((id) => {
      const r = recById.get(id)!; return !r.exclude && !r.bulk;
    })),
    shardFpIntersection, shardMasterIntersection,
    shardFpSumEqualsReadyFp: allShardFps.length === readyGroups.length,
    shardMasterSumEqualsReadyMasters: allShardMasters.length === readyMasters,
    bigconInReady, exportNameInReady,
    dbWrite: 0,
  };

  const report = {
    wo: 'WO-O4O-OTC-REMAINING-CENSUS-IDENTITY-ROUTE-STRENGTH-CORRECTION-V2',
    supersedes: {
      census: 'otc-remaining-full-corpus-census-v1.json',
      shardSsot: 'otc-remaining-shard-assignment-ssot-v1.json',
      status: 'SUPERSEDED_FOR_PRODUCTION',
      note: 'V1 파일은 삭제·덮어쓰기하지 않는다. 기존 가·나·다 shard 는 생산 금지.',
    },
    agent: 'la', readOnly: true, dbWrite: 0,
    axisSource: {
      identity: '표준코드 일반명코드(성분명코드) 9자리 — [1-4]성분 [5-6]함량 [7]투여경로 [8-9]제형',
      join: "product_identifiers.MFDS_CODE == product_candidates.raw_payload->>'mfdsCode' (identifier_value 는 13자리 KOREA_DRUG_CODE 이므로 조인축 아님)",
      route: '일반명코드 [7-9] 3자 접미 allowlist. 미등재 접미는 HOLD_ROUTE',
      strength: '함량은 코드 [5-6] 에 내포. 약품규격(mL) 은 함량으로 사용하지 않음 → D4 함정 구조적 소거',
      productNameUsage: 'EXCLUDE(수출명·군납·비매품 등) 및 대용량 포장 탐지에만 사용. 성분·함량·제형·경로 판정에 미사용',
      unavailable: ['product_drug_extensions.active_ingredients (채움 0)', 'product_drug_extensions.dosage_form (채움 0)', "product_candidates source_label='MFDS_DRUG_OTC' (0 행)", 'e약은요 원문 성분 섹션 (부재)'],
    },
    corrections: {
      D1: '제품명 괄호 성분 추출 폐기 → 일반명코드',
      D2: `EXCLUDE 확장: ${EXCLUDE_RE.source}`,
      D3: 'route = 일반명코드 접미 allowlist. 미등재 → HOLD_ROUTE',
      D4: '약품규격 mL 을 함량으로 사용하지 않음',
      D5: 'EXCLUDE_NONRETAIL: ≥1000mL · ≥1L · ≥1000g · ≥1kg · 갤런',
      D6: 'fp 그룹 조성 균질성 게이트',
    },
    determinism: 'no timestamp · IDs asc · fpGroups size desc→fp asc · shard greedy(min-master)',
    suffixAllowlist: SUFFIX_MAP,
    fieldCoverage, tallies, classificationCounts: count, gates, v1Compare,
    holdReasons: {
      HOLD_IDENTITY: groupReasons(holdIdentity),
      HOLD_ROUTE: groupReasons(holdRoute),
      HOLD_SOURCE: groupReasons(holdSource),
    },
    verificationSamples,
    shardDesign: {
      note: 'READY fp 만 배정. fp 정확히 1 shard. 각 shard KO+EN 공동 책임. LIVE apply 는 단일 write-owner 순차.',
      ga: { fp: shardAssign.ga.fps.length, masters: shardAssign.ga.masters, routes: shardAssign.ga.routes },
      na: { fp: shardAssign.na.fps.length, masters: shardAssign.na.masters, routes: shardAssign.na.routes },
      da: { fp: shardAssign.da.fps.length, masters: shardAssign.da.masters, routes: shardAssign.da.routes },
      intersectionFp: shardFpIntersection, intersectionMaster: shardMasterIntersection,
    },
    readyGroups: readyGroups.map((g) => ({
      fp: g.fp, gencode: g.gencode, route: g.route, form: g.form, size: g.size, masterIds: g.masterIds,
    })),
    splitRequiredIdentities: splitIdentities.slice(0, 400),
    holdIdentitySample: holdIdentity.slice(0, 60).map((r) => ({ id: r.id, name: r.name, reason: r.reason }))
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
    holdRouteSample: holdRoute.slice(0, 60).map((r) => ({ id: r.id, name: r.name, suffix: r.suffix, reason: r.reason }))
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
    excludeSample: [...excl, ...exclBulk].slice(0, 60).map((r) => ({ id: r.id, name: r.name, cls: r.cls }))
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
  };

  const shardSsot = {
    wo: 'WO-O4O-OTC-REMAINING-CENSUS-IDENTITY-ROUTE-STRENGTH-CORRECTION-V2',
    artifact: 'shard-assignment-ssot',
    agent: 'la', readOnly: true, dbWrite: 0,
    sourceCensus: 'otc-remaining-full-corpus-census-v2.json',
    supersedes: { file: 'otc-remaining-shard-assignment-ssot-v1.json', status: 'SUPERSEDED_FOR_PRODUCTION' },
    principle: [
      'READY fp 만 배정',
      'fp 는 정확히 한 shard',
      '각 shard 는 KO+EN 을 함께 책임',
      'LIVE apply 는 단일 write-owner 순차',
      '기존 완료(ALREADY_COMPLETE) 와 교집합 0',
      '성분·함량·제형·경로는 표준코드 일반명코드로만 확정 — 제품명 미개입',
    ],
    totals: { readyFingerprints: readyGroups.length, readyMasters },
    invariants: {
      fpIntersection: shardFpIntersection,
      masterIntersection: shardMasterIntersection,
      fpSum: allShardFps.length,
      masterSum: allShardMasters.length,
      disjointFromComplete: gates.readyCompleteIntersection === 0,
      identityAllStructured: gates.readyIdentityAllStructured,
      routeAllOfficial: gates.readyRouteAllOfficial,
      fpCompositionHomogeneous: gates.fpCompositionHomogeneous,
      exportNameInReady, bigconInReady,
    },
    shards: Object.fromEntries(SHARDS.map((k) => [k, {
      fingerprints: shardAssign[k].fps.length,
      masters: shardAssign[k].masters,
      routes: shardAssign[k].routes,
      fingerprintList: shardAssign[k].fps,
      masterIds: shardAssign[k].masterIds,
    }])),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_CENSUS, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_SHARD, JSON.stringify(shardSsot, null, 2) + '\n', 'utf8');

  console.log('=== OTC REMAINING CENSUS V2 (identity/route/strength corrected · read-only · dbWrite=0) ===');
  console.log('fieldCoverage =', JSON.stringify(fieldCoverage, null, 2));
  console.log('tallies =', JSON.stringify(tallies, null, 2));
  console.log('classificationCounts =', JSON.stringify(sortedCounts(count), null, 2));
  console.log('holdReasons =', JSON.stringify(report.holdReasons, null, 2));
  console.log('gates =', JSON.stringify(gates, null, 2));
  console.log('v1Compare =', JSON.stringify(v1Compare, null, 2));
  console.log('shardDesign =', JSON.stringify(report.shardDesign, null, 2));
  console.log('OUT:', OUT_CENSUS);
  console.log('OUT:', OUT_SHARD);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
