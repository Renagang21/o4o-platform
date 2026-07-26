/**
 * WO-O4O-OTC-UNPRODUCED-LARGE-CENSUS-V1 — 에이전트 라 (대형 조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · dry-run 0 · LIVE apply 0 · 기존 SSOT/감사/원장 수정 0.
 *
 * 목적: STORE KO/EN 설명서가 아직 없는 OTC **전체** 모집단에서
 *       대량 생산 가능한 후보군을 발굴한다. 특정 HOLD 유형 해소 작업이 아니다.
 *
 * ── 모집단 ───────────────────────────────────────────────────────────────────────
 *   drug_category='otc' ProductMaster
 *   ∧ e약은요 STORE ko canonical 보유 (공식 원문 확보)
 *   ∧ authored STORE canonical(ko/en) **미보유** (미생산)
 *
 * ── 기존 생산 완료 4방향 중복 검사 (WO 원칙 6) ────────────────────────────────────
 *   canonical  : authored STORE canonical 존재 → 모집단에서 원천 제외
 *   masterId   : V2 LIVE 2,509 · 외용 회수 LIVE 199 · 외용 SPLIT LIVE 90 과 교집합
 *   fp         : 위 트랙들의 fingerprint 와 교집합
 *   sourceRef  : 위 트랙 apply-run 리포트의 sourceRef 와 교집합
 *
 * ── 축 (15) ──────────────────────────────────────────────────────────────────────
 *   일반명코드 / 성분 / 함량 / 제형 / 투여경로 / 적용부위 / 효능·효과 / 용법·용량 /
 *   연령 / 사용기간 / 금기·주의 / 단일제·복합제 / 전문용 여부 / 수출·비매·취소 / 생산완료 여부
 *
 *   · 성분·함량·제형·단일제/복합제 : 일반명코드 [1-4][5-6][7-9] — 제품명 미사용
 *   · 투여경로 : 코드 접미 allowlist. CLQ/CDS/CSI 는 적용부위 미확정 접미이므로
 *                공식 용법 원문에서 부위를 도출하고 **효능·효과와 대조**한다(WO 원칙 2).
 *   · 코드 경로와 용법 원문이 모순되면 HOLD_MULTI_ROUTE (단방향 오탐 방지용 명시 대조표)
 *
 * ── 판정 ─────────────────────────────────────────────────────────────────────────
 *   EXCLUDE / HOLD_SOURCE / HOLD_PROFESSIONAL_USE / HOLD_ROUTE /
 *   HOLD_MULTI_ROUTE / HOLD_SAFETY_VARIANCE / READY_LARGE / READY_SPLIT
 *   ※ 동일 안전지문 그룹 안에 판정이 혼재하면 그룹 전체를 HOLD 로 승격(부분 생산 금지).
 *
 * 결정론: 타임스탬프 미포함 · 모든 배열 정렬 · 2회 실행 byte-identical.
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. env 는 process.env 로만 전달(값 열람·출력 0).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-unproduced-large-census.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_CENSUS = path.join(OUT_DIR, 'otc-unproduced-large-census-v1.json');
const OUT_LARGE = path.join(OUT_DIR, 'otc-unproduced-ready-large-proposal-v1.json');
const OUT_SPLIT = path.join(OUT_DIR, 'otc-unproduced-ready-split-proposal-v1.json');
const OUT_LEDGER = path.join(OUT_DIR, 'otc-unproduced-hold-exclude-ledger-v1.json');

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const WRITE_PER_MASTER = { ko: 4, en: 2, total: 6 };
const AUTHORED = `ARRAY['mfds_drug_otc','nutrition_combo','mfds_drug_otc_nutrition_combo']`;

const EXCLUDE_RE =
  /수출\s*명|수출\s*용|수출\s*전용|전량\s*수출|for\s*export|export\s*only|군납|군납명|보건소\s*용|보건소\s*납품|비매품|임상\s*시험\s*용|샘플\s*용|견본\s*품|별첨/i;

// ── 원문 파싱 (선행 트랙 VERBATIM) ────────────────────────────────────────────────
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
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.')
    .replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}

// ── 코드 접미 → (route, form) allowlist (V2 census VERBATIM) ──────────────────────
const SUFFIX_MAP: Record<string, { route: string; form: string }> = {
  ATB: { route: 'oral', form: '정' }, ATE: { route: 'oral', form: '장용정' }, ATR: { route: 'oral', form: '서방정' },
  ACH: { route: 'oral', form: '캡슐' }, ACS: { route: 'oral', form: '연질캡슐' }, ACE: { route: 'oral', form: '장용캡슐' },
  ASY: { route: 'oral', form: '시럽' }, ASS: { route: 'oral', form: '현탁액' }, ALQ: { route: 'oral', form: '내복액' },
  AGN: { route: 'oral', form: '과립' }, APD: { route: 'oral', form: '산' },
  ATO: { route: 'oromucosal', form: '트로키' }, AMS: { route: 'oromucosal', form: '껌' }, ATD: { route: 'oromucosal', form: '구강용해필름' },
  COS: { route: 'ophthalmic', form: '점안액' }, COO: { route: 'ophthalmic', form: '점안겔' },
  CCM: { route: 'topical', form: '크림' }, COM: { route: 'topical', form: '연고' }, CPA: { route: 'topical', form: '파스타' },
  CLT: { route: 'topical', form: '로션' }, CPL: { route: 'topical', form: '플라스타' },
  CPO: { route: 'topical', form: '카타플라스마' }, CPC: { route: 'topical', form: '패취' },
  CTB: { route: 'vaginal', form: '질정' },
};
/** 적용부위 미확정 접미 — 공식 용법 원문으로 부위를 도출한다 */
const SITE_AMBIGUOUS: Record<string, string> = { CLQ: '외용액', CDS: '첩부·드레싱·소독', CSI: '스프레이' };

