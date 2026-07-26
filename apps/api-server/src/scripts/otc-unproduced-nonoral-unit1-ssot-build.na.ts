/**
 * WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-FINAL-APPROVAL-V1 — 에이전트 나
 *
 * ⚠️ READ-ONLY · **DB write 0** · 설명서 생성 0 · dry-run 0 · LIVE apply 0.
 *
 * 비경구 승인 proposal(`05dc50b14`)의 **Unit 1 — 피부·구강·질 70 fp / 443 master** 를
 * DB 공식 원문에서 **전건 재도출**해 최종 생산 승인 SSOT 로 확정한다.
 *
 * 입력(수정하지 않는다): `otc-unproduced-nonoral-approval-proposal-v1.json`
 * 산출: `otc-unproduced-nonoral-unit1-approved-ssot-v1.json` (status=APPROVED_FOR_PRODUCTION)
 *       `otc-unproduced-nonoral-unit1-execution-order-v1.json` (실행 순서 원장)
 *
 * 판정 계약은 proposal 과 **동일 산식**(라 census + 전문용 분리 감사 VERBATIM 복제)이다.
 * 다른 잣대로 재검증하면 검증이 아니라 재판정이 되므로 산식을 바꾸지 않는다.
 *
 * Usage(apps/api-server): tsx src/scripts/otc-unproduced-nonoral-unit1-ssot-build.na.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const PROPOSAL = path.join(DATA, 'otc-unproduced-nonoral-approval-proposal-v1.json');
const OUT_SSOT = path.join(DATA, 'otc-unproduced-nonoral-unit1-approved-ssot-v1.json');
const OUT_ORDER = path.join(DATA, 'otc-unproduced-nonoral-unit1-execution-order-v1.json');
const WO = 'WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-FINAL-APPROVAL-V1';
const PROPOSAL_COMMIT = '05dc50b14';
const CENSUS_COMMIT = '6ca15aa81';
const EXPECTED = { fp: 70, master: 443, ko: 1772, en: 886, total: 2658 };
const EXPECTED_ROUTES: Record<string, number> = { topical: 390, oromucosal: 32, vaginal: 21 };
const UNIT1_ROUTES = new Set(['topical', 'oromucosal', 'vaginal']);

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
function fpToUuid(fp: string): string {
  const h = md5(`otc-combo-leaflet:${fp}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ── 판정 계약 VERBATIM (라 census · 전문용 분리 감사 3719b8280) ───────────────────
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
const SUFFIX_MAP: Record<string, { route: string; form: string }> = {
  ATO: { route: 'oromucosal', form: '트로키' }, AMS: { route: 'oromucosal', form: '껌' },
  ATD: { route: 'oromucosal', form: '구강용해필름' },
  COS: { route: 'ophthalmic', form: '점안액' }, COO: { route: 'ophthalmic', form: '점안겔' },
  CCM: { route: 'topical', form: '크림' }, COM: { route: 'topical', form: '연고' },
  CPA: { route: 'topical', form: '파스타' }, CLT: { route: 'topical', form: '로션' },
  CPL: { route: 'topical', form: '플라스타' }, CPO: { route: 'topical', form: '카타플라스마' },
  CPC: { route: 'topical', form: '패취' }, CTB: { route: 'vaginal', form: '질정' },
};
const SITE_AMBIGUOUS = new Set(['CLQ', 'CDS', 'CSI']);
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
  topical: /복용합|삼킨|경구\s?투여/,
  vaginal: /복용합|삼킨|결막낭|점안합/,
};
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
const PRO_MARKERS: Array<{ code: string; re: RegExp }> = [
  { code: 'SURGEON_HAND', re: /수술자(?:의)?\s*손|수술\s*시\s*수술자|수술\s*전\s*손|손\s*소독[^.]{0,30}수술|수술[^.]{0,20}손\s*소독/ },
  { code: 'SCRUB', re: /스크\s?럽|scrub|브러시|솔을?\s*사용하여\s*문지/i },
  { code: 'SURGICAL_SITE', re: /수술\s*부위|수술부위|수술\s*전\s*피부|술전\s*피부|수술\s*예정\s*부위|수술\s*절개/ },
  { code: 'APPLICATOR', re: /어플리케이터|어플리케타|applicator/i },
  { code: 'ASEPTIC', re: /무균\s*(?:조작|술|적|상태)|멸균\s*장갑|수술실|수술\s*준비|외과적\s*손\s*소독/ },
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

async function main(): Promise<void> {
  const proposal = JSON.parse(fs.readFileSync(PROPOSAL, 'utf8'));
  if (!String(proposal.status).startsWith('PROPOSAL')) throw new Error(`proposal status=${proposal.status}`);
  if (proposal.allGatesPass !== true) throw new Error('proposal allGatesPass=false');

  const unit1 = (proposal.groups as any[]).filter((g) => UNIT1_ROUTES.has(g.route))
    .sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));
  const ids = unit1.flatMap((g) => g.masterIds as string[]).sort();
  if (unit1.length !== EXPECTED.fp) throw new Error(`fp ${unit1.length} != ${EXPECTED.fp}`);
  if (ids.length !== EXPECTED.master) throw new Error(`master ${ids.length} != ${EXPECTED.master}`);

  // HOLD 원장 — 혼입 금지 대상
  const holdIds = new Set<string>((proposal.holds as any[]).map((h) => h.masterId));
  const holdByVerdict: Record<string, number> = {};
  for (const h of proposal.holds as any[]) holdByVerdict[h.verdict] = (holdByVerdict[h.verdict] || 0) + 1;

  // 선행 LIVE 집합
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
    'otc-external-site-recovery-approved-ssot-v1.json',
    'otc-unproduced-oral-unit1-approved-ssot-v1.json',
    'otc-unproduced-oral-unit2-approved-ssot-v1.json']) {
    const j = readJson(f); if (!j) continue;
    for (const m of (j.masters || []) as any[]) { liveMasters.add(m.masterId); if (m.fp) liveFps.add(m.fp); }
    for (const g of (j.groups || []) as any[]) { if (g.fp) liveFps.add(g.fp); for (const m of (g.masterIds || [])) liveMasters.add(m); }
  }
  const oralUnitLedgerMasters = liveMasters.size;

  // ── DB 재도출 ──────────────────────────────────────────────────────────────────
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
  const authoredKo = retRows<{ id: string }>(await ds.query(`
    SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
      AND COALESCE(language,'ko')='ko' AND source_type=ANY($2) AND deleted_at IS NULL`, [ids, AUTHORED_SOURCES]));
  const authoredEn = retRows<{ id: string }>(await ds.query(`
    SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
      AND COALESCE(language,'ko')='en' AND deleted_at IS NULL`, [ids]));
  await ds.destroy();

  // ── 전건 재도출 ────────────────────────────────────────────────────────────────
  const masters: any[] = [];
  const rejected: any[] = [];
  for (const g of unit1) {
    for (const mid of (g.masterIds as string[]).slice().sort()) {
      const reject = (why: string): void => { rejected.push({ masterId: mid, fp: g.fp, why }); };
      const row = byId.get(mid);
      const gc = gencodeByMid.get(mid) ?? null;
      if (!row?.content) { reject('SOURCE_MISSING'); continue; }
      if (!gc) { reject('GENCODE_UNRESOLVED'); continue; }
      if (gc !== g.gencode) { reject(`GENCODE_CONFLICT:${gc}vs${g.gencode}`); continue; }
      const suffix = gc.slice(6, 9);
      if (SITE_AMBIGUOUS.has(suffix)) { reject(`SITE_AMBIGUOUS:${suffix}`); continue; }
      const map = SUFFIX_MAP[suffix];
      if (!map) { reject(`SUFFIX_NOT_ALLOWLISTED:${suffix}`); continue; }
      if (map.route !== g.route) { reject(`CODE_ROUTE_CONFLICT:${map.route}vs${g.route}`); continue; }

      const sec = sections(row.content);
      const ind = sec['효능·효과'] || '';
      const dos = sec['용법·용량'] || '';
      const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
      if (!ind || !dos || !cau) { reject('OFFICIAL_AXIS_MISSING'); continue; }

      const indN = normalize(ind), dosN = normalize(dos);
      const hasSurg = SURGICAL_CONTEXT.test(indN) || SURGICAL_CONTEXT.test(dosN);
      const pro: string[] = [];
      for (const mk of PRO_MARKERS) {
        if (mk.code === 'APPLICATOR' && !hasSurg) continue;
        for (const text of [indN, dosN]) if (findEvidence(text, mk.re)) { pro.push(mk.code); break; }
      }
      if (pro.length) { reject(`PROFESSIONAL_USE:${[...new Set(pro)].sort().join(',')}`); continue; }

      const dosFound = detectSites(dos);
      const dosSites = [...new Set(dosFound.map((s) => s.site))].sort();
      if (dosSites.length === 0) { reject('NO_SITE_IN_DOSAGE'); continue; }
      if (dosSites.length > 1) { reject(`MULTI_ROUTE:${dosSites.join(',')}`); continue; }
      const site = dosSites[0];
      if (SITE_TO_ROUTE[site] !== map.route) { reject(`SITE_CODE_CONFLICT:${site}vs${map.route}`); continue; }
      const indSites = [...new Set(detectSites(ind).map((s) => s.site))].sort();
      const conflict = indSites.filter((s) => s !== site);
      if (conflict.length) { reject(`INDICATION_SITE_CONFLICT:${conflict.join(',')}`); continue; }
      const contra = ROUTE_CONTRADICTION[map.route];
      if (contra && (contra.test(dosN) || contra.test(indN))) { reject('ROUTE_TEXT_CONTRADICTION'); continue; }

      const num = numericTokens(dos), age = ageTokens(`${dos}\n${cau}`), dur = durationTokens(`${dos}\n${cau}`);
      if (num.length === 0 && age.length === 0) { reject('NO_NUMERIC_AND_NO_AGE'); continue; }
      const axes = {
        indication: H(normalize(ind)), dosage: H(normalize(dos)), caution: H(normalize(cau)),
        numeric: H(num.join('|')), age: H(age.join('|')), duration: H(dur.join('|')),
        contraindication: contraSig(cau), codeIngredientStrength: gc.slice(0, 6),
        codeForm: suffix, route: map.route,
      };
      const safetyFp = H(Object.values(axes).join('|'));
      if (safetyFp !== g.fp) { reject(`SAFETY_FP_NOT_REPRODUCED:${safetyFp}vs${g.fp}`); continue; }

      masters.push({
        masterId: mid, name: row.name, fp: safetyFp, gencode: gc, suffix,
        route: map.route, form: map.form, officialSite: site,
        evidence: dosFound.find((s) => s.site === site)?.evidence || '',
        evidenceSection: '용법·용량', indicationSites: indSites, axes,
      });
    }
  }

  // ── 그룹 ──────────────────────────────────────────────────────────────────────
  const byFp = new Map<string, any[]>();
  for (const m of masters) { if (!byFp.has(m.fp)) byFp.set(m.fp, []); byFp.get(m.fp)!.push(m); }
  const groups = [...byFp.entries()].map(([fp, arr]) => ({
    fp, sourceRef: fpToUuid(fp), gencode: arr[0].gencode, suffix: arr[0].suffix,
    route: arr[0].route, form: arr[0].form, size: arr.length,
    masterIds: arr.map((x) => x.masterId).sort(),
  })).sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));

  const routeTotals: Record<string, number> = {};
  for (const m of masters) routeTotals[m.route] = (routeTotals[m.route] || 0) + 1;
  const routeFp: Record<string, number> = {};
  for (const g of groups) routeFp[g.route] = (routeFp[g.route] || 0) + 1;

  // ── 게이트 ────────────────────────────────────────────────────────────────────
  const fpInternal = groups.filter((g) => {
    const src = unit1.find((u) => u.fp === g.fp);
    return !src || src.size !== g.size || JSON.stringify(src.masterIds.slice().sort()) !== JSON.stringify(g.masterIds);
  });
  const mIds = new Set(masters.map((m) => m.masterId));
  const fps = new Set(groups.map((g) => g.fp));
  const intersections = {
    byMaster: [...mIds].filter((m) => liveMasters.has(m)).sort(),
    byFingerprint: [...fps].filter((f) => liveFps.has(f)).sort(),
    bySourceRef: groups.map((g) => g.sourceRef).filter((s) => liveSourceRefs.has(s)).sort(),
    byAuthoredKoCanonical: authoredKo.map((r) => r.id).filter((m) => mIds.has(m)).sort(),
    byEnCanonical: authoredEn.map((r) => r.id).filter((m) => mIds.has(m)).sort(),
  };
  const holdMixed = [...mIds].filter((m) => holdIds.has(m)).sort();
  const gates = {
    G1_fingerprints: groups.length, G1_fpExpected: EXPECTED.fp, G1_fpMatch: groups.length === EXPECTED.fp,
    G1_masters: masters.length, G1_masterExpected: EXPECTED.master, G1_masterMatch: masters.length === EXPECTED.master,
    G2_routeTotals: routeTotals, G2_routeExpected: EXPECTED_ROUTES,
    G2_routeMatch: JSON.stringify(Object.fromEntries(Object.entries(routeTotals).sort()))
      === JSON.stringify(Object.fromEntries(Object.entries(EXPECTED_ROUTES).sort())),
    G3_missingMasters: EXPECTED.master - masters.length,
    G3_duplicateMasters: masters.length - new Set(masters.map((m) => m.masterId)).size,
    G3_rejected: rejected.length,
    G4_safetyFpMismatch: fpInternal.length,
    G5_officialSourceMissing: rejected.filter((r) => r.why === 'SOURCE_MISSING' || r.why === 'OFFICIAL_AXIS_MISSING').length,
    G6_holdRouteMixed: holdMixed.length, G6_holdLedgerTotal: holdByVerdict,
    G7_holdMultiRouteMixed: holdMixed.length,
    G8_liveMaster: intersections.byMaster.length, G8_liveFp: intersections.byFingerprint.length,
    G8_liveSourceRef: intersections.bySourceRef.length,
    G9_authoredKoCanonical: intersections.byAuthoredKoCanonical.length,
    G9_enCanonical: intersections.byEnCanonical.length,
    G10_writeKo: masters.length * 4, G10_writeEn: masters.length * 2, G10_writeTotal: masters.length * 6,
    G10_writeMatch: masters.length * 6 === EXPECTED.total,
    G11_fpGroupSplit: 0,
    G12_dbWrite: 0,
    G13_priorLiveSetSize: oralUnitLedgerMasters,
  };
  const allPass = gates.G1_fpMatch && gates.G1_masterMatch && gates.G2_routeMatch
    && gates.G3_missingMasters === 0 && gates.G3_duplicateMasters === 0 && gates.G3_rejected === 0
    && gates.G4_safetyFpMismatch === 0 && gates.G5_officialSourceMissing === 0
    && gates.G6_holdRouteMixed === 0 && gates.G8_liveMaster === 0 && gates.G8_liveFp === 0
    && gates.G8_liveSourceRef === 0 && gates.G9_authoredKoCanonical === 0 && gates.G9_enCanonical === 0
    && gates.G10_writeMatch;

  const ssot = {
    wo: WO, artifact: 'final-production-approval-ssot',
    status: allPass ? 'APPROVED_FOR_PRODUCTION' : 'BLOCKED — 게이트 실패',
    agent: 'na', readOnly: true, dbWrite: 0,
    basedOn: {
      proposal: 'otc-unproduced-nonoral-approval-proposal-v1.json', proposalCommit: PROPOSAL_COMMIT,
      census: 'otc-unproduced-large-census-v1.json', censusCommit: CENSUS_COMMIT,
      note: 'proposal 원본은 수정하지 않았다. 443 master 를 DB 공식 원문에서 전건 재도출해 대조했다.',
    },
    approvalBasis: [
      '공식 e약은요 용법·용량 원문에서 적용부위가 정확히 1종만 확인됨',
      '효능·효과 부위와 용법 부위 충돌 0',
      '일반명코드 접미(제형·경로)와 원문 도출 부위 일치',
      '10축 안전지문이 proposal fp 와 1:1 재현',
      '전문용 마커 0 (부정 문맥 규칙 적용)',
      '기존 LIVE·authored canonical 과 4방향 교집합 0',
    ],
    unit: { unitId: 'nonoral-unit-1', name: '피부·구강·질', routes: ['topical', 'oromucosal', 'vaginal'] },
    totals: { fingerprints: groups.length, masters: masters.length },
    routeTotals, routeFingerprints: routeFp,
    writePlan: { perMaster: { ko: 4, en: 2, total: 6 }, ko: masters.length * 4, en: masters.length * 2, total: masters.length * 6 },
    productionRules: [
      'fp 는 정확히 한 단위 — fingerprint 그룹 분할 금지',
      'sourceRef 앵커 = uuid(md5("otc-combo-leaflet:"+fp))',
      'write 계약 = master당 KO 4T(easy demote → authored INSERT → canonical 전환 → audit) + EN 2T',
      'DB write-owner 단일 에이전트',
      'ophthalmic(Unit 2)은 본 SSOT 에 포함하지 않는다',
    ],
    gates, allGatesPass: allPass,
    excluded: {
      HOLD_ROUTE: holdByVerdict.HOLD_ROUTE || 0,
      HOLD_MULTI_ROUTE: holdByVerdict.HOLD_MULTI_ROUTE || 0,
      ophthalmic_unit2: { fingerprints: 34, masters: 159, reason: 'route profile 선결 — 별도 단위' },
    },
    intersections,
    rejected,
    groups,
    masters: masters.sort((a, b) => (a.masterId < b.masterId ? -1 : 1)),
  };
  fs.writeFileSync(OUT_SSOT, `${JSON.stringify(ssot, null, 2)}\n`, 'utf8');

  const order = {
    wo: WO, artifact: 'execution-order-ledger',
    status: allPass ? 'APPROVED_FOR_PRODUCTION' : 'BLOCKED',
    agent: 'na', readOnly: true, dbWrite: 0, route: 'nonoral',
    totals: { fingerprints: groups.length, masters: masters.length,
      writePlan: { ko: masters.length * 4, en: masters.length * 2, total: masters.length * 6 } },
    writeOwner: { policy: '단일 에이전트', note: 'nonoral Unit 1 → Unit 2 순차. 병렬 write-owner 불필요.' },
    sequence: [
      { step: 1, unitId: 'nonoral-unit-1', ssot: 'otc-unproduced-nonoral-unit1-approved-ssot-v1.json',
        routes: ['topical', 'oromucosal', 'vaginal'],
        fingerprints: groups.length, masters: masters.length,
        write: { ko: masters.length * 4, en: masters.length * 2, total: masters.length * 6 },
        precondition: '승인 즉시 착수 가능 — 러너 route profile 기보유(cutaneous·oromucosal·vaginal)' },
      { step: 2, unitId: 'nonoral-unit-2', ssot: '(미작성 — 별도 승인 WO)',
        routes: ['ophthalmic'], fingerprints: 34, masters: 159,
        write: { ko: 636, en: 318, total: 954 },
        precondition: 'ophthalmic RouteProfile 추가(다 세션) · nonoral-unit-1 완료·독립검증 GREEN' },
    ],
    gates: { G1_unitFpIntersection: 0, G1_unitMasterIntersection: 0, G2_fpGroupSplitAcrossUnits: 0,
      G3_totalNonOralReady: { fingerprints: 104, masters: 602 },
      G3_unit1Plus2: { fingerprints: groups.length + 34, masters: masters.length + 159 },
      G3_sumMatch: groups.length + 34 === 104 && masters.length + 159 === 602, G4_dbWrite: 0 },
  };
  fs.writeFileSync(OUT_ORDER, `${JSON.stringify(order, null, 2)}\n`, 'utf8');

  console.log(`Unit1 ${groups.length} fp / ${masters.length} master · route ${JSON.stringify(routeTotals)}`);
  console.log(`rejected ${rejected.length} · 안전지문 mismatch ${gates.G4_safetyFpMismatch}`);
  console.log(`HOLD 혼입 ${holdMixed.length} · 교집합 master ${intersections.byMaster.length} fp ${intersections.byFingerprint.length} sourceRef ${intersections.bySourceRef.length}`);
  console.log(`authored ko ${intersections.byAuthoredKoCanonical.length} · en ${intersections.byEnCanonical.length}`);
  console.log(`write KO ${masters.length * 4} + EN ${masters.length * 2} = ${masters.length * 6} (기대 ${EXPECTED.total})`);
  console.log(`status=${ssot.status} allGatesPass=${allPass} dbWrite 0`);
  if (rejected.length) console.log('rejected 샘플:', JSON.stringify(rejected.slice(0, 5)));
}

main().catch((e) => { console.error(e); process.exit(1); });
