/**
 * WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1
 * ophthalmic-unit-1 LIVE apply **독립 검증** (read-only · write 0)
 *
 * 실행기(executor)를 import 하지 않는다. 계약/합성기/공식 원문/unit ledger 만으로 재유도한 결과를
 * **DB 저장 실물**과 대조한다(재유도 = drift 검출).
 *
 * 13축:
 *   A1 targetMasters 253 / A2 contentFp 26 / A3 koAuthoredCanonical 253 / A4 enCanonical 253
 *   A5 easyDeprecated 253 / A6 easyStillCanonical 0 / A7 auditKo 253 / A8 canonicalDup 0
 *   A9 sourceRefLeak 0 / A10 storedContentHashMismatch 0 / A11 officialSixSectionsMismatch 0
 *   A12 enHangul 0 / A13 nonOphthalmicWritten 0
 * 점안 축(공식 원문 대비 DB 저장본):
 *   B1 KO 수치 보존(점안 횟수·1회 점안 방울수·투여 간격·기간·연령) — 원문 수치 전량 잔존
 *   B2 KO 안전 4섹션 공식 헤딩 보존(계약축: 안전=헤딩, 효능·용법=수치)
 *   B3 EN drop count · B4 EN 한쪽/양쪽 눈 표현 · B5 EN 콘택트렌즈/용기끝 접촉/타 점안제 간격
 * scope post-check: oral 540 · topical 327 불변 / oromucosal 14 write 0 / 기존 V1·V2 LIVE 불변 / 실측 write 1518
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  loadOphthalmicUnit, contentFpToUuid, connect, DATA_DIR, H,
} from './otc-easy-drug-ready-ophthalmic-253-v3-contract.ga.js';
import { composeKoV3, renderEnV3 } from './otc-easy-drug-ready-ophthalmic-253-v3-composer.ga.js';
import { EN_CONFIG } from './otc-easy-drug-ready-ophthalmic-253-v3-en-config.ga.js';
import {
  missingDropCountsEn, missingEyeSideEn, missingEyeCautionEn,
} from './otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.js';

const FORM = '점안액';
const AUTHORED_V3 = 'mfds_drug_otc';
const EASY = 'mfds_easy_drug';
const PRODUCTION_WO = 'WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1';
const SAFETY = ['경고', '사용상 주의사항', '이상반응', '상호작용'];
const NUM_SECTIONS = ['효능·효과', '용법·용량'];
const OFFICIAL_SRC = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-official-source-v1.json');

const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
/** 원문 수치 토큰 — 숫자(소수 포함). 표현 재구성은 허용, 수치 소실은 금지. */
const nums = (s: string) => (s.match(/\d+(?:\.\d+)?/g) || []);