// ── 적용부위 탐지 (외용 트랙 VERBATIM) ────────────────────────────────────────────
type Site = 'cutaneous' | 'oromucosal' | 'vaginal' | 'rectal' | 'ophthalmic' | 'nasal' | 'otic';
const SITE_PATTERNS: Array<{ site: Site; re: RegExp }> = [
  { site: 'rectal', re: /항문|직장\s?내|직장에|관장/ },
  { site: 'vaginal', re: /질\s?내|질강|질에|질세정|질\s?점막/ },
  { site: 'oromucosal', re: /구강|입\s?안|양치|가글|함수|인후|인두|목구멍|헹구|씹어|잇몸/ },
  { site: 'ophthalmic', re: /결막낭|눈에|안구|점안/ },
  { site: 'nasal', re: /비강|콧\s?속|코\s?안|코에/ },
  { site: 'otic', re: /귀\s?안|귓\s?속|외이도/ },
  { site: 'cutaneous', re: /피부|환부|患部|상처\s?부위|도포|바른다|바르고|바를|문지르|씻어\s?낸다|씻어\s?내고|소독한다|소독하여|닦아\s?낸다|국소\s?부위/ },
];
function detectSites(text: string): Array<{ site: Site; evidence: string }> {
  const t = normalize(text);
  const found: Array<{ site: Site; evidence: string }> = [];
  for (const p of SITE_PATTERNS) {
    const m = t.match(p.re);
    if (!m) continue;
    const i = Math.max(0, (m.index ?? 0) - 25);
    found.push({ site: p.site, evidence: t.slice(i, (m.index ?? 0) + m[0].length + 35).trim() });
  }
  return found;
}

/**
 * 코드 유래 경로 ↔ 용법 원문 모순 대조표 (WO 원칙 2).
 * 오탐을 막기 위해 "명백히 양립 불가한 표현"만 나열한다.
 */
const ROUTE_CONTRADICTION: Record<string, RegExp> = {
  oral: /질\s?내|질강에|항문|직장\s?내|결막낭|점안합|비강\s?내|외이도/,
  oromucosal: /질\s?내|항문|직장\s?내|결막낭|점안합/,
  ophthalmic: /복용합|삼킨|질\s?내|항문|직장\s?내/,
  topical: /복용합|삼킨|경구\s?투여/,
  vaginal: /복용합|삼킨|결막낭|점안합/,
};

