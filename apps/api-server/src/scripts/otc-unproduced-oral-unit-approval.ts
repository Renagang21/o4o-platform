/**
 * WO-O4O-OTC-UNPRODUCED-ORAL-LARGE-UNIT-APPROVAL-V1 — 에이전트 라 (승인 검증 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · dry-run 0 · LIVE apply 0.
 *    기존 census·proposal·SSOT·생산 원장 수정 0.
 *
 * 목적: census `6ca15aa81` 의 경구 READY_SPLIT **747 fp / 3,699 master** 를
 *       fingerprint 그룹을 분할하지 않고 **2개 대형 생산 단위**로 확정한다.
 *
 * 재검증 방식(넓은 재탐색이 아니다):
 *   proposal 의 경구 그룹을 읽고, **각 master 의 안전지문을 DB 공식 원문에서 다시 계산**하여
 *   proposal 의 fp 와 일치하는지 전건 대조한다. 불일치가 하나라도 있으면 중단 보고한다.
 *
 * 안전지문 10축:
 *   성분 · 함량 · 제형 · 경구 투여경로 · 효능·효과 · 용법 수치 · 연령 · 사용 기간 ·
 *   금기·주의사항 · 단일제/복합제
 *   · 성분/함량/제형/단일제·복합제 = 일반명코드 [1-4][5-6][7-9] (제품명 미사용)
 *   · 나머지 = e약은요 canonical 원문 signature
 *
 * 단위 배분:
 *   fingerprint 그룹은 절대 분할하지 않는다. 크기 내림차순 greedy(min-master) 로
 *   master 수·write 가 균형을 이루도록 2개 unit 에 배정한다.
 *   unit 은 에이전트 분할이 아니라 transaction·검증 단위다.
 *
 * 결정론: 타임스탬프 미포함 · 모든 배열 정렬 · 2회 실행 byte-identical.
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. env 는 process.env 로만 전달(값 열람·출력 0).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-unproduced-oral-unit-approval.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const P_PROPOSAL = path.join(OUT_DIR, 'otc-unproduced-ready-split-proposal-v1.json');
const OUT_U1 = path.join(OUT_DIR, 'otc-unproduced-oral-unit1-approved-ssot-v1.json');
const OUT_U2 = path.join(OUT_DIR, 'otc-unproduced-oral-unit2-approved-ssot-v1.json');
const OUT_ORDER = path.join(OUT_DIR, 'otc-unproduced-oral-execution-order-v1.json');

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const WRITE = { ko: 4, en: 2, total: 6 };
const EXPECTED_FP = 747, EXPECTED_MASTERS = 3699, EXPECTED_WRITE = 22194;
const AUTHORED = `ARRAY['mfds_drug_otc','nutrition_combo','mfds_drug_otc_nutrition_combo']`;

// ── 원문 파싱 · signature (census VERBATIM) ───────────────────────────────────────
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
/** 경구 경로 ↔ 용법 원문 모순 대조 (census VERBATIM) */
const ORAL_CONTRADICTION = /질\s?내|질강에|항문|직장\s?내|결막낭|점안합|비강\s?내|외이도/;
const NEGATION = /제외|해당하지\s*않|사용하지\s*않|아닙니다/;
function isNegated(text: string, start: number, end: number): boolean {
  const open = text.lastIndexOf('(', start);
  if (open >= 0) {
    const close = text.indexOf(')', end);
    if (close > open && NEGATION.test(text.slice(open + 1, close))) return true;
  }
  return NEGATION.test(text.slice(end, Math.min(text.length, end + 30)));
}
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
const ORAL_SUFFIX: Record<string, string> = {
  ATB: '정', ATE: '장용정', ATR: '서방정', ACH: '캡슐', ACS: '연질캡슐', ACE: '장용캡슐',
  ASY: '시럽', ASS: '현탁액', ALQ: '내복액', AGN: '과립', APD: '산',
};

