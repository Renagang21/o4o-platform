/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1 — agent-da 빌드 산출기
 *
 * unit ledger(SSOT) + KO source dump + 검증된 EN payload 를 조인해 apply 러너가 소비할 빌드 파일을 만든다.
 *   - build-oral-unit-{1,2}.json     : fp별 KO(koSource·koHtml) + masterIds(ledger) + sourceRef(V3 content-fp)
 *   - en-build-oral-unit-{1,2}.json   : fp별 EN(enHtml)
 *
 * 불변식(빌드 시 강제, 위반 시 throw = STOP):
 *   - sourceRef === contentFpToUuid(fp) === dump.sourceRef === ledger.sourceRef  (V3 네임스페이스)
 *   - fp별 masterIds 는 ledger 전용 소스. unit 간 masterId 교집합 0.
 *   - KO 는 official 6섹션에서 composeKoV3 로 재생성(저장본 신뢰 아님). koAnomalies 0.
 *   - EN 은 검증 통과한 payload 만 사용(en-payload 존재 = coverage+validation clean).
 *   - 제목 = `${form} (${gencode})` — 브랜드명 아님(content-fp representative, na 형제 WO 동일).
 *
 * DB 접근 없음(dbWrite:false). 순수 파일 조인.
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-build.da.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  composeKoV3, buildKoV3Html, renderEnV3, contentFpToUuid, type EnV3Payload,
} from './otc-easy-drug-ready-oral-v3-composer.da.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const DUMP = path.join(DATA, 'otc-easy-drug-ready-oral-v3-ko-source-dump.da.json');
const LEDGER = path.join(DATA, 'otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json');
const EN_PAYLOAD = path.join(DATA, 'otc-easy-drug-ready-oral-v3-en-payload.da.json');
const UNITS = ['oral-unit-1', 'oral-unit-2'] as const;
const ROUTE = 'oral';

interface DumpRec {
  fp: string; unit: string; sourceRef: string; gencode: string; route: string; form: string;
  official: Record<string, string>; sectionPresence: Record<string, boolean>; memberCount: number;
}