// ── 전문용 판정 (다 세션 `3719b8280` VERBATIM) ────────────────────────────────────
const NEGATION = /제외|해당하지\s*않|사용하지\s*않|아닙니다/;
function isNegated(text: string, start: number, end: number): boolean {
  const open = text.lastIndexOf('(', start);
  if (open >= 0) {
    const close = text.indexOf(')', end);
    if (close > open && NEGATION.test(text.slice(open + 1, close))) return true;
  }
  return NEGATION.test(text.slice(end, Math.min(text.length, end + 30)));
}
const SURGICAL_CONTEXT = /수술|시술|무균|멸균|처치\s*부위|외과/;
const PRO_MARKERS: Array<{ code: string; label: string; re: RegExp }> = [
  { code: 'SURGEON_HAND', label: '수술자 손 소독', re: /수술자(?:의)?\s*손|수술\s*시\s*수술자|수술\s*전\s*손|손\s*소독[^.]{0,30}수술|수술[^.]{0,20}손\s*소독/ },
  { code: 'SCRUB', label: '스크럽·브러시 세정', re: /스크\s?럽|scrub|브러시|솔을?\s*사용하여\s*문지/i },
  { code: 'SURGICAL_SITE', label: '수술부위 피부 소독', re: /수술\s*부위|수술부위|수술\s*전\s*피부|술전\s*피부|수술\s*예정\s*부위|수술\s*절개/ },
  { code: 'APPLICATOR', label: '수술부위 어플리케이터', re: /어플리케이터|어플리케타|applicator/i },
  { code: 'ASEPTIC', label: '무균술·수술 준비', re: /무균\s*(?:조작|술|적|상태)|멸균\s*장갑|수술실|수술\s*준비|외과적\s*손\s*소독/ },
];
function findEvidence(text: string, re: RegExp, span = 60): string | null {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = g.exec(text))) {
    const end = m.index + m[0].length;
    if (isNegated(text, m.index, end)) continue;
    return text.slice(Math.max(0, m.index - span), Math.min(text.length, end + span)).trim();
  }
  return null;
}

// ── 안전지문 축 ───────────────────────────────────────────────────────────────────
function numericTokens(s: string): string[] {
  return [...new Set((normalize(s).match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|그램|정|캡슐|매|포|회|시간|일|주|개월|mL|밀리리터|㎖|L|리터|IU|%)/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()))].sort();
}
function ageTokens(s: string): string[] {
  return [...new Set((normalize(s).match(/(만\s?)?\d+\s*(세|개월)\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인|임부|수유부/g) || [])
    .map((x) => x.replace(/\s+/g, '')))].sort();
}
function durationTokens(s: string): string[] {
  return [...new Set((normalize(s).match(/\d+\s*(주|일|개월|회|분|초)\s*(이상|이내|정도|간|연속)?/g) || [])
    .map((x) => x.replace(/\s+/g, '')))].sort();
}
function contraSig(caution: string): string {
  const t = normalize(caution);
  const m = t.match(/(.*?)(복용하지\s?(마|않)|사용하지\s?(마|않)|투여하지\s?(마|말)|바르지\s?(마|않)|사용해서는\s?안|복용해서는\s?안)/);
  return H(normalize(m ? m[1] : t.slice(0, 240)));
}

async function loadSet(ds: any, q: string): Promise<Set<string>> {
  const r: Array<{ id: string }> = await ds.query(q);
  return new Set(r.map((x) => x.id));
}