type Unit = { unit: string; route: string; masterCount: number; masterIds: string[]; sourceRefs: string[] };
const ledger = JSON.parse(fs.readFileSync(
  path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json'), 'utf8')) as { units: Unit[] };
const byUnit = (u: string) => ledger.units.find((x) => x.unit === u)!;

(async () => {
  const fails: string[] = [];
  const check = (ok: boolean, msg: string) => { if (!ok) fails.push(msg); };

  const unit = loadOphthalmicUnit();
  const official = JSON.parse(fs.readFileSync(OFFICIAL_SRC, 'utf8')) as
    { fingerprints: { fp: string; officialSectionsRaw: Record<string, string> }[] };
  const offByFp = new Map(official.fingerprints.map((f) => [f.fp, f.officialSectionsRaw]));
  const ids = unit.allMasterIds;
  const refs = unit.fingerprints.map((f) => contentFpToUuid(f.fp));

  const db = await connect();
  const axes: Record<string, number | boolean> = {};
  try {
    // ── A1~A9, A12 · DB 실측 ────────────────────────────────────────────────
    const r = (await db.query(`
      SELECT
        (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
           WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
             AND COALESCE(s.language,'ko')='ko' AND s.source_type=$2 AND s.deleted_at IS NULL))::int ko_authored,
        (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
           WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
             AND s.language='en' AND s.source_type=$2 AND s.deleted_at IS NULL))::int en_canonical,
        (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
           WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type=$3 AND s.description_type='STORE'
             AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL))::int easy_deprecated,
        (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
           WHERE s.master_id=mid AND s.status='canonical' AND s.source_type=$3 AND s.description_type='STORE'
             AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL))::int easy_still,
        (SELECT count(*) FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[])
           AND event_type='canonical_replaced' AND language='ko' AND metadata->>'productionWo'=$4)::int audit_ko,
        (SELECT count(*) FROM (SELECT master_id, COALESCE(language,'ko') lang FROM shared_product_descriptions
           WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
           GROUP BY 1,2 HAVING count(*)>1) d)::int canonical_dup,
        (SELECT count(*) FROM shared_product_descriptions WHERE source_ref_id=ANY($5::uuid[]) AND deleted_at IS NULL
           AND NOT master_id=ANY($1::uuid[]))::int ref_leak,
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND language='en'
           AND status='canonical' AND source_type=$2 AND deleted_at IS NULL AND content ~ '[가-힣]')::int en_hangul,
        (SELECT count(*) FROM shared_product_description_audit_logs WHERE metadata->>'productionWo'=$4
           AND NOT master_id=ANY($1::uuid[]))::int audit_outside,
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
           AND source_type=$2 AND description_type='STORE' AND deleted_at IS NULL)::int v3_rows
    `, [ids, AUTHORED_V3, EASY, PRODUCTION_WO, refs]))[0] as Record<string, number>;

    axes.A1_targetMasters = ids.length;
    axes.A2_contentFp = unit.fpCount;
    axes.A3_koAuthoredCanonical = r.ko_authored;
    axes.A4_enCanonical = r.en_canonical;
    axes.A5_easyDeprecated = r.easy_deprecated;
    axes.A6_easyStillCanonical = r.easy_still;
    axes.A7_auditKo = r.audit_ko;
    axes.A8_canonicalDup = r.canonical_dup;
    axes.A9_sourceRefLeak = r.ref_leak;
    axes.A12_enHangul = r.en_hangul;
    axes.A13_nonOphthalmicWritten = r.audit_outside + r.ref_leak;
    check(ids.length === 253, `A1 targetMasters ${ids.length}`);
    check(unit.fpCount === 26, `A2 contentFp ${unit.fpCount}`);
    check(r.ko_authored === 253, `A3 koAuthoredCanonical ${r.ko_authored}`);
    check(r.en_canonical === 253, `A4 enCanonical ${r.en_canonical}`);
    check(r.easy_deprecated === 253, `A5 easyDeprecated ${r.easy_deprecated}`);
    check(r.easy_still === 0, `A6 easyStillCanonical ${r.easy_still}`);
    check(r.audit_ko === 253, `A7 auditKo ${r.audit_ko}`);
    check(r.canonical_dup === 0, `A8 canonicalDup ${r.canonical_dup}`);
    check(r.ref_leak === 0, `A9 sourceRefLeak ${r.ref_leak}`);
    check(r.en_hangul === 0, `A12 enHangul ${r.en_hangul}`);
    check(r.audit_outside === 0, `A13 대상 밖 audit ${r.audit_outside}`);
    check(r.v3_rows === 506, `A13 V3 STORE 행 ${r.v3_rows}!=506`);

    // ── A10·A11·B1~B5 · fp 단위 재유도 대조 ────────────────────────────────
    let hashMismatch = 0, sixMismatch = 0, safetyHeadOk = 0, numOk = 0;
    let enDrop = 0, enEye = 0, enCaution = 0;
    const enAxisRequired: { fp: string; eyeSide: string[]; eyeCaution: string[] }[] = [];
    for (const f of unit.fingerprints) {
      const six = offByFp.get(f.fp);
      if (!six) { fails.push(`A11 fp ${f.fp} 공식 원문 없음`); sixMismatch++; continue; }
      const ref = contentFpToUuid(f.fp);
      const cfg = EN_CONFIG[f.fp];
      const ko = composeKoV3(six, FORM, f.gencode);
      const en = cfg ? renderEnV3(cfg, six) : { html: '', anomalies: ['config 없음'] };
      if (!cfg) fails.push(`A10 fp ${f.fp} EN config 없음`);

      const rows = (await db.query(
        `SELECT COALESCE(language,'ko') lang, content FROM shared_product_descriptions
         WHERE source_ref_id=$1::uuid AND source_type=$2 AND description_type='STORE'
           AND status='canonical' AND deleted_at IS NULL`, [ref, AUTHORED_V3])) as { lang: string; content: string }[];
      const koRows = rows.filter((x) => x.lang === 'ko');
      const enRows = rows.filter((x) => x.lang === 'en');
      if (koRows.length !== f.masterIds.length || enRows.length !== f.masterIds.length) {
        fails.push(`A10 fp ${f.fp} 저장행 ko=${koRows.length} en=${enRows.length} != ${f.masterIds.length}`);
      }
      // A10 저장 실물 해시 == 재유도 해시
      const koBad = koRows.filter((x) => H(x.content) !== H(ko.html)).length;
      const enBad = enRows.filter((x) => H(x.content) !== H(en.html)).length;
      hashMismatch += koBad + enBad;
      if (koBad || enBad) fails.push(`A10 fp ${f.fp} 저장본 해시 drift ko=${koBad} en=${enBad}`);

      const koTxt = text(koRows[0]?.content || '');
      const enTxt = text(enRows[0]?.content || '');

      // A11 공식 6섹션 보존 — 안전 4섹션 원문 문장 + 효능/용법 수치
      const missSafety = SAFETY.filter((s) => (six[s] || '').trim() && koTxt.indexOf(s) < 0);
      if (missSafety.length) { sixMismatch++; fails.push(`A11/B2 fp ${f.fp} 안전 헤딩 누락 ${missSafety.join(',')}`); }
      else safetyHeadOk++;
      // B1 효능·효과/용법·용량 수치 전량 보존
      const missNum: string[] = [];
      for (const sec of NUM_SECTIONS) for (const n of new Set(nums(six[sec] || ''))) if (koTxt.indexOf(n) < 0) missNum.push(`${sec}:${n}`);
      if (missNum.length) { sixMismatch++; fails.push(`B1 fp ${f.fp} 수치 소실 ${missNum.slice(0, 5).join(',')}`); }
      else numOk++;

      // B3~B5 EN 점안 축 — **DB 저장 실물** 기준. 판정축은 계약과 동일하게 "원문에 있는 축만 요구"
      // (원문에 없는 주의를 EN 에 창작해 넣는 것은 콘텐츠 정책상 금지이므로, 무조건 요구는 오판정이다).
      const usageRaw = six['용법·용량'] || '';
      const lostDrop = missingDropCountsEn(usageRaw, enTxt);
      if (lostDrop.length === 0) enDrop++; else fails.push(`B3 fp ${f.fp} EN 방울 수 누락 ${lostDrop.join(',')}`);
      const eyeSide = missingEyeSideEn(usageRaw, enTxt);
      if (eyeSide.missing.length === 0) enEye++; else fails.push(`B4 fp ${f.fp} EN 눈 적용부위 축 누락 ${eyeSide.missing.join(',')}`);
      const cautionRaw = SAFETY.map((s) => six[s]).filter(Boolean).join('\n');
      const eyeCaution = missingEyeCautionEn(cautionRaw, enTxt);
      if (eyeCaution.missing.length === 0) enCaution++;
      else fails.push(`B5 fp ${f.fp} EN 점안 주의 축 누락 ${eyeCaution.missing.join(',')} (요구 ${eyeCaution.required.join(',')})`);
      enAxisRequired.push({ fp: f.fp, eyeSide: eyeSide.required, eyeCaution: eyeCaution.required });
      if (en.anomalies.length) fails.push(`B fp ${f.fp} EN 계약 anomaly ${en.anomalies.join('|')}`);
      if (ko.anomalies.length) fails.push(`B fp ${f.fp} KO 계약 anomaly ${ko.anomalies.join('|')}`);
    }
    axes.A10_storedContentHashMismatch = hashMismatch;
    axes.A11_officialSixSectionsMismatch = sixMismatch;
    axes.B2_safetyHeadingFps = safetyHeadOk;
    axes.B1_numericPreservedFps = numOk;
    axes.B3_enDropFps = enDrop;
    axes.B4_enEyeSideFps = enEye;
    axes.B5_enEyeCautionFps = enCaution;
    axes.B5_enEyeCautionRequiredFps = enAxisRequired.filter((x) => x.eyeCaution.length > 0).length;
    axes.B4_enEyeSideRequiredFps = enAxisRequired.filter((x) => x.eyeSide.length > 0).length;

    // ── scope post-check ──────────────────────────────────────────────────
    const oral = [...byUnit('oral-unit-1').masterIds, ...byUnit('oral-unit-2').masterIds];
    const topical = byUnit('topical-unit-1').masterIds;
    const oromucosal = byUnit('oromucosal-unit-1').masterIds;
    const sc = (await db.query(`
      SELECT
        (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
           WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
             AND COALESCE(s.language,'ko')='ko' AND s.source_type=$4 AND s.deleted_at IS NULL))::int oral_ko,
        (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
           WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
             AND s.language='en' AND s.source_type=$4 AND s.deleted_at IS NULL))::int oral_en,
        (SELECT count(*) FROM unnest($2::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
           WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
             AND COALESCE(s.language,'ko')='ko' AND s.source_type=$4 AND s.deleted_at IS NULL))::int topical_ko,
        (SELECT count(*) FROM unnest($2::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
           WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
             AND s.language='en' AND s.source_type=$4 AND s.deleted_at IS NULL))::int topical_en,
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($3::uuid[])
           AND source_type=$4 AND description_type='STORE' AND deleted_at IS NULL)::int oromucosal_written,
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($3::uuid[])
           AND source_type=$5 AND description_type='STORE' AND status='canonical'
           AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL)::int oromucosal_easy
    `, [oral, topical, oromucosal, AUTHORED_V3, EASY]))[0] as Record<string, number>;
    axes.S_oralKo = sc.oral_ko; axes.S_oralEn = sc.oral_en;
    axes.S_topicalKo = sc.topical_ko; axes.S_topicalEn = sc.topical_en;
    axes.S_oromucosalWritten = sc.oromucosal_written; axes.S_oromucosalEasyCanonical = sc.oromucosal_easy;
    check(sc.oral_ko === 540 && sc.oral_en === 540, `scope oral 540 불변 아님 ko=${sc.oral_ko} en=${sc.oral_en}`);
    check(sc.topical_ko === 327 && sc.topical_en === 327, `scope topical 327 불변 아님 ko=${sc.topical_ko} en=${sc.topical_en}`);
    check(sc.oromucosal_written === 0, `scope oromucosal write ${sc.oromucosal_written}`);
    check(sc.oromucosal_easy === 14, `scope oromucosal easy canonical ${sc.oromucosal_easy}`);
    axes.measuredWrite = r.audit_ko * 4 + r.en_canonical * 2;
    check(axes.measuredWrite === 1518, `실측 write ${axes.measuredWrite}!=1518`);
  } finally {
    await db.destroy();
  }

  const report = { wo: PRODUCTION_WO, agent: 'ga', mode: 'independent-track-verify', liveDbWrite: false,
    pass: fails.length === 0, failCount: fails.length, fails: fails.slice(0, 40), axes };
  fs.writeFileSync(path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-track-verify.ga.json'),
    JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (fails.length) { console.error(`\n=== TRACK VERIFY FAIL (${fails.length}) ===`); process.exit(2); }
  console.log('\n=== TRACK VERIFY PASS — ophthalmic-unit-1 13축 + 점안축 + scope 전량 통과 ===');
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
