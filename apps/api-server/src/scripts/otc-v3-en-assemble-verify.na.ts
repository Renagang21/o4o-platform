/**
 * WO-...-V3-FINAL-READINESS-V1 — 나 EN 조립 + 강검증 (파일 IO only, DB 없음)
 *
 * 입력: scaffold-{unit}.json + out-{unit}-b*.json(서브에이전트 번역).
 * 조립: EnV3Payload = {title(scaffold), 6섹션(번역), summaryTable(scaffold 결정적)}.
 * 검증(renderEnV3): 필수필드/한글잔존/route 동사/수치 보존 + 섹션 presence 패리티(KO presence=1 ↔ EN 비어있지 않음).
 * 커버리지: 57fp 전량 번역·중복·누락 0.
 * 산출: en-build-{unit}.json(fp→enHtml/sourceRef/masterIds) + en-check-v1.json. DB write 0.
 *
 * Usage: ../../node_modules/.bin/tsx src/scripts/otc-v3-en-assemble-verify.na.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderEnV3, CONTENT_SECTIONS, md5, normalize } from './otc-v3-content-leaflet-composer.na.js';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_DIR = path.join(DATA_DIR, 'otc-ready-na-v3');
const EN_DIR = path.join(OUT_DIR, 'en');
const UNITS = ['topical-unit-1', 'oromucosal-unit-1'] as const;
const HANGUL_RE = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

const SEC_FIELD: Record<string, string> = {
  '효능·효과': 'efficacy', '용법·용량': 'usage', '경고': 'warning',
  '사용상 주의사항': 'precaution', '이상반응': 'adverse', '상호작용': 'interaction',
};

function main(): void {
  const idx = JSON.parse(fs.readFileSync(path.join(EN_DIR, 'task-index.json'), 'utf8'));
  const anomalies: string[] = [];
  const unitReports: any[] = [];

  for (const unit of UNITS) {
    const scaf = JSON.parse(fs.readFileSync(path.join(EN_DIR, `scaffold-${unit}.json`), 'utf8'));
    const scafByFp: Record<string, any> = Object.fromEntries(scaf.items.map((s: any) => [s.fp, s]));
    const build = JSON.parse(fs.readFileSync(path.join(OUT_DIR, `build-${unit}.json`), 'utf8'));
    const buildByFp: Record<string, any> = Object.fromEntries(build.fingerprints.map((f: any) => [f.fp, f]));

    // gather translation outputs for this unit
    const batches = idx.batches.filter((b: any) => b.unit === unit);
    const transByFp: Record<string, any> = {};
    for (const b of batches) {
      const outPath = path.resolve(process.cwd(), b.outFile);
      if (!fs.existsSync(outPath)) { anomalies.push(`[${unit}] 번역 출력 누락: ${b.outFile}`); continue; }
      const out = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      for (const it of out.items || []) {
        if (transByFp[it.fp]) anomalies.push(`[${unit}] 중복 fp 번역 ${it.fp}`);
        transByFp[it.fp] = it;
      }
    }

    const enFps: any[] = [];
    let translated = 0, koreanResidueFps = 0, routeVerbFps = 0, numericLossFps = 0, presenceParityFps = 0, missingFieldFps = 0;
    for (const s of scaf.items) {
      const fp = s.fp;
      const t = transByFp[fp];
      if (!t) { anomalies.push(`[${unit}] fp ${fp} 번역 없음`); continue; }
      translated++;
      const payload = {
        groupKey: fp, title: s.enTitle,
        efficacy: t.efficacy || '', usage: t.usage || '', warning: t.warning || '',
        precaution: t.precaution || '', adverse: t.adverse || '', interaction: t.interaction || '',
        summaryTable: { Category: s.category, 'How it works': (t.howItWorks || '').trim(), 'Why this one': s.whyThisOne },
      };
      const rendered = renderEnV3(payload, s.route, s.officialDosage);
      const fpAnoms: string[] = [...rendered.anomalies];

      // presence parity: KO presence=1 → EN section non-empty; presence=0 → EN empty
      for (const k of CONTENT_SECTIONS) {
        const field = SEC_FIELD[k];
        const enVal = normalize((payload as any)[field] || '');
        const need = s.presence[k] === 1;
        if (need && !enVal) { fpAnoms.push(`섹션 누락(EN 비어있음): ${k}`); }
        if (!need && enVal) { fpAnoms.push(`섹션 초과(원문 부재인데 EN 존재): ${k}`); }
      }
      // classify
      if (rendered.anomalies.some((a) => a.includes('한글'))) koreanResidueFps++;
      if (rendered.anomalies.some((a) => a.includes('경구 동사'))) routeVerbFps++;
      if (rendered.anomalies.some((a) => a.includes('수량 누락'))) numericLossFps++;
      if (rendered.anomalies.some((a) => a.includes('필수필드'))) missingFieldFps++;
      if (fpAnoms.some((a) => a.includes('섹션 누락') || a.includes('섹션 초과'))) presenceParityFps++;
      // final Korean scan on full HTML (belt-and-suspenders)
      if (rendered.html && HANGUL_RE.test(rendered.html) && !rendered.anomalies.some((a) => a.includes('한글'))) fpAnoms.push('EN HTML 한글 잔존');

      if (fpAnoms.length) anomalies.push(`[${unit}] fp ${fp}: ${fpAnoms.slice(0, 4).join(' | ')}`);
      const bf = buildByFp[fp];
      enFps.push({ fp, route: s.route, gencode: s.gencode, sourceRef: bf?.sourceRef, size: bf?.size,
        masterIds: bf?.masterIds || [], enHtml: rendered.html, anomalies: fpAnoms });
    }

    // coverage: scaffold fps == translated, no extra
    const scafFps = new Set(scaf.items.map((s: any) => s.fp));
    const extra = Object.keys(transByFp).filter((f) => !scafFps.has(f));
    if (extra.length) anomalies.push(`[${unit}] 스캐폴드 밖 번역 fp ${extra.length}: ${extra.slice(0, 3).join(',')}`);
    if (translated !== scaf.count) anomalies.push(`[${unit}] 번역 ${translated} != scaffold ${scaf.count}`);

    const enBuildFile = path.join(OUT_DIR, `en-build-${unit}.json`);
    fs.writeFileSync(enBuildFile, JSON.stringify({ wo: build.wo, agent: 'na', unit, route: build.route, lang: 'en',
      fpCount: enFps.length, fingerprints: enFps }, null, 2) + '\n');

    unitReports.push({ unit, route: build.route, scaffold: scaf.count, translated,
      koreanResidueFps, routeVerbFps, numericLossFps, missingFieldFps, presenceParityFps,
      enBuildFile: path.relative(process.cwd(), enBuildFile).replace(/\\/g, '/'),
      enBuildMd5: md5(fs.readFileSync(enBuildFile, 'utf8')) });
  }

  const pass = anomalies.length === 0;
  const check = { wo: 'WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-OROMUCOSAL-CONTENT-FP-V3-FINAL-READINESS-V1',
    agent: 'na', mode: 'EN assemble + verify', dbWrite: 0, units: unitReports, anomalies, pass };
  fs.writeFileSync(path.join(OUT_DIR, 'en-check-v1.json'), JSON.stringify(check, null, 2) + '\n');

  console.log('=== V3 EN assemble + verify (dbWrite 0) ===');
  for (const r of unitReports) {
    console.log(`[${r.unit}] scaffold ${r.scaffold} · translated ${r.translated} · koreanResidue ${r.koreanResidueFps} · routeVerb ${r.routeVerbFps} · numericLoss ${r.numericLossFps} · missingField ${r.missingFieldFps} · presenceParity ${r.presenceParityFps}`);
    console.log(`   en-build ${r.enBuildFile} md5 ${r.enBuildMd5}`);
  }
  console.log(anomalies.length ? `ANOMALIES(${anomalies.length}):\n - ${anomalies.slice(0, 30).join('\n - ')}` : 'ANOMALIES: none');
  console.log(`PASS=${pass}`);
  if (!pass) process.exit(2);
}
main();