async function main(): Promise<void> {
  const proposal = JSON.parse(fs.readFileSync(P_PROPOSAL, 'utf8'));
  const oralGroups = (proposal.groups as any[]).filter((g) => g.route === 'oral')
    .sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));
  const allMasterIds = oralGroups.flatMap((g) => g.masterIds as string[]);
  const fpOf = new Map<string, string>();
  const gOf = new Map<string, any>();
  for (const g of oralGroups) for (const id of g.masterIds as string[]) { fpOf.set(id, g.fp); gOf.set(id, g); }

  // ── 선행 트랙 LIVE (masterId / fp / sourceRef) ──────────────────────────────────
  const liveMasters = new Set<string>(), liveFps = new Set<string>(), liveRefs = new Set<string>();
  const readJson = (f: string): any | null => {
    const p = path.join(OUT_DIR, f);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
  };
  const v2 = readJson('otc-remaining-full-corpus-census-v2.json');
  const fpToM = new Map<string, string[]>((v2?.readyGroups || []).map((g: any) => [g.fp, g.masterIds]));
  for (const k of ['ga', 'na', 'da']) for (const lang of ['ko', 'en'])
    for (const f of [`otc-v2-apply-run.${k}.${lang}.json`, `otc-external-site-final-apply-run.${k}.${lang}.json`]) {
      const j = readJson(f); if (!j?.reports) continue;
      for (const r of j.reports as any[]) {
        if (r.fp) { liveFps.add(r.fp); for (const m of fpToM.get(r.fp) || []) liveMasters.add(m); }
        if (r.sourceRef) liveRefs.add(String(r.sourceRef));
      }
    }
  for (const f of ['otc-external-site-final-approved-ssot-v1.json', 'otc-external-site-recovery-approved-ssot-v1.json']) {
    const j = readJson(f); if (!j) continue;
    for (const m of (j.masters || []) as any[]) { liveMasters.add(m.masterId); if (m.fp) liveFps.add(m.fp); }
  }
  const sp = readJson('otc-external-site-split-required-audit-v1.json');
  for (const m of (sp?.masters || []) as any[]) if (m.verdict === 'READY_SPLIT') { liveMasters.add(m.masterId); liveFps.add(m.newFp); }

  // ── DB 재검증 ───────────────────────────────────────────────────────────────────
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 1800000 },
  });
  await ds.initialize();
  const idArr = `ARRAY[${allMasterIds.map((i) => `'${i}'`).join(',')}]::uuid[]`;

  const rows: Array<{ id: string; name: string; content: string | null }> = await ds.query(`
    SELECT pm.id::text id, pm.name, es.content FROM product_masters pm
    LEFT JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true
    WHERE pm.id = ANY(${idArr}) ORDER BY pm.id`);
  const authoredHave: Array<{ id: string }> = await ds.query(`
    SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      AND source_type = ANY(${AUTHORED}) AND master_id = ANY(${idArr}) ORDER BY 1`);
  const gcRows: Array<{ mid: string; gencodes: string[] | null }> = await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
    FROM product_identifiers pi
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode'=pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
      AND pi.product_master_id = ANY(${idArr}) GROUP BY 1 ORDER BY 1`);
  await ds.destroy();
  const rowBy = new Map(rows.map((r) => [r.id, r]));
  const gcBy = new Map(gcRows.map((r) => [r.mid, (r.gencodes || []).filter(Boolean).sort()]));

  type M = {
    masterId: string; name: string; fp: string; gencode: string; suffix: string;
    ingredientStrengthCode: string; form: string; route: string;
    safetyFingerprint: Record<string, string>;
    official: { indication: string; dosage: string; caution: string };
  };
  const masters: M[] = [];
  const fpMismatch: string[] = [], sourceMissing: string[] = [], nonOral: string[] = [], routeConflict: string[] = [];

  for (const id of [...allMasterIds].sort()) {
    const row = rowBy.get(id), g = gOf.get(id);
    if (!row || !row.content) { sourceMissing.push(id); continue; }
    const gcs = gcBy.get(id) || [];
    if (gcs.length !== 1 || gcs[0].length < 9) { fpMismatch.push(id); continue; }
    const gencode = gcs[0], suffix = gencode.slice(6, 9).toUpperCase();
    if (!ORAL_SUFFIX[suffix]) { nonOral.push(id); continue; }

    const sec = sections(row.content);
    const ind = sec['효능·효과'] || '', dos = sec['용법·용량'] || '';
    const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
    const indP = normalize(ind), dosP = normalize(dos), cauP = normalize(cau);
    if (!indP || !dosP || !cauP) { sourceMissing.push(id); continue; }
    if (findEvidence(dosP, ORAL_CONTRADICTION)) { routeConflict.push(id); continue; }

    const axes = {
      indication: H(indP), dosage: H(dosP), caution: H(cauP),
      numeric: H(numericTokens(dos).join('|')), age: H(ageTokens(`${dos}\n${cau}`).join('|')),
      duration: H(durationTokens(`${dos}\n${cau}`).join('|')), contraindication: contraSig(cau),
      codeIngredientStrength: gencode.slice(0, 6), codeForm: suffix, route: 'oral',
    };
    const fp = H(Object.values(axes).join('|'));
    if (fp !== g.fp) { fpMismatch.push(id); continue; }

    masters.push({
      masterId: id, name: row.name, fp, gencode, suffix,
      ingredientStrengthCode: gencode.slice(0, 6), form: ORAL_SUFFIX[suffix], route: 'oral',
      safetyFingerprint: axes,
      official: { indication: indP.slice(0, 260), dosage: dosP.slice(0, 260), caution: cauP.slice(0, 260) },
    });
  }
  masters.sort((a, b) => (a.masterId < b.masterId ? -1 : 1));

  // ── 단위 배분 — fp 그룹 분할 금지 ───────────────────────────────────────────────
  const byFp = new Map<string, M[]>();
  for (const m of masters) { if (!byFp.has(m.fp)) byFp.set(m.fp, []); byFp.get(m.fp)!.push(m); }
  const groups = [...byFp.entries()].map(([fp, arr]) => ({
    fp, size: arr.length, gencode: arr[0].gencode, suffix: arr[0].suffix,
    form: arr[0].form, ingredientStrengthCode: arr[0].ingredientStrengthCode,
    masterIds: arr.map((x) => x.masterId).sort(),
  })).sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));

  const units: Array<{ unitId: string; fps: string[]; masters: number; masterIds: string[] }> = [
    { unitId: 'oral-unit-1', fps: [], masters: 0, masterIds: [] },
    { unitId: 'oral-unit-2', fps: [], masters: 0, masterIds: [] },
  ];
  for (const g of groups) {
    const u = units[0].masters <= units[1].masters ? units[0] : units[1];
    u.fps.push(g.fp); u.masters += g.size; u.masterIds.push(...g.masterIds);
  }
  for (const u of units) { u.fps.sort(); u.masterIds.sort(); }

  const sorted = (o: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  const tallyOf = (ids: string[], f: (m: M) => string): Record<string, number> => {
    const byId = new Map(masters.map((m) => [m.masterId, m]));
    const o: Record<string, number> = {};
    for (const id of ids) { const k = f(byId.get(id)!); o[k] = (o[k] || 0) + 1; }
    return sorted(o);
  };
  /**
   * 순위표는 **배열**로 만든다.
   * 일반명코드 앞 6자리(`101804` 등)는 정수형 문자열이라 객체 키로 쓰면 V8 이
   * 숫자 오름차순으로 재정렬해 Object.entries() 의 정렬이 무효화된다.
   */
  const rankOf = (ids: string[], f: (m: M) => string, n = 25): Array<{ code: string; masters: number }> => {
    const byId = new Map(masters.map((m) => [m.masterId, m]));
    const o = new Map<string, number>();
    for (const id of ids) { const k = f(byId.get(id)!); o.set(k, (o.get(k) || 0) + 1); }
    return [...o.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, n).map(([code, masters]) => ({ code, masters }));
  };

  const uniFp = units.flatMap((u) => u.fps), uniM = units.flatMap((u) => u.masterIds);
  const splitGroups = groups.filter((g) => {
    const inU1 = g.masterIds.some((id) => units[0].masterIds.includes(id));
    const inU2 = g.masterIds.some((id) => units[1].masterIds.includes(id));
    return inU1 && inU2;
  });

  const gates = {
    G1_totalMasters: masters.length, G1_expected: EXPECTED_MASTERS,
    G1_totalMatch: masters.length === EXPECTED_MASTERS,
    G1_totalFingerprints: groups.length, G1_fpExpected: EXPECTED_FP,
    G1_fpMatch: groups.length === EXPECTED_FP,
    G2_missingMasters: allMasterIds.length - masters.length,
    G2_duplicateMasters: uniM.length - new Set(uniM).size,
    G3_fpGroupSplitAcrossUnits: splitGroups.length,
    G3_unitFpIntersection: uniFp.length - new Set(uniFp).size,
    G3_unitMasterIntersection: uniM.length - new Set(uniM).size,
    G4_safetyFpMismatch: fpMismatch.length,
    G5_officialSourceMissing: sourceMissing.length,
    G6_nonOralContamination: nonOral.length,
    G6_oralRouteConflict: routeConflict.length,
    G7_liveMasterIntersection: uniM.filter((m) => liveMasters.has(m)).length,
    G7_liveFpIntersection: uniFp.filter((f) => liveFps.has(f)).length,
    G7_liveSourceRefIntersection: uniM.filter((m) => liveRefs.has(m)).length,
    G7_liveTotals: { masters: liveMasters.size, fps: liveFps.size, sourceRefs: liveRefs.size },
    G8_authoredCanonicalPresent: authoredHave.length,
    G9_writeTotal: masters.length * WRITE.total,
    G9_writeMatch: masters.length * WRITE.total === EXPECTED_WRITE,
    dbWrite: 0,
  };
  const allPass = gates.G1_totalMatch && gates.G1_fpMatch && gates.G2_missingMasters === 0
    && gates.G2_duplicateMasters === 0 && gates.G3_fpGroupSplitAcrossUnits === 0
    && gates.G3_unitFpIntersection === 0 && gates.G3_unitMasterIntersection === 0
    && gates.G4_safetyFpMismatch === 0 && gates.G5_officialSourceMissing === 0
    && gates.G6_nonOralContamination === 0 && gates.G6_oralRouteConflict === 0
    && gates.G7_liveMasterIntersection === 0 && gates.G7_liveFpIntersection === 0
    && gates.G7_liveSourceRefIntersection === 0 && gates.G8_authoredCanonicalPresent === 0
    && gates.G9_writeMatch;

  const masterById = new Map(masters.map((m) => [m.masterId, m]));
  const mkSsot = (i: number): any => {
    const u = units[i];
    const gs = groups.filter((g) => u.fps.includes(g.fp));
    return {
      wo: 'WO-O4O-OTC-UNPRODUCED-ORAL-LARGE-UNIT-APPROVAL-V1',
      artifact: 'oral-unit-approved-ssot',
      status: allPass ? 'APPROVED_FOR_PRODUCTION' : 'BLOCKED_GATE_FAILURE',
      unitId: u.unitId, executionOrder: i + 1,
      agent: 'la', readOnly: true, dbWrite: 0,
      basedOn: { census: 'otc-unproduced-large-census-v1.json', proposal: 'otc-unproduced-ready-split-proposal-v1.json', commit: '6ca15aa81',
        note: 'census·proposal 원본은 수정하지 않았다. 본 파일이 생산 승인 SSOT 다.' },
      route: 'oral',
      totals: { fingerprints: u.fps.length, masters: u.masters },
      writePlan: { perMaster: WRITE, ko: u.masters * WRITE.ko, en: u.masters * WRITE.en, total: u.masters * WRITE.total },
      distribution: {
        byForm: tallyOf(u.masterIds, (m) => m.form),
        bySuffix: tallyOf(u.masterIds, (m) => m.suffix),
        byIngredientStrengthCode: rankOf(u.masterIds, (m) => m.ingredientStrengthCode),
      },
      liveExclusionVerification: {
        method: 'masterId · fingerprint · sourceRef · authored STORE canonical 4방향',
        liveMasterIntersection: u.masterIds.filter((m) => liveMasters.has(m)).length,
        liveFpIntersection: u.fps.filter((f) => liveFps.has(f)).length,
        liveSourceRefIntersection: u.masterIds.filter((m) => liveRefs.has(m)).length,
        authoredCanonicalPresent: authoredHave.filter((a) => u.masterIds.includes(a.id)).length,
        comparedAgainst: { liveMasters: liveMasters.size, liveFingerprints: liveFps.size, liveSourceRefs: liveRefs.size },
      },
      safetyFingerprintAxes: ['성분(코드[1-4])', '함량(코드[5-6])', '제형(코드[7-9])', '경구 투여경로',
        '효능·효과', '용법 수치', '연령', '사용 기간', '금기·주의사항', '단일제/복합제(코드[1-6])'],
      productionRules: [
        'fingerprint 그룹은 unit 사이에서 분할하지 않는다',
        'unit 은 에이전트 분할이 아니라 transaction·검증 단위다',
        'LIVE write-owner 는 단일 에이전트로 지정한다',
        'route=oral 은 공식 일반명코드 접미에서 확정. 제품명으로 재추정하지 않는다',
      ],
      nextUnit: i === 0 ? { unitId: 'oral-unit-2', condition: 'oral-unit-1 완료 · postVerify · 독립검증 GREEN 후 허용' } : null,
      groups: gs.map((g) => ({
        fp: g.fp, gencode: g.gencode, suffix: g.suffix, form: g.form,
        ingredientStrengthCode: g.ingredientStrengthCode, size: g.size, masterIds: g.masterIds,
      })),
      masters: u.masterIds.map((id) => masterById.get(id)!),
    };
  };

  const order = {
    wo: 'WO-O4O-OTC-UNPRODUCED-ORAL-LARGE-UNIT-APPROVAL-V1',
    artifact: 'execution-order-ledger',
    status: allPass ? 'APPROVED_FOR_PRODUCTION' : 'BLOCKED_GATE_FAILURE',
    agent: 'la', readOnly: true, dbWrite: 0,
    route: 'oral',
    totals: { fingerprints: groups.length, masters: masters.length,
      writePlan: { ko: masters.length * WRITE.ko, en: masters.length * WRITE.en, total: masters.length * WRITE.total } },
    writeOwner: { policy: '단일 에이전트', note: 'Unit 1 과 Unit 2 의 DB write-owner 는 동일 에이전트 사용을 권고한다.' },
    sequence: units.map((u, i) => ({
      step: i + 1, unitId: u.unitId, ssot: i === 0 ? path.basename(OUT_U1) : path.basename(OUT_U2),
      fingerprints: u.fps.length, masters: u.masters,
      write: { ko: u.masters * WRITE.ko, en: u.masters * WRITE.en, total: u.masters * WRITE.total },
      precondition: i === 0 ? '승인 즉시 착수 가능' : 'oral-unit-1 완료 · postVerify · 독립검증 GREEN',
    })),
    gates, allGatesPass: allPass,
    distribution: {
      byForm: tallyOf(masters.map((m) => m.masterId), (m) => m.form),
      byIngredientStrengthCodeTop: rankOf(masters.map((m) => m.masterId), (m) => m.ingredientStrengthCode),
    },
    integrityLists: { safetyFpMismatch: fpMismatch.sort(), officialSourceMissing: sourceMissing.sort(), nonOral: nonOral.sort(), oralRouteConflict: routeConflict.sort() },
  };

  fs.writeFileSync(OUT_U1, JSON.stringify(mkSsot(0), null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_U2, JSON.stringify(mkSsot(1), null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_ORDER, JSON.stringify(order, null, 2) + '\n', 'utf8');

  console.log('=== OTC UNPRODUCED ORAL — UNIT APPROVAL (read-only · dbWrite=0) ===');
  console.log('status =', order.status);
  console.log('totals =', JSON.stringify(order.totals));
  for (const s of order.sequence) console.log(`  ${s.unitId}: ${s.fingerprints} fp / ${s.masters} master / ${s.write.total}T`);
  console.log('byForm =', JSON.stringify(order.distribution.byForm));
  console.log('ingredientTop8 =', JSON.stringify(order.distribution.byIngredientStrengthCodeTop.slice(0, 8)));
  console.log('gates =', JSON.stringify(gates, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
