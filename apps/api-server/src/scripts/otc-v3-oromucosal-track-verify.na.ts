/**
 * WO-O4O-OTC-EASY-DRUG-READY-OROMUCOSAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1 — oromucosal-unit-1 최종 독립검증(na)
 *
 * apply/postverify 러너와 **별개 코드경로**. read-only(SELECT) 전용.
 * 대상 축은 build 산출물이 아니라 **승인 SSOT(unit ledger)** 에서 직접 읽는다(산출물-독립).
 *
 *   A. canonical 상태 : targetMasters · contentFp · koAuthoredCanonical · enCanonical · easyDeprecated ·
 *      easyStillCanonical · auditKo · canonicalDup
 *   B. sourceRef 격리 : oromucosal 2 sourceRef 행이 14 master 밖에 0 (sourceRefLeak)
 *   C. 저장 content 무결성 : storedContentHashMismatch · officialSixSectionsMismatch · enHangul
 *   R. 구강점막 route 표현 : routeExpressionMismatch (가글·도포·분사·삼킴 여부)
 *      **판정축 = 공식 원문에 존재하는 축만 요구한다.** 원문에 없는 투여 표현을 EN 에 창작 삽입하는 것은
 *      콘텐츠 정책 위반이므로 무조건 요구는 오판정이다(ophthalmic §7 정정과 동일 계열).
 *      삼킴 축은 **방향 검증**이다 — 원문이 삼키라고 하면 EN 이 금지로 뒤집히지 않아야 하고,
 *      원문이 삼키지 말라고 하면 EN 에 금지 지시가 있어야 한다.
 *   D. 전문용 혼입 : professionalUseWritten
 *   E. 범위 사후검증 : oral 540 · topical 327 · ophthalmic 253 불변 · V1/V2 LIVE 불간섭 · 실측 write 84T ·
 *      트랙 전체 214fp / 1,134 master / KO 4,536T / EN 2,268T / 6,804T
 *
 * Usage(apps/api-server): npx tsx src/scripts/otc-v3-oromucosal-track-verify.na.ts [--port 5470]
 */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const CWD = process.cwd();
