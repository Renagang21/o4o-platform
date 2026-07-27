/**
 * WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1 — topical-unit-1 최종 독립검증(na)
 *
 * apply/postverify 러너와 **별개 코드경로**. read-only(SELECT) 전용.
 * 대상 축은 build 산출물이 아니라 **승인 SSOT(unit ledger)** 에서 직접 읽는다(산출물-독립).
 *
 *   A. topical-unit-1 canonical 상태 : targetMasters · contentFp · koAuthoredCanonical · enCanonical ·
 *      easyDeprecated · easyStillCanonical · auditKo · canonicalDup
 *   B. sourceRef 격리                : topical 55 sourceRef 행이 327 master 밖에 0 (sourceRefLeak)
 *   C. 저장 content 무결성            : storedContentHashMismatch · officialSixSectionsMismatch · enHangul
 *   D. 전문용 혼입                    : professionalUseWritten (drug_category != otc 인 master 에 쓰인 행)
 *   E. 범위 사후검증                  : oral 540 불변 · ophthalmic 253 write 0 · oromucosal 14 write 0 ·
 *      V1/V2 LIVE 불간섭 · 실측 write 총량 1,962T (audit/row 앵커 환산)
 *
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-v3-topical-track-verify.na.ts [--port 5472]
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
const port = (): number => { const a = arg('--port'); return a ? parseInt(a, 10) : 5472; };
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');

const WO = 'WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1';
const ORAL_WO = ['WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1',
  'WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT2-CONTENT-FP-V3-FINAL-PRODUCTION-V1'];
const UNIT = 'topical-unit-1';
const ORAL_UNITS = ['oral-unit-1', 'oral-unit-2'];
const UNTOUCHED_UNITS = ['ophthalmic-unit-1', 'oromucosal-unit-1'];

async function main(): Promise<void> {
  const ledger = rd('otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json');
  const unitsById: Record<string, any> = Object.fromEntries(ledger.units.map((u: any) => [u.unit, u]));
  const ids: string[] = unitsById[UNIT].masterIds;          // 승인 SSOT 축
  const refs: string[] = unitsById[UNIT].sourceRefs;
  const T = ids.length;
  const oralIds = [...new Set(ORAL_UNITS.flatMap((u) => unitsById[u].masterIds))] as string[];
  const oralRefs = [...new Set(ORAL_UNITS.flatMap((u) => unitsById[u].sourceRefs))] as string[];
  // 저장 content 대조용 payload (build 산출물은 '기대값' 으로만 쓰고 대상 선정에는 쓰지 않는다)
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
    if (T !== 327) fails.push(`A: targetMasters=${T}!=327`);
    if (refs.length !== 55) fails.push(`A: contentFp=${refs.length}!=55`);
    if (a.koAuthoredCanonical !== 327) fails.push(`A: koAuthoredCanonical=${a.koAuthoredCanonical}!=327`);
    if (a.enCanonical !== 327) fails.push(`A: enCanonical=${a.enCanonical}!=327`);
    if (a.easyDeprecated !== 327) fails.push(`A: easyDeprecated=${a.easyDeprecated}!=327`);
    if (a.easyStillCanonical !== 0) fails.push(`A: easyStillCanonical=${a.easyStillCanonical}`);
    if (a.canonicalDup !== 0) fails.push(`A: canonicalDup=${a.canonicalDup}`);
    if (a.koCanonNot1 !== 0) fails.push(`A: koCanonNot1=${a.koCanonNot1}`);
    if (a.enCanonNot1 !== 0) fails.push(`A: enCanonNot1=${a.enCanonNot1}`);
    if (auditKo.n !== 327) fails.push(`A: auditKo=${auditKo.n}!=327`);

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

    // ── C. 저장 content 무결성 (fp별 DISTINCT 해시 · 공식 6섹션 · EN 한글) ──
    // 공식 6섹션 보존 계약(composer contract):
    //   · 안전 4섹션(경고/사용상 주의사항/이상반응/상호작용) = 공식 라벨을 **헤딩 그대로** 유지해야 한다.
    //   · 효능·효과/용법·용량 = 소비자 친화 재구성 허용(헤딩은 '한눈에 보기'/'사용 안내')이므로 헤딩이 아니라
    //     **원문 수치(용량·연령·기간 등) 전량 잔존**으로 보존을 판정한다. (CLAUDE.md 콘텐츠 작성 불변 원칙)
    const SAFETY_SECTIONS = ['경고', '사용상 주의사항', '이상반응', '상호작용'];
    const RECOMPOSED_SECTIONS = ['효능·효과', '용법·용량'];
    const blank = (s: any): boolean => !s || !String(s).replace(/<[^>]*>/g, '').replace(/\s|&nbsp;/g, '').trim();
    const nums = (s: any): string[] => (String(s).replace(/<[^>]*>/g, ' ').match(/\d+(?:\.\d+)?/g) || []);
    let storedContentHashMismatch = 0, officialSixSectionsMismatch = 0, enHangul = 0, variantFps = 0;
    let safetyHeadingExpected = 0, safetyHeadingFound = 0, numericExpected = 0, numericMissing = 0;
    for (const f of ko.fingerprints) {
      const kRows = await ds.query(`SELECT DISTINCT md5(content) h FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type='mfds_drug_otc' AND description_type='STORE' AND deleted_at IS NULL`, [f.masterIds]);
      const eRows = await ds.query(`SELECT DISTINCT md5(content) h, bool_or(content ~ '[가-힣]') hg FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND language='en' AND status='canonical' AND source_type='mfds_drug_otc' AND description_type='STORE' AND deleted_at IS NULL GROUP BY 1`, [f.masterIds]);
      if (kRows.length !== 1 || eRows.length !== 1) { variantFps++; continue; }
      if (kRows[0].h !== md5(f.koHtml)) storedContentHashMismatch++;
      if (eRows[0].h !== md5(enByFp[f.fp].enHtml)) storedContentHashMismatch++;
      if (eRows[0].hg) enHangul++;
      // 공식 6섹션 보존 — 위 계약대로 두 축으로 판정한다
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
    }
    notes.C = { fpChecked: ko.fingerprints.length, variantFps, storedContentHashMismatch, officialSixSectionsMismatch, enHangul,
      safetyHeadingExpected, safetyHeadingFound, numericExpected, numericMissing };
    if (variantFps !== 0) fails.push(`C: content variant fps=${variantFps}`);
    if (storedContentHashMismatch !== 0) fails.push(`C: storedContentHashMismatch=${storedContentHashMismatch}`);
    if (officialSixSectionsMismatch !== 0) fails.push(`C: officialSixSectionsMismatch=${officialSixSectionsMismatch}`);
    if (enHangul !== 0) fails.push(`C: enHangul=${enHangul}`);

    // ── D. 전문용 혼입 (drug_category != 'otc' 인 master 에 이번 트랙 행이 쓰였는가) ──
    const d = (await ds.query(`SELECT
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE NOT EXISTS(SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id=mid AND e.drug_category='otc' AND e.deleted_at IS NULL)) "nonOtcTargets",
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.source_ref_id=ANY($2::uuid[]) AND s.deleted_at IS NULL
         AND NOT EXISTS(SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id=s.master_id AND e.drug_category='otc' AND e.deleted_at IS NULL)) "professionalUseWritten"
      `, [ids, refs]))[0];
    notes.D = d;
    if (d.nonOtcTargets !== 0) fails.push(`D: nonOtcTargets=${d.nonOtcTargets}`);
    if (d.professionalUseWritten !== 0) fails.push(`D: professionalUseWritten=${d.professionalUseWritten}`);

    // ── E. 범위 사후검증 ──
    // E1 oral 540 불변 (GREEN 상태 유지 · 이번 WO audit 0 · topical sourceRef 0)
    const e1 = (await ds.query(`SELECT
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)) "koAuthoredCanonical",
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)) "enCanonical",
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL)) "easyDeprecated",
      (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND (metadata->>'productionWo')=$2) "thisWoAudit",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_ref_id=ANY($3::uuid[]) AND deleted_at IS NULL) "topicalRefRows",
      (SELECT count(DISTINCT master_id)::int FROM shared_product_description_audit_logs WHERE (metadata->>'productionWo')=ANY($4)) "oralAuditMasters",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE source_ref_id=ANY($5::uuid[]) AND deleted_at IS NULL) "oralV3Rows"
      `, [oralIds, WO, refs, ORAL_WO, oralRefs]))[0];
    notes.E_oral = { masters: oralIds.length, ...e1, expectedOralRows: oralIds.length * 2 };
    if (e1.koAuthoredCanonical !== 540) fails.push(`E: oral koAuthoredCanonical=${e1.koAuthoredCanonical}!=540`);
    if (e1.enCanonical !== 540) fails.push(`E: oral enCanonical=${e1.enCanonical}!=540`);
    if (e1.easyDeprecated !== 540) fails.push(`E: oral easyDeprecated=${e1.easyDeprecated}!=540`);
    if (e1.thisWoAudit !== 0) fails.push(`E: oral 에 이번 WO audit=${e1.thisWoAudit}`);
    if (e1.topicalRefRows !== 0) fails.push(`E: oral 에 topical V3 sourceRef 행=${e1.topicalRefRows}`);
    if (e1.oralAuditMasters !== 540) fails.push(`E: oral audit masters=${e1.oralAuditMasters}!=540`);
    if (e1.oralV3Rows !== oralIds.length * 2) fails.push(`E: oral V3 rows=${e1.oralV3Rows}!=${oralIds.length * 2}`);

    // E2 미착수 route(ophthalmic 253 / oromucosal 14) write 0
    notes.E_untouched = {};
    for (const u of UNTOUCHED_UNITS) {
      const uIds: string[] = unitsById[u].masterIds;
      const r = (await ds.query(`SELECT
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)) "easyCanonical",
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status IN ('canonical','needs_review') AND s.description_type='STORE' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)) "authoredRows",
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL)) "easyDeprecated",
        (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND (metadata->>'productionWo')=$2) "thisWoAudit",
        (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_ref_id=ANY($3::uuid[]) AND deleted_at IS NULL) "topicalRefRows"
        `, [uIds, WO, refs]))[0];
      notes.E_untouched[u] = { masters: uIds.length, ...r };
      if (r.easyCanonical !== uIds.length) fails.push(`E: ${u} easyCanonical=${r.easyCanonical}!=${uIds.length}`);
      if (r.authoredRows !== 0) fails.push(`E: ${u} authoredRows=${r.authoredRows} (write 발생)`);
      if (r.easyDeprecated !== 0) fails.push(`E: ${u} easyDeprecated=${r.easyDeprecated} (write 발생)`);
      if (r.thisWoAudit !== 0) fails.push(`E: ${u} thisWoAudit=${r.thisWoAudit}`);
      if (r.topicalRefRows !== 0) fails.push(`E: ${u} topicalRefRows=${r.topicalRefRows}`);
    }

    // E3 V1/V2 LIVE 불간섭 + 실측 write 총량
    //   이번 WO 의 audit 은 topical 327 master 밖에 단 1건도 없어야 한다(= 기존 V1/V2 LIVE 무변경의 직접 증거).
    //   write 총량은 계약 환산: KO 4T(insert+demote+flip+audit) + EN 2T(insert+flip).
    const e3 = (await ds.query(`SELECT
      (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE (metadata->>'productionWo')=$1) "thisWoAuditRows",
      (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE (metadata->>'productionWo')=$1 AND NOT master_id=ANY($2::uuid[])) "thisWoAuditOutside",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($2::uuid[]) AND source_type='mfds_drug_otc' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL) "authoredCanonicalRows",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($2::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE' AND status='deprecated' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL) "easyDeprecatedRows"
      `, [WO, ids]))[0];
    const measuredWrite = e3.thisWoAuditRows /* audit */ + e3.easyDeprecatedRows /* demote */
      + e3.authoredCanonicalRows /* insert */ + e3.authoredCanonicalRows /* flip */;
    notes.E_writeTotal = { ...e3, koContract: T * 4, enContract: T * 2, expectedTotal: T * 6, measuredWrite };
    if (e3.thisWoAuditOutside !== 0) fails.push(`E: 이번 WO audit 이 대상 밖 master 를 변경=${e3.thisWoAuditOutside} (V1/V2 간섭)`);
    if (e3.authoredCanonicalRows !== T * 2) fails.push(`E: authoredCanonicalRows=${e3.authoredCanonicalRows}!=${T * 2}`);
    if (e3.easyDeprecatedRows !== T) fails.push(`E: easyDeprecatedRows=${e3.easyDeprecatedRows}!=${T}`);
    if (measuredWrite !== T * 6) fails.push(`E: measuredWrite=${measuredWrite}!=${T * 6}`);
  } finally { await ds.destroy(); }

  const out = { ...notes, pass: fails.length === 0, failCount: fails.length, fails };
  console.log(JSON.stringify(out, null, 2));
  console.log(`\n=== TOPICAL-UNIT-1 TRACK VERIFY · PASS=${out.pass} · fails=${out.failCount} ===`);
  if (!out.pass) process.exit(2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
