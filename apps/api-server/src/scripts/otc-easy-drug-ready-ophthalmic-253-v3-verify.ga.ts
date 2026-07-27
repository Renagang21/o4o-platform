/**
 * WO-...-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1 — 독립 검증자 (에이전트 가)
 *
 * **실행기(executor)와 분리된 독립 스크립트.** executor.buildPlan 을 import 하지 않고, 계약·합성기·config·
 * 매니페스트를 직접 다시 유도해 executor 의 산출물을 대조한다(재유도 = drift 검출). read-only DB.
 *
 * 검증 항목:
 *   V1  unit ledger 253/26 재현 (fp 수·master 수·중복 0)
 *   V2  각 fp sourceRef = contentFpToUuid(fp) = manifest.sourceRef, 그리고 V2 namespace 와 전량 상이
 *   V3  composeKoV3/renderEnV3 재실행 html 해시 == manifest 해시 (26 fp KO+EN)
 *   V4  anomalies 0 (KO+EN 26 fp), safety 키 present 안전섹션 1:1
 *   V5  manifest writePlan == 253×6 (KO 1012 + EN 506 = 1518)
 *   V6  DB read-only: easy ko canonical == 253 · authored V3 ko/en canonical == 0 · V3 sourceRef 행 0 · WO audit 0
 *       → LIVE write 미발생 실증(PRE_APPLY 상태)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  loadOphthalmicUnit, contentFpToUuid, sixSectionsRaw, connect, DATA_DIR, H,
} from './otc-easy-drug-ready-ophthalmic-253-v3-contract.ga.js';
import { fpToUuidV2 } from './otc-v2-store-leaflet-runner.shared.js';
import { composeKoV3, renderEnV3 } from './otc-easy-drug-ready-ophthalmic-253-v3-composer.ga.js';
import { EN_CONFIG } from './otc-easy-drug-ready-ophthalmic-253-v3-en-config.ga.js';

const FORM = '점안액';
const WO = 'WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1';
const AUTHORED_SOURCE_V3 = 'mfds_drug_otc';
const MANIFEST = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-dryrun-manifest.ga.json');
const OFFICIAL_SRC = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-official-source-v1.json');
const SAFETY = ['경고', '사용상 주의사항', '이상반응', '상호작용'];

type ManFp = { fp: string; gencode: string; sourceRef: string; size: number; koHtmlHash: string; enHtmlHash: string; masterIds: string[] };

(async () => {
  const fails: string[] = [];
  const check = (ok: boolean, msg: string) => { if (!ok) fails.push(msg); };

  const unit = loadOphthalmicUnit();
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as {
    processed: { fingerprints: number; masters: number };
    writePlan: { ko_4T: number; en_2T: number; total: number };
    fingerprints: ManFp[];
  };
  const official = JSON.parse(fs.readFileSync(OFFICIAL_SRC, 'utf8')) as { fingerprints: { fp: string; officialSectionsRaw: Record<string, string> }[] };
  const offByFp = new Map(official.fingerprints.map((f) => [f.fp, f.officialSectionsRaw]));
  const manByFp = new Map(manifest.fingerprints.map((f) => [f.fp, f]));

  // V1 — 재현
  check(unit.fpCount === 26 && unit.masterCount === 253, `V1 unit 253/26 아님 ${unit.masterCount}/${unit.fpCount}`);
  check(manifest.processed.fingerprints === 26 && manifest.processed.masters === 253, 'V1 manifest processed 253/26 아님');
  check(unit.allMasterIds.length === 253, `V1 master unique ${unit.allMasterIds.length}`);
  check(manifest.fingerprints.length === 26, `V1 manifest fp ${manifest.fingerprints.length}`);

  // V2~V4 — fp 별 독립 재유도
  let koHashOk = 0, enHashOk = 0;
  for (const f of unit.fingerprints) {
    const six = offByFp.get(f.fp);
    const man = manByFp.get(f.fp);
    if (!six) { fails.push(`V3 fp ${f.fp} 공식 원문 없음`); continue; }
    if (!man) { fails.push(`V2 fp ${f.fp} manifest 없음`); continue; }

    // V2 sourceRef
    const ref = contentFpToUuid(f.fp);
    check(ref === f.sourceRef, `V2 fp ${f.fp} ledger sourceRef 불일치`);
    check(ref === man.sourceRef, `V2 fp ${f.fp} manifest sourceRef 불일치`);
    check(ref !== fpToUuidV2(f.fp), `V2 fp ${f.fp} V3==V2 namespace 충돌`);

    // V3 html 해시 독립 재계산
    const ko = composeKoV3(six, FORM, f.gencode);
    const cfg = EN_CONFIG[f.fp];
    check(!!cfg, `V4 fp ${f.fp} EN config 없음`);
    const en = cfg ? renderEnV3(cfg, six) : { html: '', anomalies: ['config 없음'] };
    check(ko.anomalies.length === 0, `V4 KO ${f.fp}: ${ko.anomalies.join('|')}`);
    check(en.anomalies.length === 0, `V4 EN ${f.fp}: ${en.anomalies.join('|')}`);
    if (H(ko.html) === man.koHtmlHash) koHashOk++; else fails.push(`V3 KO ${f.fp} html 해시 drift`);
    if (H(en.html) === man.enHtmlHash) enHashOk++; else fails.push(`V3 EN ${f.fp} html 해시 drift`);

    // V4 safety 1:1
    if (cfg) {
      const want = SAFETY.filter((s) => (six[s] || '').trim()).sort();
      const got = Object.keys(cfg.safety).sort();
      check(JSON.stringify(got) === JSON.stringify(want), `V4 fp ${f.fp} safety 1:1 위반`);
    }
  }
  check(koHashOk === 26, `V3 KO 해시 일치 ${koHashOk}/26`);
  check(enHashOk === 26, `V3 EN 해시 일치 ${enHashOk}/26`);

  // V5 — write plan
  check(manifest.writePlan.ko_4T === 253 * 4, `V5 ko_4T ${manifest.writePlan.ko_4T}`);
  check(manifest.writePlan.en_2T === 253 * 2, `V5 en_2T ${manifest.writePlan.en_2T}`);
  check(manifest.writePlan.total === 253 * 6, `V5 total ${manifest.writePlan.total}`);

  // V6 — DB read-only: PRE_APPLY 상태(LIVE write 미발생) 실증
  const db = await connect();
  let dbReport: Record<string, number> = {};
  try {
    const ids = unit.allMasterIds;
    const refs = unit.fingerprints.map((f) => contentFpToUuid(f.fp));
    const r = (await db.query(`
      SELECT
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
           AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::int easy_ko,
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
           AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type=$3 AND deleted_at IS NULL)::int v3_ko,
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
           AND status='canonical' AND language='en' AND deleted_at IS NULL)::int en_canon,
        (SELECT count(*) FROM shared_product_descriptions WHERE source_ref_id=ANY($2::uuid[]) AND deleted_at IS NULL)::int v3_ref_rows,
        (SELECT count(*) FROM shared_product_description_audit_logs WHERE metadata->>'wo'=$4)::int wo_audit
    `, [ids, refs, AUTHORED_SOURCE_V3, WO])) as any[];
    const row = r[0];
    dbReport = row;
    check(row.easy_ko === 253, `V6 easy ko canonical ${row.easy_ko} != 253`);
    check(row.v3_ko === 0, `V6 V3 authored ko canonical ${row.v3_ko} != 0 (LIVE write 감지)`);
    check(row.en_canon === 0, `V6 en canonical ${row.en_canon} != 0 (LIVE write 감지)`);
    check(row.v3_ref_rows === 0, `V6 V3 sourceRef 행 ${row.v3_ref_rows} != 0 (LIVE write 감지)`);
    check(row.wo_audit === 0, `V6 WO audit ${row.wo_audit} != 0 (LIVE write 감지)`);
  } finally {
    await db.destroy();
  }

  const report = {
    wo: WO, verifier: 'independent (executor 미import)', liveDbWrite: false,
    v1_reproduce: unit.fpCount === 26 && unit.masterCount === 253,
    v2_sourceRef: true, v3_htmlHash: { ko: koHashOk, en: enHashOk },
    v5_writePlan: manifest.writePlan, v6_db: dbReport,
    pass: fails.length === 0, failures: fails,
  };
  fs.writeFileSync(
    path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-verify.ga.json'),
    JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (fails.length) { console.log(`\n=== VERIFY FAIL (${fails.length}) ===`); process.exit(1); }
  console.log('\n=== INDEPENDENT VERIFY GREEN — 253/26 재현 · 해시 일치 · write 0 · PRE_APPLY 상태 ===');
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
