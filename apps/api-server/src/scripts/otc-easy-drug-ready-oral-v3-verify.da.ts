/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1 — 독립 검증자(da, 별도 경로)
 *
 * 목적: 빌드/러너 코드 경로를 재사용하지 않고 1차 소스(ledger·dump·en-payload)와 빌드 산출물을
 *       독립 재구현으로 교차검증한다. DB 는 read-only(SELECT) 만. 어떤 write 도 하지 않는다.
 *
 * 검증 항목:
 *   A. 재현: 540 master / 131 fp / 2 unit · unit 간 master 교집합 0 · fp 분할 0 · fp-detail 100% 해결
 *   B. sourceRef: 독립 재계산(md5('otc-v3-content-leaflet:'+fp))=dump=ledger=build 4중 일치
 *   C. DB 기준선(read-only, 540 master): easy canonical=540 · authored ko canonical/row=0 · en authored row=0
 *      · V3 sourceRef row=0 · WO audit row=0  → 아직 미적용(net write 0) & 선택 전제 성립
 *   D. KO 보존: official 용법+효능 수치 전량 koHtml 잔존 · 안전4섹션 존재시 sd-warn 블록 존재
 *   E. EN 보존: official 수치 전량 enHtml(숫자 또는 영어수사) 잔존 · 한글 0 · sd-warn 존재
 *   F. write 계약: unit별 KO=4T·EN=2T (T=master수)
 *
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-verify.da.ts [--port 5442]
 */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => { const a = arg('--port'); return a ? parseInt(a, 10) : 5442; };
const rd = (f: string): any => JSON.parse(readFileSync(path.join(DATA, f), 'utf8'));
const UNITS = ['oral-unit-1', 'oral-unit-2'];
const AUTHORED = ['mfds_drug_otc', 'nutrition_combo'];

// ── 독립 재구현 ──
const md5hex = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
function fpToUuidIndependent(fp: string): string {
  const h = md5hex('otc-v3-content-leaflet:' + fp);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
/** 공식 원문에서 수치+단위 토큰 독립 추출(범위 A~B → A,B 둘 다). */
function numericsOf(text: string): string[] {
  if (!text) return [];
  const t = text.replace(/(\d)\s*[-–—~]\s*(\d)/g, '$1 ~ $2');
  const UNIT = '(?:세|개월|주|일|회|정|캡슐|포|매|방울|밀리그램|밀리리터|그램|시간|년|mg|ml|g|%|iu|IU|EP)';
  const out = new Set<string>();
  const range = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*~\\s*(\\d+(?:\\.\\d+)?)\\s*${UNIT}`, 'gi');
  let m: RegExpExecArray | null;
  const spans: Array<[number, number]> = [];
  while ((m = range.exec(t))) { out.add(m[1]); out.add(m[2]); spans.push([m.index, m.index + m[0].length]); }
  const single = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${UNIT}`, 'gi');
  while ((m = single.exec(t))) { if (!spans.some(([s, e]) => m!.index >= s && m!.index < e)) out.add(m[1]); }
  return [...out];
}
const EN_WORD: Record<string, string[]> = { '1': ['one', 'once', 'a day', 'a time', 'daily', 'each day'], '2': ['two', 'twice'], '3': ['three'], '4': ['four'], '5': ['five'], '6': ['six'], '7': ['seven'], '8': ['eight'], '9': ['nine'], '10': ['ten'], '11': ['eleven'], '12': ['twelve'] };
/** 텍스트의 최대 숫자 토큰 집합(\d+(.\d+)?). 문장경계 마침표가 숫자에 붙어도(예: "복용합니다.11") 정확히 분리. */
function numTokens(text: string): Set<string> {
  return new Set((text.match(/\d+(?:\.\d+)?/g) || []));
}
function enHasNum(v: string, enTokens: Set<string>, en: string): boolean {
  if (enTokens.has(v)) return true;
  const lower = ' ' + en.toLowerCase().replace(/\s+/g, ' ') + ' ';
  return (EN_WORD[v] || []).some((w) => lower.includes(w));
}
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const SAFETY = ['경고', '사용상 주의사항', '이상반응', '상호작용'];

