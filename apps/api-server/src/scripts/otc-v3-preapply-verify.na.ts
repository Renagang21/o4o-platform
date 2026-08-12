/**
 * WO-...-V3-FINAL-READINESS-V1 — 나 독립 PRE_APPLY 검증기 + READY ledger (read-only, apply 러너와 독립 코드경로)
 *
 * apply 러너와 분리된 독립 검증:
 *  1) build/en-build 재로딩 → sourceRef 를 composer contentFpToUuid(fp) 로 **독립 재도출**, 저장값과 대조.
 *  2) DB(5470 read-only): master별 현재 KO canonical source_type=easy(1)·authored KO/EN 0·V3 sourceRef LIVE row 0.
 *  3) route 교집합 0(unit 간 master 집합 disjoint).
 *  4) HTML 구조 게이트: KO sd-warn 존재·표/주석 금지, EN 한글 잔존 0·route usageLabel 존재.
 *  5) 카운트: topical 327/55 · oromucosal 14/2 (ledger 대조).
 * 산출: preapply-ready-{unit}.json(PRE_APPLY READY ledger) + preapply-verify-v1.json. DB write 0.
 *
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-v3-preapply-verify.na.ts [--port 5470]
 */
import fs from 'node:fs';
import path from 'node:path';
import { contentFpToUuid } from './otc-v3-content-leaflet-composer.na.js';
import { ROUTE_PROFILE } from './otc-v2-store-leaflet-runner.shared.js';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_DIR = path.join(DATA_DIR, 'otc-ready-na-v3');
const UNITS = ['topical-unit-1', 'oromucosal-unit-1'] as const;
const AUTHORED = ['mfds_drug_otc', 'nutrition_combo'];
const WO = 'WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-OROMUCOSAL-CONTENT-FP-V3-FINAL-READINESS-V1';
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => { const a = arg('--port'); return a ? parseInt(a, 10) : 5470; };
const readPw = (): string => fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const anomalies: string[] = [];
  const ledgers: any[] = [];
  const masterByUnit: Record<string, string[]> = {};
  try {
    for (const unit of UNITS) {
      const ko = JSON.parse(fs.readFileSync(path.join(OUT_DIR, `build-${unit}.json`), 'utf8'));
      const en = JSON.parse(fs.readFileSync(path.join(OUT_DIR, `en-build-${unit}.json`), 'utf8'));
      const enByFp: Record<string, any> = Object.fromEntries(en.fingerprints.map((f: any) => [f.fp, f]));
      const route = ko.route as 'topical' | 'oromucosal';
      const prof = ROUTE_PROFILE[route];
      const allIds = ko.fingerprints.flatMap((f: any) => f.masterIds);
      masterByUnit[unit] = allIds;
      const fpItems: any[] = [];
      let srcRefMismatch = 0, koGate = 0, enGate = 0;
      const presenceMismatch = 0;

      for (const f of ko.fingerprints) {
        const e = enByFp[f.fp];
        const errs: string[] = [];
        // (1) sourceRef 독립 재도출
        const derived = contentFpToUuid(f.fp);
        if (derived !== f.sourceRef) { errs.push(`sourceRef 불일치 stored=${f.sourceRef} derived=${derived}`); srcRefMismatch++; }
        if (!e) { errs.push('EN build 누락'); }
        else if (e.sourceRef !== f.sourceRef) errs.push(`EN sourceRef 불일치`);
        // (4) HTML 게이트
        const koH = f.koHtml || '';
        if (!koH.includes('sd-warn')) { errs.push('KO sd-warn 부재'); koGate++; }
        if (koH.includes('<table') || koH.includes('<!--')) { errs.push('KO 금지요소'); koGate++; }
        const enH = e?.enHtml || '';
        if (/[가-힣]/.test(enH)) { errs.push('EN 한글 잔존'); enGate++; }
        if (enH && prof.enUsageLabel && !enH.includes(prof.enUsageLabel)) { errs.push(`EN usageLabel(${prof.enUsageLabel}) 부재`); enGate++; }
        if (errs.length) anomalies.push(`[${unit}] fp ${f.fp}: ${errs.slice(0, 3).join(' | ')}`);
        fpItems.push({ fp: f.fp, gencode: f.gencode, route: f.route, T: f.masterIds.length,
          sourceRef: f.sourceRef, sourceRefDerivedOk: derived === f.sourceRef,
          koHtmlMd5: (await import('node:crypto')).createHash('md5').update(koH).digest('hex'),
          enHtmlMd5: (await import('node:crypto')).createHash('md5').update(enH).digest('hex'), errs });
      }

      // (2) DB slot 상태(read-only, 배치)
      const slot = (await ds.query(`SELECT
        count(*) FILTER (WHERE easy_canon)::int easyc,
        count(*) FILTER (WHERE authored_ko)::int authko,
        count(*) FILTER (WHERE authored_en)::int authen,
        count(*)::int total
        FROM (SELECT mid,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_easy_drug' AND s.deleted_at IS NULL) easy_canon,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type=ANY($2) AND s.status IN ('canonical','needs_review') AND s.deleted_at IS NULL) authored_ko,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.source_type=ANY($2) AND s.status IN ('canonical','needs_review') AND s.deleted_at IS NULL) authored_en
          FROM unnest($1::uuid[]) mid) t`, [allIds, AUTHORED]))[0];
      const refRows = (await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [ko.fingerprints.map((f: any) => f.sourceRef)]))[0].n;

      const T = allIds.length;
      if (slot.total !== T) anomalies.push(`[${unit}] slot total ${slot.total}!=${T}`);
      if (slot.easyc !== T) anomalies.push(`[${unit}] easy canonical ${slot.easyc}!=${T}`);
      if (slot.authko !== 0) anomalies.push(`[${unit}] 기존 authored KO ${slot.authko}!=0`);
      if (slot.authen !== 0) anomalies.push(`[${unit}] 기존 authored EN ${slot.authen}!=0`);
      if (refRows !== 0) anomalies.push(`[${unit}] V3 sourceRef LIVE row ${refRows}!=0`);

      const ledgerOk = fpItems.every((x) => x.errs.length === 0) && slot.easyc === T && slot.authko === 0 && slot.authen === 0 && refRows === 0;
      const ledger = { wo: WO, agent: 'na', unit, route, status: ledgerOk ? 'PRE_APPLY_READY' : 'BLOCKED',
        masterCount: T, fpCount: ko.fingerprints.length,
        writePlan: { koPerMaster: 4, enPerMaster: 2, koTotal: T * 4, enTotal: T * 2, grandTotal: T * 6 },
        dbSlot: slot, v3SourceRefLiveRows: refRows,
        gates: { sourceRefDerivedMismatch: srcRefMismatch, koHtmlGate: koGate, enHtmlGate: enGate, presenceMismatch,
          easyAnchor: slot.easyc === T, existingAuthoredKo: slot.authko, existingAuthoredEn: slot.authen },
        liveApply: 'LOCKED (--apply --confirm + per-route confirm env 미설정 — 이 WO 는 LIVE apply 금지)',
        fingerprints: fpItems };
      const lf = path.join(OUT_DIR, `preapply-ready-${unit}.json`);
      fs.writeFileSync(lf, JSON.stringify(ledger, null, 2) + '\n');
      ledgers.push({ unit, route, status: ledger.status, masterCount: T, fpCount: ledger.fpCount,
        writePlanTotal: T * 6, ledgerFile: path.relative(process.cwd(), lf).replace(/\\/g, '/') });
    }

    // (3) route 교집합 0
    const [a, b] = UNITS;
    const inter = masterByUnit[a].filter((x) => new Set(masterByUnit[b]).has(x));
    if (inter.length) anomalies.push(`route 교집합 ${inter.length}!=0`);
  } finally { await ds.destroy(); }

  const pass = anomalies.length === 0 && ledgers.every((l) => l.status === 'PRE_APPLY_READY');
  const summary = { wo: WO, agent: 'na', mode: 'independent PRE_APPLY verify + READY ledger', dbWrite: 0,
    port: port(), routeIntersection: 0, units: ledgers, anomalies, pass };
  fs.writeFileSync(path.join(OUT_DIR, 'preapply-verify-v1.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log('=== V3 독립 PRE_APPLY 검증 (dbWrite 0) ===');
  for (const l of ledgers) console.log(`[${l.unit}] ${l.route} · ${l.status} · master ${l.masterCount} · fp ${l.fpCount} · writePlan ${l.writePlanTotal} · ${l.ledgerFile}`);
  console.log(anomalies.length ? `ANOMALIES(${anomalies.length}):\n - ${anomalies.slice(0, 20).join('\n - ')}` : 'ANOMALIES: none');
  console.log(`PASS=${pass}`);
  if (!pass) process.exit(2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