const readPw = (): string => readFileSync(path.resolve(CWD, '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA = path.resolve(CWD, 'src/scripts/data');
const NA = path.join(DATA, 'otc-ready-na-v3');
const rd = (f: string): any => JSON.parse(readFileSync(path.join(DATA, f), 'utf8'));
const rdNa = (f: string): any => JSON.parse(readFileSync(path.join(NA, f), 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => { const a = arg('--port'); return a ? parseInt(a, 10) : 5470; };
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');

const WO = 'WO-O4O-OTC-EASY-DRUG-READY-OROMUCOSAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1';
const ORAL_WO = ['WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1',
  'WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT2-CONTENT-FP-V3-FINAL-PRODUCTION-V1'];
const PEER_WO: Record<string, string | string[]> = {
  'oral': ORAL_WO,
  'topical-unit-1': 'WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1',
  'ophthalmic-unit-1': 'WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1',
};
const UNIT = 'oromucosal-unit-1';
const ORAL_UNITS = ['oral-unit-1', 'oral-unit-2'];
const DONE_UNITS = ['topical-unit-1', 'ophthalmic-unit-1'];
const strip = (s: any): string => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

/**
 * 구강점막 route 표현 계약 — 공식 KO 원문에 축이 있을 때만 EN 을 요구한다(조건부).
 * ko = 원문에 그 축이 존재하는가 · en = EN 저장본이 그 축을 보존했는가.
 */
const ROUTE_AXIS: Array<{ label: string; ko: RegExp; en: RegExp }> = [
  { label: '가글·헹굼', ko: /가글|양치|헹구|헹군|함수(?!점)/, en: /\brinse|\bgargle|swish/i },
  { label: '도포', ko: /도포|바른다|바르고|바를|발라/, en: /\bapply\b|\bapplied\b|\bapplying\b/i },
  { label: '분사', ko: /분사|뿌린다|뿌리고|뿌려|스프레이/, en: /\bspray\b|\bsprayed\b|\bsprays\b/i },
  { label: '구강 부위', ko: /구강|입\s?안|입안|혀\s?위|혀에|잇몸|인후|목구멍/, en: /\bmouth\b|\boral\b|\btongue\b|\bgum(s)?\b|\bthroat\b/i },
  { label: '씹기', ko: /씹어|씹는다|씹으/, en: /\bchew/i },
];

async function main(): Promise<void> {
  const ledger = rd('otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json');
  const unitsById: Record<string, any> = Object.fromEntries(ledger.units.map((u: any) => [u.unit, u]));
  const ids: string[] = unitsById[UNIT].masterIds;            // 승인 SSOT 축
  const refs: string[] = unitsById[UNIT].sourceRefs;
  const T = ids.length;
  const oralIds = [...new Set(ORAL_UNITS.flatMap((u) => unitsById[u].masterIds))] as string[];
  const ko = rdNa(`build-${UNIT}.json`);
  const en = rdNa(`en-build-${UNIT}.json`);
  const enByFp: Record<string, any> = Object.fromEntries(en.fingerprints.map((f: any) => [f.fp, f]));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 } });
  await ds.initialize();
  const fails: string[] = [];
  const notes: any = { wo: WO, verifier: 'na-track-independent', unit: UNIT };
  try {
    // ── A. canonical 상태 ──
    const a = (await ds.query(`SELECT
      count(*) FILTER (WHERE ko_authored)::int "koAuthoredCanonical",
      count(*) FILTER (WHERE en_authored)::int "enCanonical",
      count(*) FILTER (WHERE dep_easy)::int "easyDeprecated",
      count(*) FILTER (WHERE easy_left)::int "easyStillCanonical",
      count(*) FILTER (WHERE kocanon>1 OR encanon>1)::int "canonicalDup",
      count(*) FILTER (WHERE kocanon<>1)::int "koCanonNot1",
      count(*) FILTER (WHERE encanon<>1)::int "enCanonNot1"
      FROM (SELECT mid,
        (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) kocanon,
        (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) encanon,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) ko_authored,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) en_authored,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easy_left
        FROM unnest($1::uuid[]) mid) t`, [ids]))[0];
    const auditKo = (await ds.query(`SELECT count(*)::int n, count(DISTINCT master_id)::int m FROM shared_product_description_audit_logs
      WHERE master_id=ANY($1::uuid[]) AND event_type='canonical_replaced' AND language='ko' AND (metadata->>'productionWo')=$2`, [ids, WO]))[0];
    notes.A = { targetMasters: T, contentFp: refs.length, ...a, auditKo: auditKo.n, auditKoMasters: auditKo.m };
    if (T !== 14) fails.push(`A: targetMasters=${T}!=14`);
    if (refs.length !== 2) fails.push(`A: contentFp=${refs.length}!=2`);
    if (a.koAuthoredCanonical !== 14) fails.push(`A: koAuthoredCanonical=${a.koAuthoredCanonical}!=14`);
    if (a.enCanonical !== 14) fails.push(`A: enCanonical=${a.enCanonical}!=14`);
    if (a.easyDeprecated !== 14) fails.push(`A: easyDeprecated=${a.easyDeprecated}!=14`);
    if (a.easyStillCanonical !== 0) fails.push(`A: easyStillCanonical=${a.easyStillCanonical}`);
    if (a.canonicalDup !== 0) fails.push(`A: canonicalDup=${a.canonicalDup}`);
    if (a.koCanonNot1 !== 0) fails.push(`A: koCanonNot1=${a.koCanonNot1}`);
    if (a.enCanonNot1 !== 0) fails.push(`A: enCanonNot1=${a.enCanonNot1}`);
    if (auditKo.n !== 14) fails.push(`A: auditKo=${auditKo.n}!=14`);

    // ── B. sourceRef 격리 ──
    const b = (await ds.query(`SELECT
      (SELECT count(*)::int FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL) "v3RowsTotal",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL AND NOT master_id=ANY($2::uuid[])) "sourceRefLeak",
      (SELECT count(DISTINCT source_ref_id)::int FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL) "distinctRefsUsed"
      `, [refs, ids]))[0];
    notes.B = { ...b, expectedRows: T * 2, expectedRefs: refs.length };
    if (b.v3RowsTotal !== T * 2) fails.push(`B: v3Rows=${b.v3RowsTotal}!=${T * 2}`);
    if (b.sourceRefLeak !== 0) fails.push(`B: sourceRefLeak=${b.sourceRefLeak}`);
    if (b.distinctRefsUsed !== refs.length) fails.push(`B: distinctRefsUsed=${b.distinctRefsUsed}!=${refs.length}`);

    // ── C. 저장 content 무결성 + 공식 6섹션 보존 ──
    const SAFETY_SECTIONS = ['경고', '사용상 주의사항', '이상반응', '상호작용'];
    const RECOMPOSED_SECTIONS = ['효능·효과', '용법·용량'];
    const blank = (s: any): boolean => !s || !String(s).replace(/<[^>]*>/g, '').replace(/\s|&nbsp;/g, '').trim();
    const nums = (s: any): string[] => (String(s).replace(/<[^>]*>/g, ' ').match(/\d+(?:\.\d+)?/g) || []);
    let storedContentHashMismatch = 0, officialSixSectionsMismatch = 0, enHangul = 0, variantFps = 0;
    let safetyHeadingExpected = 0, safetyHeadingFound = 0, numericExpected = 0, numericMissing = 0;
    // ── R. 구강점막 route 표현 (DB 저장 EN 실물 대조) ──
    let routeExpressionMismatch = 0;
    const routeAxisDetail: any[] = [];
    for (const f of ko.fingerprints) {
      const kRows = await ds.query(`SELECT DISTINCT md5(content) h FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type='mfds_drug_otc' AND description_type='STORE' AND deleted_at IS NULL`, [f.masterIds]);
      const eRows = await ds.query(`SELECT DISTINCT md5(content) h, bool_or(content ~ '[가-힣]') hg, min(content) c FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND language='en' AND status='canonical' AND source_type='mfds_drug_otc' AND description_type='STORE' AND deleted_at IS NULL GROUP BY md5(content)`, [f.masterIds]);
      if (kRows.length !== 1 || eRows.length !== 1) { variantFps++; continue; }
      if (kRows[0].h !== md5(f.koHtml)) storedContentHashMismatch++;
      if (eRows[0].h !== md5(enByFp[f.fp].enHtml)) storedContentHashMismatch++;
      if (eRows[0].hg) enHangul++;
      const sec = f.officialSections || {};
      const koHtml: string = f.koHtml;
      for (const s of SAFETY_SECTIONS) {
        if (blank(sec[s])) continue;
        safetyHeadingExpected++;
        if (koHtml.includes(`<h2>${s}</h2>`)) safetyHeadingFound++;
        else { officialSixSectionsMismatch++; fails.push(`C: fp ${f.fp} 안전섹션 '${s}' 헤딩 누락`); }
      }
      for (const s of RECOMPOSED_SECTIONS) {
        if (blank(sec[s])) continue;
        const want = [...new Set(nums(sec[s]))];
        numericExpected += want.length;
        const miss = want.filter((n) => !koHtml.includes(n));
        if (miss.length) { numericMissing += miss.length; officialSixSectionsMismatch++; fails.push(`C: fp ${f.fp} '${s}' 수치 누락 ${miss.slice(0, 5).join(',')}`); }
      }

      // R: 조건부 route 표현 축 — 공식 원문(용법·용량 + 주의) 에 있는 축만 EN 에 요구
      const official = `${strip(sec['용법·용량'])}\n${strip(sec['사용상 주의사항'])}\n${strip(sec['경고'])}`;
      const enText = strip(eRows[0].c);
      const required: string[] = [], missing: string[] = [];
      for (const ax of ROUTE_AXIS) {
        if (!ax.ko.test(official)) continue;
        required.push(ax.label);
        if (!ax.en.test(enText)) missing.push(ax.label);
      }
      // 삼킴 방향 축 — 원문 지시와 EN 지시가 뒤집히지 않아야 한다
      const koNoSwallow = /삼키지\s?(마|말|않)|삼켜서는\s?안|삼키면\s?안/.test(official);
      const koSwallow = /삼키도록|삼킨다|삼켜|바로\s?삼/.test(official);
      const enNoSwallow = /do not swallow|must not swallow|without swallowing|avoid swallowing/i.test(enText);
      const enSwallow = /\bswallow/i.test(enText);
      let swallowAxis = 'not-stated';
      if (koNoSwallow) { swallowAxis = 'must-not-swallow'; if (!enNoSwallow) missing.push('삼킴금지'); required.push('삼킴금지'); }
      else if (koSwallow) { swallowAxis = 'swallow'; required.push('삼킴'); if (!enSwallow) missing.push('삼킴'); if (enNoSwallow) missing.push('삼킴지시-역전'); }
      if (missing.length) { routeExpressionMismatch++; fails.push(`R: fp ${f.fp} route 표현 누락 ${missing.join(',')}`); }
      routeAxisDetail.push({ fp: f.fp, form: f.form, requiredAxes: required, missing, swallowAxis });
    }
    notes.C = { fpChecked: ko.fingerprints.length, variantFps, storedContentHashMismatch, officialSixSectionsMismatch, enHangul,
      safetyHeadingExpected, safetyHeadingFound, numericExpected, numericMissing };
    notes.R = { routeExpressionMismatch, detail: routeAxisDetail,
      judgmentAxisNote: '공식 원문에 존재하는 축만 요구 — 원문에 없는 투여 표현을 EN 에 창작 삽입하지 않는다' };
    if (variantFps !== 0) fails.push(`C: content variant fps=${variantFps}`);
    if (storedContentHashMismatch !== 0) fails.push(`C: storedContentHashMismatch=${storedContentHashMismatch}`);
    if (officialSixSectionsMismatch !== 0) fails.push(`C: officialSixSectionsMismatch=${officialSixSectionsMismatch}`);
    if (enHangul !== 0) fails.push(`C: enHangul=${enHangul}`);
    if (routeExpressionMismatch !== 0) fails.push(`R: routeExpressionMismatch=${routeExpressionMismatch}`);

    // ── D. 전문용 혼입 ──
    const d = (await ds.query(`SELECT
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE NOT EXISTS(SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id=mid AND e.drug_category='otc' AND e.deleted_at IS NULL)) "nonOtcTargets",
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.source_ref_id=ANY($2::uuid[]) AND s.deleted_at IS NULL
         AND NOT EXISTS(SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id=s.master_id AND e.drug_category='otc' AND e.deleted_at IS NULL)) "professionalUseWritten"
      `, [ids, refs]))[0];
    notes.D = d;
    if (d.nonOtcTargets !== 0) fails.push(`D: nonOtcTargets=${d.nonOtcTargets}`);
    if (d.professionalUseWritten !== 0) fails.push(`D: professionalUseWritten=${d.professionalUseWritten}`);

    // ── E1. 선행 route 불변 (oral 540 · topical 327 · ophthalmic 253) ──
    notes.E_peers = {};
    for (const [label, pIds, n, pWo] of [
      ['oral', oralIds, 540, ORAL_WO], ['topical-unit-1', unitsById['topical-unit-1'].masterIds, 327, PEER_WO['topical-unit-1']],
      ['ophthalmic-unit-1', unitsById['ophthalmic-unit-1'].masterIds, 253, PEER_WO['ophthalmic-unit-1']],
    ] as Array<[string, string[], number, any]>) {
      const woArr: string[] = Array.isArray(pWo) ? pWo : [pWo];
      const r = (await ds.query(`SELECT
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)) "koAuthoredCanonical",
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)) "enCanonical",
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL)) "easyDeprecated",
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)) "easyStillCanonical",
        (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND (metadata->>'productionWo')=$2) "thisWoAudit",
        (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_ref_id=ANY($3::uuid[]) AND deleted_at IS NULL) "oromucosalRefRows",
        (SELECT count(DISTINCT master_id)::int FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND (metadata->>'productionWo')=ANY($4)) "peerAuditMasters"
        `, [pIds, WO, refs, woArr]))[0];
      notes.E_peers[label] = { masters: pIds.length, ...r };
      if (pIds.length !== n) fails.push(`E: ${label} ledger masters=${pIds.length}!=${n}`);
      if (r.koAuthoredCanonical !== n) fails.push(`E: ${label} koAuthoredCanonical=${r.koAuthoredCanonical}!=${n}`);
      if (r.enCanonical !== n) fails.push(`E: ${label} enCanonical=${r.enCanonical}!=${n}`);
      if (r.easyDeprecated !== n) fails.push(`E: ${label} easyDeprecated=${r.easyDeprecated}!=${n}`);
      if (r.easyStillCanonical !== 0) fails.push(`E: ${label} easyStillCanonical=${r.easyStillCanonical}`);
      if (r.thisWoAudit !== 0) fails.push(`E: ${label} 에 이번 WO audit=${r.thisWoAudit}`);
      if (r.oromucosalRefRows !== 0) fails.push(`E: ${label} 에 oromucosal V3 sourceRef 행=${r.oromucosalRefRows}`);
      if (r.peerAuditMasters !== n) fails.push(`E: ${label} peer audit masters=${r.peerAuditMasters}!=${n}`);
    }

    // ── E2. V1/V2 LIVE 불간섭 + 실측 write ──
    const e2 = (await ds.query(`SELECT
      (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE (metadata->>'productionWo')=$1) "thisWoAuditRows",
      (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE (metadata->>'productionWo')=$1 AND NOT master_id=ANY($2::uuid[])) "thisWoAuditOutside",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($2::uuid[]) AND source_type='mfds_drug_otc' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL) "authoredCanonicalRows",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($2::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE' AND status='deprecated' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL) "easyDeprecatedRows"
      `, [WO, ids]))[0];
    const measuredWrite = e2.thisWoAuditRows + e2.easyDeprecatedRows + e2.authoredCanonicalRows * 2;
    notes.E_writeTotal = { ...e2, koContract: T * 4, enContract: T * 2, expectedTotal: T * 6, measuredWrite };
    if (e2.thisWoAuditOutside !== 0) fails.push(`E: 이번 WO audit 이 대상 밖 master 를 변경=${e2.thisWoAuditOutside} (V1/V2 간섭)`);
    if (e2.authoredCanonicalRows !== T * 2) fails.push(`E: authoredCanonicalRows=${e2.authoredCanonicalRows}!=${T * 2}`);
    if (e2.easyDeprecatedRows !== T) fails.push(`E: easyDeprecatedRows=${e2.easyDeprecatedRows}!=${T}`);
    if (measuredWrite !== T * 6) fails.push(`E: measuredWrite=${measuredWrite}!=${T * 6}`);

    // ── E3. READY 1,134 V3 트랙 전체 완료 ──
    const allIds = [...new Set(ledger.units.flatMap((u: any) => u.masterIds))] as string[];
    const allRefs = [...new Set(ledger.units.flatMap((u: any) => u.sourceRefs))] as string[];
    const e3 = (await ds.query(`SELECT
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)) "koAuthoredCanonical",
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)) "enCanonical",
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)) "easyStillCanonical",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE source_ref_id=ANY($2::uuid[]) AND deleted_at IS NULL) "v3Rows",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE source_ref_id=ANY($2::uuid[]) AND deleted_at IS NULL AND NOT master_id=ANY($1::uuid[])) "v3RowsOutside",
      (SELECT count(DISTINCT source_ref_id)::int FROM shared_product_descriptions WHERE source_ref_id=ANY($2::uuid[]) AND deleted_at IS NULL) "v3RefsUsed"
      `, [allIds, allRefs]))[0];
    notes.E_track = { ledgerFp: ledger.totals.fp, ledgerMasters: ledger.totals.masters, distinctMasters: allIds.length,
      distinctRefs: allRefs.length, ...e3, koWrite: allIds.length * 4, enWrite: allIds.length * 2, totalWrite: allIds.length * 6 };
    if (allIds.length !== 1134) fails.push(`E: 트랙 master=${allIds.length}!=1134`);
    if (allRefs.length !== 214) fails.push(`E: 트랙 fp=${allRefs.length}!=214`);
    if (e3.koAuthoredCanonical !== 1134) fails.push(`E: 트랙 koAuthoredCanonical=${e3.koAuthoredCanonical}!=1134`);
    if (e3.enCanonical !== 1134) fails.push(`E: 트랙 enCanonical=${e3.enCanonical}!=1134`);
    if (e3.easyStillCanonical !== 0) fails.push(`E: 트랙 easyStillCanonical=${e3.easyStillCanonical}`);
    if (e3.v3Rows !== 2268) fails.push(`E: 트랙 V3 rows=${e3.v3Rows}!=2268`);
    if (e3.v3RowsOutside !== 0) fails.push(`E: 트랙 V3 rows outside=${e3.v3RowsOutside}`);
    if (e3.v3RefsUsed !== 214) fails.push(`E: 트랙 V3 refs used=${e3.v3RefsUsed}!=214`);
  } finally { await ds.destroy(); }

  const out = { ...notes, pass: fails.length === 0, failCount: fails.length, fails };
  console.log(JSON.stringify(out, null, 2));
  console.log(`\n=== OROMUCOSAL-UNIT-1 TRACK VERIFY · PASS=${out.pass} · fails=${out.failCount} ===`);
  if (!out.pass) process.exit(2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