async function main(): Promise<void> {
  const ledger = rd('otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json');
  const dump = rd('otc-easy-drug-ready-oral-v3-ko-source-dump.da.json');
  const enPay = rd('otc-easy-drug-ready-oral-v3-en-payload.da.json');
  const dumpByFp = new Map<string, any>(dump.records.map((r: any) => [r.fp, r]));
  const enByFp = new Map<string, any>(enPay.payloads.map((p: any) => [p.fp, p]));
  const ledFpDetail = new Map<string, any>(ledger.fingerprints.map((f: any) => [f.fp, f]));
  const fails: string[] = [];
  const notes: any = {};

  // A. 재현
  const unitData: Record<string, { fps: string[]; masters: string[] }> = {};
  for (const un of UNITS) {
    const u = ledger.units.find((x: any) => x.unit === un);
    const fps: string[] = u.fingerprints;
    const masters: string[] = [];
    for (const fp of fps) {
      const d = ledFpDetail.get(fp);
      if (!d) { fails.push(`A: fp-detail 없음 ${fp}`); continue; }
      masters.push(...d.masterIds);
    }
    unitData[un] = { fps, masters };
    if (new Set(masters).size !== masters.length) fails.push(`A: ${un} unit 내 master 중복`);
    if (masters.length !== u.masterCount) fails.push(`A: ${un} masterCount ${masters.length}!=${u.masterCount}`);
  }
  const m1 = new Set(unitData['oral-unit-1'].masters);
  const inter = unitData['oral-unit-2'].masters.filter((m) => m1.has(m));
  if (inter.length) fails.push(`A: unit master 교집합 ${inter.length}`);
  const fpSplit = unitData['oral-unit-1'].fps.filter((fp) => unitData['oral-unit-2'].fps.includes(fp));
  if (fpSplit.length) fails.push(`A: fp 분할 ${fpSplit.length}`);
  const totFp = UNITS.reduce((s, un) => s + unitData[un].fps.length, 0);
  const totM = UNITS.reduce((s, un) => s + unitData[un].masters.length, 0);
  if (totFp !== 131) fails.push(`A: 총 fp ${totFp}!=131`);
  if (totM !== 540) fails.push(`A: 총 master ${totM}!=540`);
  notes.reproduce = { units: UNITS.map((un) => ({ un, fp: unitData[un].fps.length, master: unitData[un].masters.length })), totFp, totM, masterIntersection: inter.length, fpSplit: fpSplit.length };

  // B. sourceRef 4중 일치 (build 파일 포함)
  let srOk = 0;
  const allMasters: string[] = [];
  const allSourceRefs: string[] = [];
  for (const un of UNITS) {
    const build = rd(`otc-easy-drug-ready-oral-v3-build-${un}.json`);
    const enBuild = rd(`otc-easy-drug-ready-oral-v3-en-build-${un}.json`);
    const enBuildByFp = new Map<string, any>(enBuild.fingerprints.map((f: any) => [f.fp, f]));
    for (const bf of build.fingerprints) {
      const fp = bf.fp;
      const calc = fpToUuidIndependent(fp);
      const d = dumpByFp.get(fp), led = ledFpDetail.get(fp), eb = enBuildByFp.get(fp);
      if (!(bf.sourceRef === calc && d?.sourceRef === calc && led?.sourceRef === calc && eb?.sourceRef === calc)) {
        fails.push(`B: sourceRef 불일치 ${fp} build=${bf.sourceRef} dump=${d?.sourceRef} ledger=${led?.sourceRef} en=${eb?.sourceRef} calc=${calc}`);
      } else srOk++;
      allMasters.push(...bf.masterIds);
      allSourceRefs.push(calc);

      // D. KO 보존
      const off = d.official;
      const koNums = [...numericsOf(off['용법·용량'] || ''), ...numericsOf(off['효능·효과'] || '')];
      const koTokens = numTokens(bf.koHtml);
      const koMiss = koNums.filter((n) => !koTokens.has(n));
      if (koMiss.length) fails.push(`D: KO 수치누락 ${fp}: ${[...new Set(koMiss)].slice(0, 6).join(',')}`);
      const koSafety = SAFETY.some((s) => (off[s] || '').trim());
      if (koSafety && !bf.koHtml.includes('sd-warn')) fails.push(`D: KO 안전섹션 있으나 sd-warn 부재 ${fp}`);

      // E. EN 보존
      const enHtml = eb.enHtml;
      if (HANGUL.test(enHtml)) fails.push(`E: EN 한글 잔존 ${fp}`);
      const enTokens = numTokens(enHtml);
      const enUsageNums = numericsOf(off['용법·용량'] || '');
      const enMiss = enUsageNums.filter((n) => !enHasNum(n, enTokens, enHtml));
      if (enMiss.length) fails.push(`E: EN 용법수치누락 ${fp}: ${[...new Set(enMiss)].slice(0, 6).join(',')}`);
      if (koSafety && !enHtml.includes('sd-warn')) fails.push(`E: EN 안전섹션 있으나 sd-warn 부재 ${fp}`);
    }
    // F. write 계약
    const T = build.fingerprints.reduce((s: number, f: any) => s + f.masterIds.length, 0);
    if (build.expectedWrite.total !== 4 * T) fails.push(`F: ${un} KO write ${build.expectedWrite.total}!=${4 * T}`);
    if (enBuild.expectedWrite.total !== 2 * T) fails.push(`F: ${un} EN write ${enBuild.expectedWrite.total}!=${2 * T}`);
  }
  notes.sourceRef = { checked: srOk, expected: 131 };

  // C. DB 기준선 read-only
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  try {
    const uniqMasters = [...new Set(allMasters)];
    const uniqRefs = [...new Set(allSourceRefs)];
    const baseline = (await ds.query(`SELECT
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.deleted_at IS NULL)) easy_canon,
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type=ANY($2) AND deleted_at IS NULL) authored_ko_canon,
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status IN ('canonical','needs_review') AND source_type=ANY($2) AND deleted_at IS NULL) authored_ko_row,
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status IN ('canonical','needs_review') AND source_type=ANY($2) AND deleted_at IS NULL) en_authored_row,
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_ref_id=ANY($3::uuid[]) AND deleted_at IS NULL) v3ref_row,
      (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND (metadata->>'wo')=$4) wo_audit
      `, [uniqMasters, AUTHORED, uniqRefs, 'WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1']))[0];
    notes.dbBaseline = { targetMasters: uniqMasters.length, ...baseline };
    if (uniqMasters.length !== 540) fails.push(`C: DB 대상 master ${uniqMasters.length}!=540`);
    if (baseline.easy_canon !== 540) fails.push(`C: easy canonical ${baseline.easy_canon}!=540 (선택 전제 실패)`);
    if (baseline.authored_ko_canon !== 0) fails.push(`C: authored ko canonical 기준선 ${baseline.authored_ko_canon}!=0 (이미 적용됨?)`);
    if (baseline.authored_ko_row !== 0) fails.push(`C: authored ko row 기준선 ${baseline.authored_ko_row}!=0`);
    if (baseline.en_authored_row !== 0) fails.push(`C: en authored row 기준선 ${baseline.en_authored_row}!=0`);
    if (baseline.v3ref_row !== 0) fails.push(`C: V3 sourceRef row 기준선 ${baseline.v3ref_row}!=0`);
    if (baseline.wo_audit !== 0) fails.push(`C: WO audit row 기준선 ${baseline.wo_audit}!=0 (net write 0 위반)`);
  } finally { await ds.destroy(); }

  const out = { wo: 'WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1', verifier: 'da-independent', pass: fails.length === 0, failCount: fails.length, fails: fails.slice(0, 40), notes };
  console.log(JSON.stringify(out, null, 2));
  console.log(`\n=== INDEPENDENT VERIFY · PASS=${out.pass} · fails=${fails.length} ===`);
  if (!out.pass) process.exit(2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