async function main(): Promise<void> {
  // ── 선행 트랙 LIVE 대상 (masterId / fp / sourceRef) ──────────────────────────────
  const liveMasters = new Set<string>(), liveFps = new Set<string>(), liveSourceRefs = new Set<string>();
  const readJson = (f: string): any | null => {
    const p = path.join(OUT_DIR, f);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
  };
  const v2Census = readJson('otc-remaining-full-corpus-census-v2.json');
  const fpToMasters = new Map<string, string[]>((v2Census?.readyGroups || []).map((g: any) => [g.fp, g.masterIds]));
  for (const k of ['ga', 'na', 'da']) for (const lang of ['ko', 'en']) {
    for (const f of [`otc-v2-apply-run.${k}.${lang}.json`, `otc-external-site-final-apply-run.${k}.${lang}.json`]) {
      const j = readJson(f); if (!j?.reports) continue;
      for (const r of j.reports as any[]) {
        if (r.fp) { liveFps.add(r.fp); for (const m of fpToMasters.get(r.fp) || []) liveMasters.add(m); }
        if (r.sourceRef) liveSourceRefs.add(String(r.sourceRef));
      }
    }
  }
  for (const f of ['otc-external-site-final-approved-ssot-v1.json', 'otc-external-site-recovery-approved-ssot-v1.json']) {
    const j = readJson(f); if (!j) continue;
    for (const m of (j.masters || []) as any[]) { liveMasters.add(m.masterId); if (m.fp) liveFps.add(m.fp); }
  }
  const splitAudit = readJson('otc-external-site-split-required-audit-v1.json');
  for (const m of (splitAudit?.masters || []) as any[]) if (m.verdict === 'READY_SPLIT') { liveMasters.add(m.masterId); liveFps.add(m.newFp); }

  // ── DB ──────────────────────────────────────────────────────────────────────────
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 1800000 },
  });
  await ds.initialize();

  const otcTotal: Array<{ n: string }> = await ds.query(`
    SELECT COUNT(DISTINCT pm.id)::text n FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL`);
  const authoredAny = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND source_type = ANY(${AUTHORED})`);

  const pop: Array<{ id: string; name: string; spec: string | null; content: string }> = await ds.query(`
    SELECT pm.id::text id, pm.name, pm.specification spec, es.content
    FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true
    WHERE NOT EXISTS (
      SELECT 1 FROM shared_product_descriptions a
      WHERE a.master_id=pm.id AND a.description_type='STORE' AND a.status='canonical'
        AND a.deleted_at IS NULL AND a.source_type = ANY(${AUTHORED}))
    ORDER BY pm.id`);

  const stdRows: Array<{ mid: string; gencodes: string[] | null; specs: string[] | null; rows: string; cancelled: string }> = await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'약품규격','')), NULL) specs,
           COUNT(*)::text rows,
           COUNT(*) FILTER (WHERE (pc.raw_payload->>'isCancelled')::boolean IS TRUE)::text cancelled
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode'=pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL GROUP BY 1 ORDER BY 1`);
  await ds.destroy();
  const stdBy = new Map(stdRows.map((r) => [r.mid, r]));

  // ── 판정 ────────────────────────────────────────────────────────────────────────
  type Rec = {
    masterId: string; name: string; verdict: string; reasons: string[];
    gencode: string | null; suffix: string | null; ingredientCode: string | null;
    route: string; form: string; site: string; siteEvidence: string;
    safetyFp: string | null; identityKey: string | null;
    axes: Record<string, string>;
    officialExcerpt: { indication: string; dosage: string };
    professionalEvidence: Array<{ code: string; section: string; quote: string }>;
  };
  const recs: Rec[] = [];
  const unmappedSuffix: Record<string, number> = {};

  for (const m of pop) {
    const std = stdBy.get(m.id);
    const gcs = (std?.gencodes || []).filter(Boolean).sort();
    const gencode = gcs.length === 1 && gcs[0].length >= 9 ? gcs[0] : null;
    const suffix = gencode ? gencode.slice(6, 9).toUpperCase() : null;
    const mapped = suffix ? SUFFIX_MAP[suffix] : undefined;

    const sec = sections(m.content);
    const ind = sec['효능·효과'] || '', dos = sec['용법·용량'] || '';
    const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
    const indP = normalize(ind), dosP = normalize(dos), cauP = normalize(cau);

    const rec: Rec = {
      masterId: m.id, name: m.name, verdict: 'READY_LARGE', reasons: [],
      gencode, suffix, ingredientCode: gencode ? gencode.slice(0, 6) : null,
      route: mapped?.route || '', form: mapped?.form || '', site: '', siteEvidence: '',
      safetyFp: null, identityKey: null, axes: {},
      officialExcerpt: { indication: indP.slice(0, 300), dosage: dosP.slice(0, 300) },
      professionalEvidence: [],
    };

    // 1) EXCLUDE
    const cancelledAll = !!std && Number(std.cancelled) === Number(std.rows) && Number(std.rows) > 0;
    if (EXCLUDE_RE.test(m.name) || EXCLUDE_RE.test(m.spec || '')) { rec.verdict = 'EXCLUDE'; rec.reasons.push('non_retail_keyword'); }
    else if (cancelledAll) { rec.verdict = 'EXCLUDE'; rec.reasons.push('all_standard_codes_cancelled'); }
    // 2) HOLD_SOURCE
    else if (!indP || !dosP || !cauP) {
      rec.verdict = 'HOLD_SOURCE';
      rec.reasons.push(`missing(${[!indP && 'indication', !dosP && 'dosage', !cauP && 'caution'].filter(Boolean).join('/')})`);
    } else {
      // 3) HOLD_PROFESSIONAL_USE
      const surgical = SURGICAL_CONTEXT.test(indP) || SURGICAL_CONTEXT.test(dosP);
      for (const mk of PRO_MARKERS) {
        if (mk.code === 'APPLICATOR' && !surgical) continue;
        for (const [label, text] of [['효능·효과', indP], ['용법·용량', dosP]] as const) {
          const q = findEvidence(text, mk.re);
          if (q) { rec.reasons.push(mk.code); rec.professionalEvidence.push({ code: mk.code, section: label, quote: q }); }
        }
      }
      rec.reasons = [...new Set(rec.reasons)];
      if (rec.reasons.length) rec.verdict = 'HOLD_PROFESSIONAL_USE';
      // 4) HOLD_ROUTE
      else if (!gencode) { rec.verdict = 'HOLD_ROUTE'; rec.reasons.push(gcs.length === 0 ? 'general_name_code_absent' : `general_name_code_ambiguous(${gcs.length})`); }
      else if (!mapped && !SITE_AMBIGUOUS[suffix!]) {
        unmappedSuffix[suffix!] = (unmappedSuffix[suffix!] || 0) + 1;
        rec.verdict = 'HOLD_ROUTE'; rec.reasons.push(`suffix_not_allowlisted(${suffix})`);
      } else {
        const dosFound = detectSites(dos), indFound = detectSites(ind);
        const dosSites = [...new Set(dosFound.map((s) => s.site))].sort();
        const indSites = [...new Set(indFound.map((s) => s.site))].sort();
        if (!mapped) {
          // 적용부위 미확정 접미 — 용법에서 부위 도출 + 효능 대조
          if (dosSites.length === 0) { rec.verdict = 'HOLD_ROUTE'; rec.reasons.push(`site_not_stated(${suffix})`); }
          else if (dosSites.length > 1) { rec.verdict = 'HOLD_MULTI_ROUTE'; rec.reasons.push(`dosage_multi_site(${dosSites.join('/')})`); }
          else {
            const union = [...new Set([...indSites, ...dosSites])].sort();
            if (union.length > 1) { rec.verdict = 'HOLD_MULTI_ROUTE'; rec.reasons.push(`indication_dosage_site_conflict(${union.join('/')})`); }
            else { rec.route = dosSites[0]; rec.site = dosSites[0]; rec.form = SITE_AMBIGUOUS[suffix!]; rec.siteEvidence = dosFound.find((s) => s.site === dosSites[0])!.evidence; }
          }
        } else {
          // 코드 유래 경로 ↔ 용법 원문 모순 대조
          rec.site = mapped.route;
          const contra = ROUTE_CONTRADICTION[mapped.route];
          const hit = contra ? findEvidence(dosP, contra) : null;
          if (hit) { rec.verdict = 'HOLD_MULTI_ROUTE'; rec.reasons.push(`code_route_vs_dosage_conflict(${mapped.route})`); rec.siteEvidence = hit; }
          else rec.siteEvidence = (dosFound[0]?.evidence) || dosP.slice(0, 90);
        }
      }
      // 5) HOLD_SAFETY_VARIANCE — 안전 동일성 검증 축을 원문에서 추출 불가
      if (rec.verdict === 'READY_LARGE') {
        const num = numericTokens(dos), age = ageTokens(`${dos}\n${cau}`), dur = durationTokens(`${dos}\n${cau}`);
        if (num.length === 0 && age.length === 0) {
          rec.verdict = 'HOLD_SAFETY_VARIANCE'; rec.reasons.push('no_dosage_numeric_and_no_age_basis');
        } else {
          rec.axes = {
            indication: H(indP), dosage: H(dosP), caution: H(cauP),
            numeric: H(num.join('|')), age: H(age.join('|')), duration: H(dur.join('|')),
            contraindication: contraSig(cau), codeIngredientStrength: gencode!.slice(0, 6),
            codeForm: suffix!, route: rec.route,
          };
          rec.safetyFp = H(Object.values(rec.axes).join('|'));
          rec.identityKey = `${gencode}|${rec.route}`;
        }
      }
    }
    recs.push(rec);
  }

  // ── 안전지문 그룹 · 판정 혼재 승격 ──────────────────────────────────────────────
  const byFp = new Map<string, Rec[]>();
  for (const r of recs) if (r.safetyFp) { if (!byFp.has(r.safetyFp)) byFp.set(r.safetyFp, []); byFp.get(r.safetyFp)!.push(r); }
  const heterogeneous: Array<{ fp: string; axis: string }> = [];
  for (const [fp, arr] of byFp) for (const k of Object.keys(arr[0].axes))
    if (new Set(arr.map((x) => x.axes[k])).size > 1) heterogeneous.push({ fp, axis: k });

  // identity 분산 → READY_LARGE / READY_SPLIT
  const idFps = new Map<string, Set<string>>();
  for (const r of recs) if (r.safetyFp && r.identityKey) {
    if (!idFps.has(r.identityKey)) idFps.set(r.identityKey, new Set());
    idFps.get(r.identityKey)!.add(r.safetyFp);
  }
  for (const r of recs) if (r.safetyFp && r.identityKey && r.verdict === 'READY_LARGE') {
    if ((idFps.get(r.identityKey)?.size ?? 1) > 1) { r.verdict = 'READY_SPLIT'; r.reasons.push(`identity_dispersed(${idFps.get(r.identityKey)!.size}fp)`); }
  }

  // ── 집계 ────────────────────────────────────────────────────────────────────────
  const sorted = (o: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  const tally = (arr: Rec[], f: (r: Rec) => string): Record<string, number> => {
    const o: Record<string, number> = {}; for (const r of arr) { const k = f(r); if (k) o[k] = (o[k] || 0) + 1; } return sorted(o);
  };
  const counts = tally(recs, (r) => r.verdict);
  const ready = recs.filter((r) => r.verdict === 'READY_LARGE' || r.verdict === 'READY_SPLIT');

  type G = { fp: string; kind: string; gencode: string; suffix: string; route: string; form: string; ingredientCode: string; size: number; masterIds: string[] };
  const gmap = new Map<string, G>();
  for (const r of ready) {
    let g = gmap.get(r.safetyFp!);
    if (!g) g = gmap.set(r.safetyFp!, { fp: r.safetyFp!, kind: r.verdict, gencode: r.gencode!, suffix: r.suffix!, route: r.route, form: r.form, ingredientCode: r.ingredientCode!, size: 0, masterIds: [] }).get(r.safetyFp!)!;
    g.size++; g.masterIds.push(r.masterId);
  }
  const groups = [...gmap.values()];
  for (const g of groups) g.masterIds.sort();
  groups.sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));
  const gLarge = groups.filter((g) => g.kind === 'READY_LARGE'), gSplit = groups.filter((g) => g.kind === 'READY_SPLIT');
  const mLarge = gLarge.reduce((a, g) => a + g.size, 0), mSplit = gSplit.reduce((a, g) => a + g.size, 0);

  // 생산 단위 제안
  const totalReady = ready.length;
  const unitCount = totalReady < 500 ? 1 : totalReady <= 1500 ? 2 : 3;
  const units: Array<{ unit: string; fingerprints: number; masters: number; write: number; fingerprintList: string[] }> =
    Array.from({ length: unitCount }, (_, i) => ({ unit: `unit-${i + 1}`, fingerprints: 0, masters: 0, write: 0, fingerprintList: [] }));
  for (const g of groups) {
    const u = [...units].sort((a, b) => a.masters - b.masters || a.fingerprints - b.fingerprints || (a.unit < b.unit ? -1 : 1))[0];
    u.fingerprints++; u.masters += g.size; u.fingerprintList.push(g.fp);
  }
  for (const u of units) { u.fingerprintList.sort(); u.write = u.masters * WRITE_PER_MASTER.total; }

  const allGroupMasters = groups.flatMap((g) => g.masterIds);
  const rank = (arr: G[], n = 20): any[] => arr.slice(0, n).map((g) => ({ fp: g.fp, kind: g.kind, gencode: g.gencode, route: g.route, form: g.form, masters: g.size }));

  const gates = {
    G1_otcTotal: Number(otcTotal[0].n),
    G1_authoredCanonicalMasters: authoredAny.size,
    G1_populationReproduced: pop.length,
    G1_populationSumEqualsVerdicts: recs.length === pop.length,
    G2_storeCanonicalInPopulation: pop.filter((p) => authoredAny.has(p.id)).length,
    G3_liveMasterIntersection: allGroupMasters.filter((m) => liveMasters.has(m)).length,
    G3_liveFpIntersection: groups.filter((g) => liveFps.has(g.fp)).length,
    G3_liveSourceRefIntersection: allGroupMasters.filter((m) => liveSourceRefs.has(m)).length,
    G3_liveMasterTotal: liveMasters.size, G3_liveFpTotal: liveFps.size, G3_liveSourceRefTotal: liveSourceRefs.size,
    G4_duplicateMasterInGroups: allGroupMasters.length - new Set(allGroupMasters).size,
    G4_missingMasters: recs.length - Object.values(counts).reduce((a, b) => a + b, 0),
    G5_safetyFpHeterogeneous: heterogeneous.length,
    G6_readyEvidenceMissing: ready.filter((r) => !r.siteEvidence).length,
    G7_nameBasedInference: 0,
    G8_professionalUseInReady: ready.filter((r) => r.professionalEvidence.length > 0).length,
    G9_excludeInReady: ready.filter((r) => EXCLUDE_RE.test(r.name)).length,
    G10_unitMasterSumEqualsReady: units.reduce((a, u) => a + u.masters, 0) === totalReady,
    dbWrite: 0,
  };
  const allPass = gates.G1_populationSumEqualsVerdicts && gates.G2_storeCanonicalInPopulation === 0
    && gates.G3_liveMasterIntersection === 0 && gates.G3_liveFpIntersection === 0 && gates.G3_liveSourceRefIntersection === 0
    && gates.G4_duplicateMasterInGroups === 0 && gates.G4_missingMasters === 0
    && gates.G5_safetyFpHeterogeneous === 0 && gates.G6_readyEvidenceMissing === 0
    && gates.G8_professionalUseInReady === 0 && gates.G9_excludeInReady === 0 && gates.G10_unitMasterSumEqualsReady;

  const holds = recs.filter((r) => r.verdict.startsWith('HOLD') || r.verdict === 'EXCLUDE');
  const summary = {
    wo: 'WO-O4O-OTC-UNPRODUCED-LARGE-CENSUS-V1', status: 'PROPOSAL',
    agent: 'la', readOnly: true, dbWrite: 0,
    population: {
      otcTotal: Number(otcTotal[0].n), authoredCanonicalMasters: authoredAny.size,
      unproducedWithOfficialSource: pop.length,
      note: '모집단 = OTC ∧ e약은요 STORE ko canonical 보유 ∧ authored STORE canonical 미보유',
    },
    verdictCounts: counts,
    ready: {
      READY_LARGE: { fingerprints: gLarge.length, masters: mLarge },
      READY_SPLIT: { fingerprints: gSplit.length, masters: mSplit },
      total: { fingerprints: groups.length, masters: totalReady },
      routeTotals: tally(ready, (r) => r.route),
      formTotals: tally(ready, (r) => r.form),
      suffixTotals: tally(ready, (r) => r.suffix || ''),
      ingredientGroupTop: Object.entries(tally(ready, (r) => r.ingredientCode || '')).slice(0, 25)
        .map(([code, masters]) => ({ ingredientStrengthCode: code, masters })),
    },
    writePlan: { perMaster: WRITE_PER_MASTER, koTotal: totalReady * WRITE_PER_MASTER.ko, enTotal: totalReady * WRITE_PER_MASTER.en, total: totalReady * WRITE_PER_MASTER.total },
    productionUnitProposal: {
      rule: '<500 → 1 단위 / 500~1,500 → 2 단위 / >1,500 → 3 단위',
      readyMasters: totalReady, units: unitCount,
      note: '조사 단계이므로 가·나·다 shard 를 만들지 않는다. 단위는 승인 단계에서 확정한다.',
      breakdown: units.map((u) => ({ unit: u.unit, fingerprints: u.fingerprints, masters: u.masters, write: u.write })),
    },
    rankings: {
      byMasterCount: rank(groups),
      byRouteSingleForm: rank(groups.filter((g) => SUFFIX_MAP[g.suffix]), 20),
      largestReadyLarge: rank(gLarge, 15),
      largestReadySplit: rank(gSplit, 15),
    },
    holdBreakdown: {
      HOLD_SOURCE: tally(recs.filter((r) => r.verdict === 'HOLD_SOURCE'), (r) => r.reasons[0] || ''),
      HOLD_ROUTE: tally(recs.filter((r) => r.verdict === 'HOLD_ROUTE'), (r) => r.reasons[0] || ''),
      HOLD_MULTI_ROUTE: tally(recs.filter((r) => r.verdict === 'HOLD_MULTI_ROUTE'), (r) => r.reasons[0] || ''),
      HOLD_PROFESSIONAL_USE: tally(recs.filter((r) => r.verdict === 'HOLD_PROFESSIONAL_USE'), (r) => r.reasons[0] || ''),
      HOLD_SAFETY_VARIANCE: tally(recs.filter((r) => r.verdict === 'HOLD_SAFETY_VARIANCE'), (r) => r.reasons[0] || ''),
      EXCLUDE: tally(recs.filter((r) => r.verdict === 'EXCLUDE'), (r) => r.reasons[0] || ''),
      unmappedSuffix: sorted(unmappedSuffix),
    },
    gates, allGatesPass: allPass,
    exclusionSources: {
      liveMasters: liveMasters.size, liveFingerprints: liveFps.size, liveSourceRefs: liveSourceRefs.size,
      tracks: ['OTC V2 LIVE', '외용 적용부위 회수 LIVE', '외용 READY_SPLIT', 'authored STORE canonical 전량'],
    },
  };

  const mkProposal = (kind: string, gs: G[], file: string): any => ({
    wo: 'WO-O4O-OTC-UNPRODUCED-LARGE-CENSUS-V1', artifact: file, status: 'PROPOSAL — 승인 전 생산 금지',
    agent: 'la', readOnly: true, dbWrite: 0, sourceCensus: 'otc-unproduced-large-census-v1.json',
    kind, totals: { fingerprints: gs.length, masters: gs.reduce((a, g) => a + g.size, 0) },
    writePlan: { perMaster: WRITE_PER_MASTER, total: gs.reduce((a, g) => a + g.size, 0) * WRITE_PER_MASTER.total },
    groups: gs.map((g) => ({
      fp: g.fp, gencode: g.gencode, suffix: g.suffix, route: g.route, form: g.form,
      ingredientStrengthCode: g.ingredientCode, size: g.size, masterIds: g.masterIds,
      sample: (() => { const r = recs.find((x) => x.masterId === g.masterIds[0])!; return { name: r.name, indication: r.officialExcerpt.indication.slice(0, 160), dosage: r.officialExcerpt.dosage.slice(0, 160), siteEvidence: r.siteEvidence.slice(0, 120) }; })(),
    })),
  });

  const ledger = {
    wo: 'WO-O4O-OTC-UNPRODUCED-LARGE-CENSUS-V1', artifact: 'hold-exclude-ledger',
    agent: 'la', readOnly: true, dbWrite: 0,
    counts: tally(holds, (r) => r.verdict),
    entries: holds.map((r) => ({
      masterId: r.masterId, name: r.name, verdict: r.verdict, reasons: r.reasons,
      gencode: r.gencode, suffix: r.suffix,
      officialExcerpt: r.officialExcerpt,
      professionalEvidence: r.professionalEvidence,
    })).sort((a, b) => (a.masterId < b.masterId ? -1 : 1)),
  };

  fs.writeFileSync(OUT_CENSUS, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_LARGE, JSON.stringify(mkProposal('READY_LARGE', gLarge, 'ready-large-proposal'), null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_SPLIT, JSON.stringify(mkProposal('READY_SPLIT', gSplit, 'ready-split-proposal'), null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_LEDGER, JSON.stringify(ledger, null, 2) + '\n', 'utf8');

  console.log('=== OTC UNPRODUCED LARGE CENSUS (read-only · dbWrite=0 · PROPOSAL) ===');
  console.log('population =', JSON.stringify(summary.population, null, 2));
  console.log('verdictCounts =', JSON.stringify(counts, null, 2));
  console.log('ready =', JSON.stringify({ ...summary.ready, ingredientGroupTop: summary.ready.ingredientGroupTop.slice(0, 8) }, null, 2));
  console.log('writePlan =', JSON.stringify(summary.writePlan));
  console.log('productionUnitProposal =', JSON.stringify(summary.productionUnitProposal, null, 2));
  console.log('holdBreakdown =', JSON.stringify(summary.holdBreakdown, null, 2));
  console.log('gates =', JSON.stringify(gates, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
