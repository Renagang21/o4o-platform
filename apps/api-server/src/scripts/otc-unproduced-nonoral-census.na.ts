/**
 * WO-O4O-OTC-UNPRODUCED-NONORAL-PRODUCTION-CENSUS-AND-APPROVAL-PROPOSAL-V1 — 에이전트 나
 *
 * ⚠️ READ-ONLY · **DB write 0** · 설명서 생성 0 · dry-run 0 · LIVE apply 0.
 *
 * 라 대형 census(`6ca15aa81`)의 READY_SPLIT 중 **비경구 657 master (115 fp)** 를
 * DB 공식 원문에서 **전건 재검증**하고 생산 단위·승인 proposal 을 산출한다.
 *
 * 입력(수정하지 않는다): `otc-unproduced-ready-split-proposal-v1.json`
 * 산출: `otc-unproduced-nonoral-approval-proposal-v1.json` (status=PROPOSAL)
 *
 * ── 판정 계약: 선행 트랙 VERBATIM 재사용 ──────────────────────────────────────────
 *  · sections/normalize/SITE_PATTERNS/SUFFIX_MAP  ← otc-unproduced-large-census.ts
 *  · NEGATION/isNegated/PRO_MARKERS/findEvidence  ← 전문용 분리 감사(`3719b8280`)
 *  · numericTokens/ageTokens/durationTokens/contraSig · 10축 safetyFp ← 동 census
 *  재구현이 아니라 **동일 산식 복제**다. 원본 파일은 수정하지 않는다.
 *
 * ── WO 조사 원칙 대응 ─────────────────────────────────────────────────────────────
 *  1 제품명으로 route/부위 추정 금지 → 코드 접미(SUFFIX_MAP) + 용법 원문만 사용
 *  2 효능·효과와 용법·용량 반드시 대조 → indSites ↔ dosSites 충돌 검사
 *  3 공식 제형·경로·일반명코드 검증 → suffix↔route 대조 + gencode 재도출
 *  4 복수 경로 병존 시 단일 강제 금지 → HOLD_MULTI_ROUTE 분리
 *  5 수술자 손·수술부위·무균·전문기구 제외 → HOLD_PROFESSIONAL_USE
 *  6 "수술용 제외" 부정 문맥 오분류 금지 → isNegated
 *  7 기존 LIVE 와 master/fp/sourceRef/canonical 4방향 중복 검사
 *
 * Usage(apps/api-server): tsx src/scripts/otc-unproduced-nonoral-census.na.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const SPLIT_PROPOSAL = path.join(DATA, 'otc-unproduced-ready-split-proposal-v1.json');
const OUT = path.join(DATA, 'otc-unproduced-nonoral-approval-proposal-v1.json');
const WO = 'WO-O4O-OTC-UNPRODUCED-NONORAL-PRODUCTION-CENSUS-AND-APPROVAL-PROPOSAL-V1';
const CENSUS_COMMIT = '6ca15aa81';
const EXPECTED = { fp: 115, master: 657, routes: { topical: 437, ophthalmic: 159, oromucosal: 40, vaginal: 21 } };

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];

// ── 원문 파싱 (VERBATIM) ─────────────────────────────────────────────────────────
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

// ── 코드 접미 → (route, form) (VERBATIM 부분집합: 비경구) ─────────────────────────
const SUFFIX_MAP: Record<string, { route: string; form: string }> = {
  ATO: { route: 'oromucosal', form: '트로키' }, AMS: { route: 'oromucosal', form: '껌' },
  ATD: { route: 'oromucosal', form: '구강용해필름' },
  COS: { route: 'ophthalmic', form: '점안액' }, COO: { route: 'ophthalmic', form: '점안겔' },
  CCM: { route: 'topical', form: '크림' }, COM: { route: 'topical', form: '연고' },
  CPA: { route: 'topical', form: '파스타' }, CLT: { route: 'topical', form: '로션' },
  CPL: { route: 'topical', form: '플라스타' }, CPO: { route: 'topical', form: '카타플라스마' },
  CPC: { route: 'topical', form: '패취' }, CTB: { route: 'vaginal', form: '질정' },
};
/** 적용부위 미확정 접미 — 본 트랙 입력에 있으면 안 된다 */
const SITE_AMBIGUOUS = new Set(['CLQ', 'CDS', 'CSI']);
/** site 탐지명 ↔ 코드 route 명 정합 (cutaneous == topical) */
const SITE_TO_ROUTE: Record<string, string> = {
  cutaneous: 'topical', oromucosal: 'oromucosal', ophthalmic: 'ophthalmic',
  vaginal: 'vaginal', rectal: 'rectal', nasal: 'nasal', otic: 'otic',
};

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
const ROUTE_CONTRADICTION: Record<string, RegExp> = {
  oromucosal: /질\s?내|항문|직장\s?내|결막낭|점안합/,
  ophthalmic: /복용합|삼킨|질\s?내|항문|직장\s?내/,
  topical: /복용합|삼킨|경구\s?투여/,
  vaginal: /복용합|삼킨|결막낭|점안합/,
};

