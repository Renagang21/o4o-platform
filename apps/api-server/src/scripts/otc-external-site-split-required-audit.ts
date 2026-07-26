/**
 * WO-O4O-OTC-EXTERNAL-SITE-SPLIT-REQUIRED-AUDIT-V1 — 에이전트 라 (조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · LIVE apply 0 · 기존 SSOT/감사 결과 수정 0.
 *
 * 목적: 외용 적용부위 회수 감사에서 SPLIT_REQUIRED 로 남은 **179 master** 를 전수 조사하여
 *       생산 가능한 하위 fingerprint 그룹과 계속 보류할 대상을 분리한다.
 *
 * 기준선: 외용 최종 생산 완결 commit `f8549e767` (42 fp / 199 master LIVE)
 *
 * ── 모집단 재현 ──────────────────────────────────────────────────────────────────
 *  회수 감사(`3b1181145`)의 파이프라인을 그대로 재현한다.
 *    CLQ/CDS/CSI · 일반명코드 단일 · grounded · EXCLUDE/대용량/완료/검토중 제외 · 원문 효능+용법 2축 보유
 *    → 용법 원문에서 적용부위 정확히 1종 = RECOVERABLE
 *    → identityKey(gencode|site) 가 2개 이상 fp 로 분산 = SPLIT_REQUIRED
 *  재현 결과가 179 가 아니면 중단 보고한다(WO 중지 조건).
 *
 * ── 하위 그룹 분리 축 (WO 조사원칙 3) ─────────────────────────────────────────────
 *  적용부위 · 투여경로 · 함량 · 제형 · 용법 수치 · 연령 · 사용 기간 · 금기/주의 · 단일제/복합제
 *   · 적용부위/투여경로 : 공식 용법 원문에서 도출한 site (제품명 미사용)
 *   · 함량/제형/단일제·복합제 : 일반명코드 [1-4]성분 [5-6]함량 [7-9]제형 — 공식 코드에 내포
 *   · 용법 수치/연령/기간/금기 : 공식 원문에서 별도 signature 로 추출해 **명시 축**으로 검증
 *  일반명코드·기존 fp 일치는 후보 연결 키일 뿐이며(WO 원칙 4), 최종 동일성은 위 축 전부로 판정한다.
 *
 * ── 판정 ─────────────────────────────────────────────────────────────────────────
 *  EXCLUDE                 수출용·비매품·비소매 대용량
 *  HOLD_PROFESSIONAL_USE   수술·시술·의료진 전용 맥락 (다 세션 `3719b8280` 마커·부정문맥 규칙 재사용)
 *  HOLD_SOURCE             공식 원문 부족 / 적용부위 확정 불가
 *  HOLD_MULTI_ROUTE        한 제품 원문(효능+용법) 안에 복수 경로·적용부위 병존
 *  READY_SPLIT             위 어디에도 해당하지 않고 하위 그룹을 안전하게 나눌 수 있음
 *  ※ 하위 fp 안에 판정이 혼재하면 **fp 전체를 HOLD 로 승격**한다(부분 생산 금지).
 *
 * 결정론: 타임스탬프 미포함 · 모든 배열 정렬 · 2회 실행 byte-identical.
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. env 는 process.env 로만 전달(값 열람·출력 0).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-external-site-split-required-audit.ts
 * 산출: src/scripts/data/otc-external-site-split-required-audit-v1.json
 *       src/scripts/data/otc-external-site-split-required-shard-proposal-v1.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_AUDIT = path.join(OUT_DIR, 'otc-external-site-split-required-audit-v1.json');
const OUT_SHARD = path.join(OUT_DIR, 'otc-external-site-split-required-shard-proposal-v1.json');
const P_FINAL_SSOT = path.join(OUT_DIR, 'otc-external-site-final-approved-ssot-v1.json');
const P_V2_CENSUS = path.join(OUT_DIR, 'otc-remaining-full-corpus-census-v2.json');

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const SH = ['ga', 'na', 'da'] as const;
const EXPECTED_POPULATION = 179;
const WRITE_PER_MASTER = { ko: 4, en: 2, total: 6 };

const EXCLUDE_RE =
  /수출\s*명|수출\s*용|수출\s*전용|전량\s*수출|for\s*export|export\s*only|군납|군납명|보건소\s*용|보건소\s*납품|비매품|임상\s*시험\s*용|샘플\s*용|견본\s*품|별첨/i;
const SITE_AMBIGUOUS = new Set(['CLQ', 'CDS', 'CSI']);

// ── 원문 파싱 (선행 감사 VERBATIM) ────────────────────────────────────────────────
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

// ── 적용부위 탐지 (회수 감사 VERBATIM) ────────────────────────────────────────────
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

// ── 전문용 판정 (다 세션 `3719b8280` VERBATIM 재사용) ─────────────────────────────
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

// ── 안전지문 축 (WO 조사원칙 3 — 명시 검증용) ─────────────────────────────────────
function numericSig(s: string): string {
  const t = normalize(s);
  const n = (t.match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|그램|정|캡슐|매|포|회|시간|일|주|개월|mL|밀리리터|㎖|L|리터|IU|%)/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()).sort();
  return H([...new Set(n)].join('|'));
}
function ageSig(s: string): string {
  const t = normalize(s);
  const a = (t.match(/(만\s?)?\d+\s*(세|개월)\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인|임부|수유부/g) || [])
    .map((x) => x.replace(/\s+/g, '')).sort();
  return H([...new Set(a)].join('|'));
}
function durationSig(s: string): string {
  const t = normalize(s);
  const d = (t.match(/\d+\s*(주|일|개월|회|분|초)\s*(이상|이내|정도|간|연속)?/g) || [])
    .map((x) => x.replace(/\s+/g, '')).sort();
  return H([...new Set(d)].join('|'));
}
function contraSig(caution: string): string {
  const t = normalize(caution);
  const m = t.match(/(.*?)(사용하지\s?(마|않)|투여하지\s?(마|말)|바르지\s?(마|않)|사용해서는\s?안)/);
  return H(normalize(m ? m[1] : t.slice(0, 240)));
}

async function loadSet(ds: any, q: string): Promise<Set<string>> {
  const r: Array<{ id: string }> = await ds.query(q);
  return new Set(r.map((x) => x.id));
}

async function main(): Promise<void> {
  const finalSsot = JSON.parse(fs.readFileSync(P_FINAL_SSOT, 'utf8'));
  const v2Census = JSON.parse(fs.readFileSync(P_V2_CENSUS, 'utf8'));
  const liveExternal = new Set<string>((finalSsot.masters as any[]).map((m) => m.masterId));
  const liveExternalFps = new Set<string>(SH.flatMap((k) => finalSsot.shards[k].fingerprintList as string[]));

  const fpToMasters = new Map<string, string[]>((v2Census.readyGroups as any[]).map((g) => [g.fp, g.masterIds]));
  const v2Applied = new Set<string>();
  for (const k of SH) for (const lang of ['ko', 'en']) {
    const p = path.join(OUT_DIR, `otc-v2-apply-run.${k}.${lang}.json`);
    if (!fs.existsSync(p)) continue;
    for (const r of JSON.parse(fs.readFileSync(p, 'utf8')).reports as any[])
      for (const m of fpToMasters.get(r.fp) || []) v2Applied.add(m);
  }

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

  const otc: Array<{ id: string; name: string; spec: string | null }> = await ds.query(`
    SELECT DISTINCT pm.id::text id, pm.name, pm.specification spec
    FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    ORDER BY 1`);
  const A = `ARRAY['mfds_drug_otc','nutrition_combo','mfds_drug_otc_nutrition_combo']`;
  const easyKo = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND status='canonical'
      AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`);
  const authoredKo = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type = ANY(${A}) AND status='canonical'
      AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`);
  const enCanon = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='en' AND deleted_at IS NULL`);
  const needsReview = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type = ANY(${A}) AND status='needs_review' AND deleted_at IS NULL`);

  const stdRows: Array<{ mid: string; gencodes: string[] | null; specs: string[] | null }> = await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'약품규격','')), NULL) specs
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode'=pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL GROUP BY 1 ORDER BY 1`);
  const stdByMid = new Map(stdRows.map((r) => [r.mid, r]));

  const contentRows: Array<{ id: string; content: string }> = await ds.query(`
    SELECT pop.id, es.content FROM (
      SELECT DISTINCT pm.id::text id FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    ) pop JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`);
  await ds.destroy();
  const contentBy = new Map(contentRows.map((r) => [r.id, r.content]));

  // ── 1) 모집단 재현 ──────────────────────────────────────────────────────────────
  type T = {
    id: string; name: string; spec: string | null; gencode: string; suffix: string;
    ind: string; dos: string; cau: string;
    site: Site | ''; siteEvidence: string; oldFp: string; identityKey: string;
    dosSites: Site[]; indSites: Site[];
  };
  const recoverable: T[] = [];
  for (const m of otc) {
    const std = stdByMid.get(m.id);
    const gcs = (std?.gencodes || []).filter(Boolean).sort();
    if (gcs.length !== 1 || gcs[0].length < 9) continue;
    const gencode = gcs[0];
    const suffix = gencode.slice(6, 9).toUpperCase();
    if (!SITE_AMBIGUOUS.has(suffix)) continue;
    if (EXCLUDE_RE.test(m.name) || EXCLUDE_RE.test(m.spec || '')) continue;
    if (authoredKo.has(m.id)) continue;
    if (needsReview.has(m.id)) continue;
    if (!easyKo.has(m.id)) continue;
    const content = contentBy.get(m.id);
    if (!content) continue;
    const sec = sections(content);
    const ind = sec['효능·효과'] || '', dos = sec['용법·용량'] || '';
    const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
    if (!ind && !dos && !cau) continue;
    if (!ind || !dos) continue;
    const dosFound = detectSites(dos);
    const dosSites = [...new Set(dosFound.map((s) => s.site))].sort();
    if (dosSites.length !== 1) continue;                     // RECOVERABLE 조건
    const site = dosSites[0];
    const oldFp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), gencode, site].join('|'));
    recoverable.push({
      id: m.id, name: m.name, spec: m.spec, gencode, suffix, ind, dos, cau,
      site, siteEvidence: dosFound.find((s) => s.site === site)?.evidence || '',
      oldFp, identityKey: `${gencode}|${site}`,
      dosSites, indSites: [...new Set(detectSites(ind).map((s) => s.site))].sort(),
    });
  }
  const idFps = new Map<string, Set<string>>();
  for (const t of recoverable) {
    if (!idFps.has(t.identityKey)) idFps.set(t.identityKey, new Set());
    idFps.get(t.identityKey)!.add(t.oldFp);
  }
  const population = recoverable.filter((t) => (idFps.get(t.identityKey)?.size ?? 1) > 1)
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const populationReproduced = population.length === EXPECTED_POPULATION;

  // ── 2) 판정 + 안전지문 ──────────────────────────────────────────────────────────
  type V = {
    masterId: string; name: string; gencode: string; suffix: string;
    identityKey: string; oldFp: string; newFp: string;
    verdict: string; reasons: string[];
    site: string; route: string; siteEvidence: string;
    axes: { indication: string; dosage: string; caution: string; numeric: string; age: string; duration: string; contraindication: string; strengthFormCode: string };
    officialExcerpt: { indication: string; dosage: string };
    professionalEvidence: Array<{ code: string; label: string; section: string; quote: string }>;
    fpPromotedHold?: string;
  };
  const verdicts: V[] = [];
  for (const t of population) {
    const indP = normalize(t.ind), dosP = normalize(t.dos), cauP = normalize(t.cau);
    const axes = {
      indication: H(indP), dosage: H(dosP), caution: H(cauP),
      numeric: numericSig(t.dos), age: ageSig(`${t.dos}\n${t.cau}`),
      duration: durationSig(`${t.dos}\n${t.cau}`), contraindication: contraSig(t.cau),
      // 함량[5-6] · 제형[7-9] · 성분[1-4] — 단일제/복합제 구분을 포함하는 공식 코드
      strengthFormCode: t.gencode,
    };
    const newFp = H([axes.indication, axes.dosage, axes.caution, t.gencode, t.site,
      axes.numeric, axes.age, axes.duration, axes.contraindication].join('|'));

    const v: V = {
      masterId: t.id, name: t.name, gencode: t.gencode, suffix: t.suffix,
      identityKey: t.identityKey, oldFp: t.oldFp, newFp,
      verdict: 'READY_SPLIT', reasons: [],
      site: t.site, route: t.site, siteEvidence: t.siteEvidence, axes,
      officialExcerpt: { indication: indP.slice(0, 400), dosage: dosP.slice(0, 400) },
      professionalEvidence: [],
    };

    // (a) EXCLUDE — 모집단 진입 전 걸러지나 재확인
    if (EXCLUDE_RE.test(t.name) || EXCLUDE_RE.test(t.spec || '')) {
      v.verdict = 'EXCLUDE'; v.reasons.push('non_retail_keyword');
    }
    // (b) HOLD_SOURCE
    else if (!indP || !dosP) { v.verdict = 'HOLD_SOURCE'; v.reasons.push('official_text_missing'); }
    // (c) HOLD_PROFESSIONAL_USE
    else {
      const surgical = SURGICAL_CONTEXT.test(indP) || SURGICAL_CONTEXT.test(dosP);
      for (const mk of PRO_MARKERS) {
        if (mk.code === 'APPLICATOR' && !surgical) continue;
        for (const [label, text] of [['효능·효과', indP], ['용법·용량', dosP]] as const) {
          const q = findEvidence(text, mk.re);
          if (q) { v.reasons.push(mk.code); v.professionalEvidence.push({ code: mk.code, label: mk.label, section: label, quote: q }); }
        }
      }
      v.reasons = [...new Set(v.reasons)];
      if (v.reasons.length) v.verdict = 'HOLD_PROFESSIONAL_USE';
      else {
        // (d) HOLD_MULTI_ROUTE — 효능+용법 통합 시 복수 부위 병존
        const union = [...new Set([...t.indSites, ...t.dosSites])].sort();
        if (union.length > 1) {
          v.verdict = 'HOLD_MULTI_ROUTE';
          v.reasons.push(`multi_site(${union.join('/')})`);
        }
      }
    }
    verdicts.push(v);
  }

  // ── 3) 신규 fp 단위 균질화 — 판정 혼재 시 fp 전체 HOLD 승격 ──────────────────────
  const byNew = new Map<string, V[]>();
  for (const v of verdicts) { if (!byNew.has(v.newFp)) byNew.set(v.newFp, []); byNew.get(v.newFp)!.push(v); }
  const promotedFps: string[] = [];
  for (const [fp, arr] of byNew) {
    const kinds = new Set(arr.map((x) => x.verdict));
    if (kinds.size > 1 && kinds.has('READY_SPLIT')) {
      promotedFps.push(fp);
      const hold = arr.find((x) => x.verdict !== 'READY_SPLIT')!.verdict;
      for (const x of arr) if (x.verdict === 'READY_SPLIT') { x.verdict = hold; x.fpPromotedHold = 'mixed_verdict_in_fp'; x.reasons.push('fp_promoted_hold'); }
    }
  }

  // ── 4) 안전지문 내부 일치 검증 ──────────────────────────────────────────────────
  const axisKeys = ['indication', 'dosage', 'caution', 'numeric', 'age', 'duration', 'contraindication', 'strengthFormCode'] as const;
  const heterogeneous: Array<{ newFp: string; axis: string }> = [];
  for (const [fp, arr] of byNew) {
    for (const k of axisKeys) {
      if (new Set(arr.map((x) => (x.axes as any)[k])).size > 1) heterogeneous.push({ newFp: fp, axis: k });
    }
    if (new Set(arr.map((x) => x.site)).size > 1) heterogeneous.push({ newFp: fp, axis: 'site' });
  }

  const ready = verdicts.filter((v) => v.verdict === 'READY_SPLIT').sort((a, b) => (a.masterId < b.masterId ? -1 : 1));
  const counts: Record<string, number> = {};
  for (const v of verdicts) counts[v.verdict] = (counts[v.verdict] || 0) + 1;

  // 신규 fp 그룹(READY 만)
  type G = { newFp: string; oldFps: string[]; gencode: string; suffix: string; route: string; size: number; masterIds: string[] };
  const gmap = new Map<string, G>();
  for (const v of ready) {
    let g = gmap.get(v.newFp);
    if (!g) { g = { newFp: v.newFp, oldFps: [], gencode: v.gencode, suffix: v.suffix, route: v.route, size: 0, masterIds: [] }; gmap.set(v.newFp, g); }
    g.size++; g.masterIds.push(v.masterId); if (!g.oldFps.includes(v.oldFp)) g.oldFps.push(v.oldFp);
  }
  const groups = [...gmap.values()];
  for (const g of groups) { g.masterIds.sort(); g.oldFps.sort(); }
  groups.sort((a, b) => b.size - a.size || (a.newFp < b.newFp ? -1 : 1));

  // ── 5) shard 분배 제안 ──────────────────────────────────────────────────────────
  const sa: Record<string, { fps: string[]; masters: number; masterIds: string[]; routes: Record<string, number> }> =
    { ga: { fps: [], masters: 0, masterIds: [], routes: {} }, na: { fps: [], masters: 0, masterIds: [], routes: {} }, da: { fps: [], masters: 0, masterIds: [], routes: {} } };
  for (const g of groups) {
    const k = [...SH].sort((a, b) => sa[a].masters - sa[b].masters || sa[a].fps.length - sa[b].fps.length || (a < b ? -1 : 1))[0];
    sa[k].fps.push(g.newFp); sa[k].masters += g.size; sa[k].masterIds.push(...g.masterIds);
    sa[k].routes[g.route] = (sa[k].routes[g.route] || 0) + g.size;
  }
  for (const k of SH) { sa[k].fps.sort(); sa[k].masterIds.sort(); }
  const allFps = SH.flatMap((k) => sa[k].fps), allMasters = SH.flatMap((k) => sa[k].masterIds);

  const sorted = (o: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  const routeTotals: Record<string, number> = {};
  for (const v of ready) routeTotals[v.route] = (routeTotals[v.route] || 0) + 1;
  const writePlan = Object.fromEntries(SH.map((k) => [k, {
    masters: sa[k].masters, ko: sa[k].masters * WRITE_PER_MASTER.ko,
    en: sa[k].masters * WRITE_PER_MASTER.en, total: sa[k].masters * WRITE_PER_MASTER.total,
  }]));
  const writeTotal = ready.length * WRITE_PER_MASTER.total;

  const gates = {
    G1_populationReproduced: populationReproduced,
    G1_expected: EXPECTED_POPULATION, G1_actual: population.length,
    G2_noDuplicateInPopulation: population.length === new Set(population.map((t) => t.id)).size,
    G2_verdictSumEqualsPopulation: verdicts.length === population.length,
    G3_newFpInternalConsistent: heterogeneous.length === 0,
    G3_heterogeneousAxes: heterogeneous,
    G4_newFpMasterIntersection: allMasters.length - new Set(allMasters).size,
    G4_shardFpIntersection: allFps.length - new Set(allFps).size,
    G5_liveExternal199Intersection: allMasters.filter((m) => liveExternal.has(m)).length,
    G5_liveExternalFpIntersection: allFps.filter((f) => liveExternalFps.has(f)).length,
    G5_v2Live2509Intersection: allMasters.filter((m) => v2Applied.has(m)).length,
    G6_nameBasedRouteInference: 0,
    G7_officialEvidenceMissing: verdicts.filter((v) => v.verdict === 'READY_SPLIT' && !v.siteEvidence).length,
    G8_professionalUseInReady: ready.filter((v) => v.professionalEvidence.length > 0).length,
    G9_fpPromotedHoldCount: promotedFps.length,
    dbWrite: 0,
  };
  const allPass = gates.G1_populationReproduced && gates.G2_noDuplicateInPopulation
    && gates.G2_verdictSumEqualsPopulation && gates.G3_newFpInternalConsistent
    && gates.G4_newFpMasterIntersection === 0 && gates.G4_shardFpIntersection === 0
    && gates.G5_liveExternal199Intersection === 0 && gates.G5_liveExternalFpIntersection === 0
    && gates.G5_v2Live2509Intersection === 0 && gates.G7_officialEvidenceMissing === 0
    && gates.G8_professionalUseInReady === 0;

  const audit = {
    wo: 'WO-O4O-OTC-EXTERNAL-SITE-SPLIT-REQUIRED-AUDIT-V1',
    status: 'PROPOSAL',
    agent: 'la', readOnly: true, dbWrite: 0,
    baseline: { externalFinalLiveCommit: 'f8549e767', liveFingerprints: 42, liveMasters: liveExternal.size },
    scope: { source: '외용 적용부위 회수 감사 SPLIT_REQUIRED', expected: EXPECTED_POPULATION, reproduced: population.length },
    principles: [
      '공식 효능·효과 / 용법·용량 / 주의사항 원문만을 판정 근거로 사용',
      '제품명으로 적용부위·경로를 추정하지 않음 (EXCLUDE 판정에만 사용)',
      '일반명코드·기존 fp 일치는 후보 연결 키일 뿐 최종 동일성 근거가 아님',
      '하위 그룹 분리 축: 적용부위·경로·함량·제형·용법 수치·연령·기간·금기/주의·단일제/복합제',
      '근거 부족 또는 복수 경로 병존 시 보류',
      '수술·시술·의료진 전용은 생산 후보 제외',
      '신규 fp 안에 판정이 혼재하면 fp 전체를 HOLD 로 승격(부분 생산 금지)',
    ],
    axisDefinition: {
      site_route: '공식 용법·용량 원문에서 도출 (제품명 미사용)',
      strength_form_singleOrCombo: '일반명코드 [1-4]성분 [5-6]함량 [7-9]제형 — 단일제/복합제 구분 포함',
      dosageNumeric: '용법 원문의 수치+단위 집합 signature',
      age: '용법+주의 원문의 연령·대상군 signature',
      duration: '용법+주의 원문의 기간·횟수 signature',
      contraindication: '주의 원문의 금기 선행 문맥 signature',
    },
    markers: {
      professional: PRO_MARKERS.map((m) => ({ code: m.code, label: m.label, pattern: m.re.source })),
      negation: NEGATION.source, surgicalContext: SURGICAL_CONTEXT.source,
      note: '다 세션 3719b8280 의 마커·부정문맥·APPLICATOR 단독배제 규칙을 VERBATIM 재사용',
    },
    verdictCounts: sorted(counts),
    readySplit: { newFingerprints: groups.length, masters: ready.length, routeTotals: sorted(routeTotals) },
    writePlan: { perMaster: WRITE_PER_MASTER, byShard: writePlan, total: writeTotal },
    gates, allGatesPass: allPass,
    fpPromotedToHold: promotedFps.sort(),
    newFingerprintGroups: groups.map((g) => ({
      newFp: g.newFp, oldFps: g.oldFps, gencode: g.gencode, suffix: g.suffix,
      route: g.route, size: g.size, masterIds: g.masterIds,
    })),
    masters: verdicts.sort((a, b) => (a.masterId < b.masterId ? -1 : 1)),
  };

  const shardProposal = {
    wo: 'WO-O4O-OTC-EXTERNAL-SITE-SPLIT-REQUIRED-AUDIT-V1',
    artifact: 'shard-proposal',
    status: 'PROPOSAL — 승인 전 생산 금지',
    agent: 'la', readOnly: true, dbWrite: 0,
    sourceAudit: 'otc-external-site-split-required-audit-v1.json',
    disjointness: {
      externalLive199: gates.G5_liveExternal199Intersection,
      externalLiveFp: gates.G5_liveExternalFpIntersection,
      v2Live2509: gates.G5_v2Live2509Intersection,
    },
    totals: { fingerprints: groups.length, masters: ready.length },
    writePlan: { perMaster: WRITE_PER_MASTER, byShard: writePlan, total: writeTotal },
    shards: Object.fromEntries(SH.map((k) => [k, {
      fingerprints: sa[k].fps.length, masters: sa[k].masters,
      routes: sorted(sa[k].routes), writePlan: writePlan[k],
      fingerprintList: sa[k].fps, masterIds: sa[k].masterIds,
    }])),
  };

  fs.writeFileSync(OUT_AUDIT, JSON.stringify(audit, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_SHARD, JSON.stringify(shardProposal, null, 2) + '\n', 'utf8');

  console.log('=== OTC EXTERNAL SITE — SPLIT_REQUIRED AUDIT (read-only · dbWrite=0 · PROPOSAL) ===');
  console.log('population =', population.length, '(expected', EXPECTED_POPULATION + ')', populationReproduced ? 'REPRODUCED' : '*** MISMATCH ***');
  console.log('verdictCounts =', JSON.stringify(audit.verdictCounts, null, 2));
  console.log('readySplit =', JSON.stringify(audit.readySplit, null, 2));
  console.log('shards =', JSON.stringify(Object.fromEntries(SH.map((k) => [k, { fp: sa[k].fps.length, masters: sa[k].masters, routes: sorted(sa[k].routes), write: writePlan[k].total }])), null, 2));
  console.log('writeTotal =', writeTotal, 'T');
  console.log('gates =', JSON.stringify(gates, null, 2));
  console.log('OUT:', OUT_AUDIT);
  console.log('OUT:', OUT_SHARD);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