function main(): void {
  const dump = JSON.parse(fs.readFileSync(DUMP, 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const enPay = JSON.parse(fs.readFileSync(EN_PAYLOAD, 'utf8'));

  const dumpByFp = new Map<string, DumpRec>((dump.records as DumpRec[]).map((r) => [r.fp, r]));
  const ledgerByFp = new Map<string, any>((ledger.fingerprints as any[]).map((f) => [f.fp, f]));
  const enByFp = new Map<string, EnV3Payload>((enPay.payloads as any[]).map((p) => [p.fp, p.payload]));

  const summary: any[] = [];
  for (const unit of UNITS) {
    const u = (ledger.units as any[]).find((x) => x.unit === unit);
    if (!u) throw new Error(`ledger에 unit 없음: ${unit}`);
    const fps: string[] = u.fingerprints;

    const koFps: any[] = [];
    const enFps: any[] = [];
    const seenMasters = new Set<string>();

    for (const fp of fps) {
      const rec = dumpByFp.get(fp);
      const led = ledgerByFp.get(fp);
      const enPayload = enByFp.get(fp);
      if (!rec) throw new Error(`dump에 fp 없음: ${fp} (${unit})`);
      if (!led) throw new Error(`ledger fp-detail 없음: ${fp} (${unit})`);
      if (!enPayload) throw new Error(`EN payload 없음(검증 실패 fp): ${fp} (${unit})`);

      // sourceRef 3중 일치 강제(dump·ledger·V3 산식 재계산)
      const srDump = rec.sourceRef, srLed = led.sourceRef, srCalc = contentFpToUuid(fp);
      if (srDump !== srCalc || srLed !== srCalc) {
        throw new Error(`sourceRef 불일치 fp=${fp}: dump=${srDump} ledger=${srLed} calc=${srCalc}`);
      }

      // masterIds = ledger 전용. unit 내 중복/교집합 방지.
      const masterIds: string[] = led.masterIds || [];
      if (!masterIds.length) throw new Error(`masterIds 공란 fp=${fp}`);
      for (const m of masterIds) {
        if (seenMasters.has(m)) throw new Error(`unit 내 masterId 중복 fp=${fp} master=${m}`);
        seenMasters.add(m);
      }

      // KO — official 에서 재생성(저장본 신뢰 아님)
      const ko = composeKoV3(rec.official, ROUTE, rec.form, rec.gencode);
      if (ko.anomalies.length) throw new Error(`KO anomalies fp=${fp}: ${ko.anomalies.join('; ')}`);
      const title = `${rec.form} (${rec.gencode})`;
      const koBuilt = buildKoV3Html(ko.source, { title });
      if (koBuilt.missing.length) throw new Error(`KO 필수섹션 누락 fp=${fp}: ${koBuilt.missing.join(',')}`);

      // EN — 검증 통과 payload 재렌더(usageLabel 주입 + 게이트 재확인)
      const enR = renderEnV3(enPayload, ROUTE, rec.official['용법·용량'] || '');
      if (enR.anomalies.length) throw new Error(`EN anomalies fp=${fp}: ${enR.anomalies.join('; ')}`);

      koFps.push({
        fp, route: ROUTE, gencode: rec.gencode, form: rec.form, size: masterIds.length,
        sourceRef: srCalc, title, masterIds,
        sectionPresence: rec.sectionPresence, officialSections: rec.official,
        koSource: ko.source, koHtml: koBuilt.html, koAnomalies: ko.anomalies,
      });
      enFps.push({
        fp, route: ROUTE, gencode: rec.gencode, sourceRef: srCalc, size: masterIds.length,
        masterIds, enHtml: enR.html, anomalies: enR.anomalies,
      });
    }

    const masterCount = seenMasters.size;
    if (masterCount !== u.masterCount) throw new Error(`${unit} masterCount 불일치: build=${masterCount} ledger=${u.masterCount}`);

    const safetyCoverage = koFps.filter((k) => k.sectionPresence['경고'] || k.sectionPresence['사용상 주의사항'] || k.sectionPresence['이상반응'] || k.sectionPresence['상호작용']).length;

    const koFile = path.join(DATA, `otc-easy-drug-ready-oral-v3-build-${unit}.json`);
    const enFile = path.join(DATA, `otc-easy-drug-ready-oral-v3-en-build-${unit}.json`);
    fs.writeFileSync(koFile, JSON.stringify({
      wo: dump.wo, agent: 'da', unit, route: ROUTE, ledgerCommit: ledger.snapshot?.commit || null,
      dbWrite: false, generatedLang: 'ko', fpCount: koFps.length, masterCount,
      expectedWrite: { perMaster: 4, total: masterCount * 4 }, safetyCoverage,
      fingerprints: koFps,
    }, null, 2), 'utf8');
    fs.writeFileSync(enFile, JSON.stringify({
      wo: dump.wo, agent: 'da', unit, route: ROUTE, lang: 'en', fpCount: enFps.length,
      expectedWrite: { perMaster: 2, total: masterCount * 2 },
      fingerprints: enFps,
    }, null, 2), 'utf8');

    summary.push({ unit, fpCount: koFps.length, masterCount, koExpectedWrite: masterCount * 4, enExpectedWrite: masterCount * 2, safetyCoverage });
  }

  console.log('=== oral V3 build ===');
  console.log(JSON.stringify(summary, null, 2));
  const totM = summary.reduce((s, x) => s + x.masterCount, 0);
  const totFp = summary.reduce((s, x) => s + x.fpCount, 0);
  console.log(`TOTAL fp=${totFp} master=${totM} | KO write=${totM * 4}T EN write=${totM * 2}T total=${totM * 6}T`);
}

main();