// ── 전문용 판정 (VERBATIM) ───────────────────────────────────────────────────────
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

// ── 안전지문 축 (VERBATIM) ───────────────────────────────────────────────────────
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

const AUTHORED_SOURCES = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'nutrition_combo'];

interface Rec {
  masterId: string; name: string; proposalFp: string; proposalGencode: string;
  gencode: string | null; suffix: string | null; codeRoute: string | null; form: string | null;
  site: string | null; dosSites: string[]; indSites: string[];
  verdict: string; reasons: string[]; proEvidence: Array<Record<string, string>>;
  safetyFp: string | null; axes: Record<string, string>; evidence: string;
}

async function main(): Promise<void> {
  // ── 입력 모집단 ────────────────────────────────────────────────────────────────
  const proposal = JSON.parse(fs.readFileSync(SPLIT_PROPOSAL, 'utf8'));
  const nonOral = (proposal.groups as any[]).filter((g) => g.route !== 'oral')
    .sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));
  const ids = nonOral.flatMap((g) => g.masterIds as string[]).sort();
  const gate: Record<string, unknown> = {};
  gate.G1_inputFp = nonOral.length;
  gate.G1_inputMaster = ids.length;
  gate.G1_distinctMaster = new Set(ids).size;
  gate.G1_matchesWO = nonOral.length === EXPECTED.fp && ids.length === EXPECTED.master
    && new Set(ids).size === EXPECTED.master;
  const inRoutes: Record<string, number> = {};
  for (const g of nonOral) inRoutes[g.route] = (inRoutes[g.route] || 0) + g.size;
  gate.G2_routeTally = inRoutes;
  gate.G2_routeMatchesWO = JSON.stringify(Object.fromEntries(Object.entries(inRoutes).sort()))
    === JSON.stringify(Object.fromEntries(Object.entries(EXPECTED.routes).sort()));

  // ── 선행 LIVE 집합 (master / fp / sourceRef) ───────────────────────────────────
  const readJson = (f: string): any | null => {
    const p = path.join(DATA, f);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
  };
  const liveMasters = new Set<string>(), liveFps = new Set<string>(), liveSourceRefs = new Set<string>();
  const v2Census = readJson('otc-remaining-full-corpus-census-v2.json');
  const fpToMasters = new Map<string, string[]>((v2Census?.readyGroups || []).map((g: any) => [g.fp, g.masterIds]));
  for (const k of ['ga', 'na', 'da']) for (const lang of ['ko', 'en']) {
    for (const f of [`otc-v2-apply-run.${k}.${lang}.json`, `otc-external-site-final-apply-run.${k}.${lang}.json`,
      `otc-external-site-split-apply-run.${k}.${lang}.json`]) {
      const j = readJson(f); if (!j?.reports) continue;
      for (const r of j.reports as any[]) {
        if (r.fp) { liveFps.add(r.fp); for (const m of fpToMasters.get(r.fp) || []) liveMasters.add(m); }
        if (r.sourceRef) liveSourceRefs.add(String(r.sourceRef));
      }
    }
  }
  for (const f of ['otc-external-site-final-approved-ssot-v1.json',
    'otc-external-site-split-final-approved-ssot-v1.json',
    'otc-external-site-recovery-approved-ssot-v1.json']) {
    const j = readJson(f); if (!j) continue;
    for (const m of (j.masters || []) as any[]) { liveMasters.add(m.masterId); if (m.fp) liveFps.add(m.fp); }
  }

  // ── DB ────────────────────────────────────────────────────────────────────────
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 600000 },
  });
  await ds.initialize();

  const std = retRows<{ mid: string; gencodes: string[] | null }>(await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id = pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
     AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
    GROUP BY 1 ORDER BY 1`, [ids]));
  const gencodeByMid = new Map<string, string | null>();
  for (const r of std) { const g = (r.gencodes || []).filter(Boolean).sort(); gencodeByMid.set(r.mid, g.length === 1 ? g[0] : null); }

  const rows = retRows<{ id: string; name: string; content: string }>(await ds.query(`
    SELECT pop.id, pm.name, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN product_masters pm ON pm.id = pop.id::uuid
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`, [ids]));
  const byId = new Map(rows.map((r) => [r.id, r]));

  // canonical 방향 교집합 — authored canonical 보유 master
  const authoredRows = retRows<{ id: string }>(await ds.query(`
    SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
      AND source_type=ANY($2) AND deleted_at IS NULL`, [ids, AUTHORED_SOURCES]));
  const enRows = retRows<{ id: string }>(await ds.query(`
    SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
      AND COALESCE(language,'ko')='en' AND deleted_at IS NULL`, [ids]));
  await ds.destroy();

  // ── 전건 재검증 ────────────────────────────────────────────────────────────────
  const recs: Rec[] = [];
  for (const g of nonOral) {
    for (const mid of (g.masterIds as string[]).slice().sort()) {
      const row = byId.get(mid);
      const gc = gencodeByMid.get(mid) ?? null;
      const suffix = gc ? gc.slice(6, 9) : null;
      const map = suffix ? SUFFIX_MAP[suffix] : undefined;
      const rec: Rec = {
        masterId: mid, name: row?.name ?? '', proposalFp: g.fp, proposalGencode: g.gencode,
        gencode: gc, suffix, codeRoute: map?.route ?? null, form: map?.form ?? null,
        site: null, dosSites: [], indSites: [], verdict: 'READY_NONORAL', reasons: [],
        proEvidence: [], safetyFp: null, axes: {}, evidence: '',
      };
      const fail = (v: string, r: string): void => { rec.verdict = v; rec.reasons.push(r); };

      if (!row?.content) { fail('HOLD_SOURCE', 'SOURCE_MISSING'); recs.push(rec); continue; }
      if (!gc) { fail('HOLD_SOURCE', 'GENCODE_UNRESOLVED'); recs.push(rec); continue; }
      if (gc !== g.proposalGencode && gc !== g.gencode) { fail('HOLD_SOURCE', `GENCODE_CONFLICT:${gc}vs${g.gencode}`); recs.push(rec); continue; }
      if (suffix && SITE_AMBIGUOUS.has(suffix)) { fail('HOLD_ROUTE', `SITE_AMBIGUOUS_SUFFIX:${suffix}`); recs.push(rec); continue; }
      if (!map) { fail('HOLD_ROUTE', `SUFFIX_NOT_ALLOWLISTED:${suffix}`); recs.push(rec); continue; }
      if (map.route !== g.route) { fail('HOLD_ROUTE', `CODE_ROUTE_CONFLICT:${map.route}vs${g.route}`); recs.push(rec); continue; }

      const sec = sections(row.content);
      const ind = sec['효능·효과'] || '';
      const dos = sec['용법·용량'] || '';
      const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
      if (!ind || !dos) { fail('HOLD_SOURCE', 'MISSING_INDICATION_OR_DOSAGE'); recs.push(rec); continue; }
      if (!cau) { fail('HOLD_SOURCE', 'MISSING_CAUTION'); recs.push(rec); continue; }

      // 전문용 (부정 문맥 제외 · APPLICATOR 는 수술 문맥 동반 시에만)
      const indN = normalize(ind), dosN = normalize(dos);
      const hasSurg = SURGICAL_CONTEXT.test(indN) || SURGICAL_CONTEXT.test(dosN);
      for (const mk of PRO_MARKERS) {
        if (mk.code === 'APPLICATOR' && !hasSurg) continue;
        for (const [label, text] of [['효능·효과', indN], ['용법·용량', dosN]] as const) {
          const q = findEvidence(text, mk.re);
          if (q) { rec.reasons.push(mk.code); rec.proEvidence.push({ code: mk.code, section: label, quote: q }); }
        }
      }
      if (rec.proEvidence.length) { rec.verdict = 'HOLD_PROFESSIONAL_USE'; recs.push(rec); continue; }

      // 적용부위 — 용법 원문에서만 도출 (제품명 미사용)
      const dosFound = detectSites(dos);
      rec.dosSites = [...new Set(dosFound.map((s) => s.site))].sort();
      if (rec.dosSites.length === 0) { fail('HOLD_ROUTE', 'NO_SITE_IN_DOSAGE'); recs.push(rec); continue; }
      if (rec.dosSites.length > 1) { fail('HOLD_MULTI_ROUTE', `DOSAGE_SITES:${rec.dosSites.join(',')}`); recs.push(rec); continue; }
      rec.site = rec.dosSites[0];
      rec.evidence = dosFound.find((s) => s.site === rec.site)?.evidence || '';
      if (SITE_TO_ROUTE[rec.site] !== map.route) { fail('HOLD_ROUTE', `SITE_CODE_CONFLICT:${rec.site}vs${map.route}`); recs.push(rec); continue; }

      // 효능·효과 대조 (WO 원칙 2)
      rec.indSites = [...new Set(detectSites(ind).map((s) => s.site))].sort();
      const conflict = rec.indSites.filter((s) => s !== rec.site);
      if (conflict.length) { fail('HOLD_MULTI_ROUTE', `INDICATION_SITE_CONFLICT:${conflict.join(',')}`); recs.push(rec); continue; }
      const contra = ROUTE_CONTRADICTION[map.route];
      if (contra && (contra.test(dosN) || contra.test(indN))) { fail('HOLD_ROUTE', 'ROUTE_TEXT_CONTRADICTION'); recs.push(rec); continue; }

      // 안전지문 10축 (census VERBATIM)
      const num = numericTokens(dos), age = ageTokens(`${dos}\n${cau}`), dur = durationTokens(`${dos}\n${cau}`);
      if (num.length === 0 && age.length === 0) { fail('HOLD_SAFETY_VARIANCE', 'NO_NUMERIC_AND_NO_AGE'); recs.push(rec); continue; }
      rec.axes = {
        indication: H(normalize(ind)), dosage: H(normalize(dos)), caution: H(normalize(cau)),
        numeric: H(num.join('|')), age: H(age.join('|')), duration: H(dur.join('|')),
        contraindication: contraSig(cau), codeIngredientStrength: gc.slice(0, 6),
        codeForm: suffix!, route: map.route,
      };
      rec.safetyFp = H(Object.values(rec.axes).join('|'));
      recs.push(rec);
    }
  }

  // ── fp 내부 안전지문 일치 검증 ─────────────────────────────────────────────────
  const byProposalFp = new Map<string, Rec[]>();
  for (const r of recs) { if (!byProposalFp.has(r.proposalFp)) byProposalFp.set(r.proposalFp, []); byProposalFp.get(r.proposalFp)!.push(r); }
  const fpMismatch: Array<Record<string, unknown>> = [];
  for (const [fp, arr] of byProposalFp) {
    const ok = arr.filter((r) => r.verdict === 'READY_NONORAL');
    const sigs = [...new Set(ok.map((r) => r.safetyFp))];
    if (sigs.length > 1) fpMismatch.push({ proposalFp: fp, distinctSafetyFp: sigs.length, masters: ok.length });
    const reproduced = ok.filter((r) => r.safetyFp === fp).length;
    if (ok.length && reproduced !== ok.length) {
      fpMismatch.push({ proposalFp: fp, kind: 'FP_NOT_REPRODUCED', reproduced, of: ok.length });
    }
  }

  // ── 판정 집계 ─────────────────────────────────────────────────────────────────
  const tally: Record<string, { fp: Set<string>; master: number }> = {};
  for (const r of recs) {
    if (!tally[r.verdict]) tally[r.verdict] = { fp: new Set(), master: 0 };
    tally[r.verdict].fp.add(r.safetyFp || r.proposalFp);
    tally[r.verdict].master++;
  }
  const verdictTally = Object.fromEntries(Object.entries(tally).sort()
    .map(([k, v]) => [k, { fingerprints: v.fp.size, masters: v.master }]));

  const ready = recs.filter((r) => r.verdict === 'READY_NONORAL');
  const readyByFp = new Map<string, Rec[]>();
  for (const r of ready) { if (!readyByFp.has(r.safetyFp!)) readyByFp.set(r.safetyFp!, []); readyByFp.get(r.safetyFp!)!.push(r); }
  const groups = [...readyByFp.entries()].map(([fp, arr]) => ({
    fp, gencode: arr[0].gencode!, suffix: arr[0].suffix!, route: arr[0].codeRoute!, form: arr[0].form!,
    site: arr[0].site!, size: arr.length,
    proposalFps: [...new Set(arr.map((r) => r.proposalFp))].sort(),
    masterIds: arr.map((r) => r.masterId).sort(),
  })).sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));

  // ── 4방향 교집합 ──────────────────────────────────────────────────────────────
  const readyIds = new Set(ready.map((r) => r.masterId));
  const readyFps = new Set(groups.map((g) => g.fp));
  const srcRef = (fp: string): string => { const h = md5(`otc-combo-leaflet:${fp}`);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`; };
  const intersections = {
    byMaster: [...readyIds].filter((m) => liveMasters.has(m)).sort(),
    byFingerprint: [...readyFps].filter((f) => liveFps.has(f)).sort(),
    bySourceRef: [...readyFps].map(srcRef).filter((s) => liveSourceRefs.has(s)).sort(),
    byAuthoredCanonical: authoredRows.map((r) => r.id).filter((m) => readyIds.has(m)).sort(),
    byEnCanonical: enRows.map((r) => r.id).filter((m) => readyIds.has(m)).sort(),
  };

  const routeReady: Record<string, { fingerprints: number; masters: number }> = {};
  for (const g of groups) {
    if (!routeReady[g.route]) routeReady[g.route] = { fingerprints: 0, masters: 0 };
    routeReady[g.route].fingerprints++; routeReady[g.route].masters += g.size;
  }

  gate.G3_sourceComplete = recs.filter((r) => r.reasons.some((x) => x.startsWith('SOURCE_MISSING') || x.startsWith('MISSING_'))).length;
  gate.G4_fpInternalMismatch = fpMismatch.length;
  gate.G5_professionalUse = recs.filter((r) => r.verdict === 'HOLD_PROFESSIONAL_USE').length;
  gate.G6_multiRoute = recs.filter((r) => r.verdict === 'HOLD_MULTI_ROUTE').length;
  gate.G7_liveIntersectionMaster = intersections.byMaster.length;
  gate.G7_liveIntersectionFp = intersections.byFingerprint.length;
  gate.G7_liveIntersectionSourceRef = intersections.bySourceRef.length;
  gate.G8_authoredCanonical = intersections.byAuthoredCanonical.length;
  gate.G8_enCanonical = intersections.byEnCanonical.length;
  gate.G9_recCount = recs.length;
  gate.G9_noLoss = recs.length === EXPECTED.master;
  gate.G10_dbWrite = 0;
  const allPass = gate.G1_matchesWO === true && gate.G2_routeMatchesWO === true
    && gate.G4_fpInternalMismatch === 0 && gate.G7_liveIntersectionMaster === 0
    && gate.G7_liveIntersectionFp === 0 && gate.G7_liveIntersectionSourceRef === 0
    && gate.G8_authoredCanonical === 0 && gate.G8_enCanonical === 0 && gate.G9_noLoss === true;

  const readyMasters = ready.length;
  const out = {
    wo: WO, artifact: 'nonoral-approval-proposal', status: 'PROPOSAL — 승인 전 생산 금지',
    agent: 'na', readOnly: true, dbWrite: 0,
    sourceCensus: 'otc-unproduced-ready-split-proposal-v1.json', censusCommit: CENSUS_COMMIT,
    contractReuse: {
      parsing: 'otc-unproduced-large-census.ts VERBATIM',
      professionalUse: 'otc-external-site-professional-use-separation-audit.ts VERBATIM (3719b8280)',
      safetyFingerprint: '10축 — indication·dosage·caution·numeric·age·duration·contraindication·codeIngredientStrength·codeForm·route',
    },
    input: { fingerprints: nonOral.length, masters: ids.length, routes: inRoutes },
    verdictTally,
    ready: { fingerprints: groups.length, masters: readyMasters, routes: routeReady },
    writePlan: { perMaster: { ko: 4, en: 2, total: 6 }, ko: readyMasters * 4, en: readyMasters * 2, total: readyMasters * 6 },
    gates: gate, allGatesPass: allPass,
    fpInternalMismatch: fpMismatch,
    intersections,
    runnerReuse: {
      sharedV2Runner: {
        file: 'otc-v2-store-leaflet-runner.shared.ts',
        supportedRoutes: ['oral', 'oromucosal', 'topical', 'ophthalmic', 'nasal', 'vaginal', 'rectal'],
        verdict: 'ROUTE_OK — 본 모집단 4 route 전부 지원. 단 입력이 V2 SSOT·V2 5축 fp 기준',
      },
      externalSiteSplitProduction: {
        file: 'otc-external-site-split-production.ts',
        verdict: 'SHAPE_OK_ROUTE_GAP — 승인 SSOT + 9축 안전지문 입력 형태가 본 산출물과 동일하나, RECOVERY_ROUTE_PROFILE 에 ophthalmic 프로파일이 없다',
        missingRouteProfile: ['ophthalmic'],
        note: 'ROUTE_LABEL_KO 는 CLQ/CDS/CSI 제형 미확정 대비 폴백이다. 본 모집단은 제형이 접미로 확정되므로 폴백 불필요',
      },
      requiredChange: 'ophthalmic RouteProfile(usageLabel·EN 문구) 추가 — 공용 자산이므로 다 세션 요청 대상',
    },
    productionUnits: {
      policy: 'route 계약 차이로 2단위 분리 (WO 생산 단위 원칙의 예시안과 일치). fingerprint 그룹 분할 0',
      unit1: {
        name: '피부·구강·질',
        routes: ['topical', 'oromucosal', 'vaginal'],
        fingerprints: groups.filter((g) => g.route !== 'ophthalmic').length,
        masters: groups.filter((g) => g.route !== 'ophthalmic').reduce((t, g) => t + g.size, 0),
        writeTotal: groups.filter((g) => g.route !== 'ophthalmic').reduce((t, g) => t + g.size, 0) * 6,
        runner: 'otc-external-site-split-production.ts 계약 재사용 가능 (route profile 기존 보유)',
      },
      unit2: {
        name: '점안',
        routes: ['ophthalmic'],
        fingerprints: groups.filter((g) => g.route === 'ophthalmic').length,
        masters: groups.filter((g) => g.route === 'ophthalmic').reduce((t, g) => t + g.size, 0),
        writeTotal: groups.filter((g) => g.route === 'ophthalmic').reduce((t, g) => t + g.size, 0) * 6,
        runner: 'ophthalmic RouteProfile 추가 후 동일 계약 사용',
      },
      writeOwner: '단일 에이전트로 순차 처리 가능 (unit1 → unit2)',
    },
    groups,
    holds: recs.filter((r) => r.verdict !== 'READY_NONORAL')
      .map((r) => ({ masterId: r.masterId, name: r.name, proposalFp: r.proposalFp, route: r.codeRoute,
        verdict: r.verdict, reasons: r.reasons.slice().sort(), proEvidence: r.proEvidence }))
      .sort((a, b) => (a.masterId < b.masterId ? -1 : 1)),
  };
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  console.log(`입력 ${nonOral.length} fp / ${ids.length} master (distinct ${new Set(ids).size})`);
  console.log(`route: ${JSON.stringify(inRoutes)}`);
  console.log(`판정: ${JSON.stringify(verdictTally)}`);
  console.log(`READY_NONORAL ${groups.length} fp / ${readyMasters} master · route ${JSON.stringify(routeReady)}`);
  console.log(`writePlan KO ${readyMasters * 4} + EN ${readyMasters * 2} = ${readyMasters * 6}`);
  console.log(`fp 내부 안전지문 mismatch ${fpMismatch.length}`);
  console.log(`교집합 master ${intersections.byMaster.length} · fp ${intersections.byFingerprint.length} · sourceRef ${intersections.bySourceRef.length} · authored ${intersections.byAuthoredCanonical.length} · en ${intersections.byEnCanonical.length}`);
  console.log(`allGatesPass=${allPass} · dbWrite 0 → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
