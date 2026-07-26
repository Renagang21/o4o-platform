// WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT2-OPHTHALMIC-FINAL-READINESS-V1 — 점안 EN payload 검증기 (에이전트 가)
//
// 공용 러너 `otc-v2-store-leaflet-runner.shared.ts` 의 export 를 그대로 import 하고,
// route profile 만 점안 전용 `OPHTHALMIC_PROFILE` 을 주입해 LIVE apply 시점과 동일한 판정을 사전 수행한다.
// 공용 러너는 수정하지 않는다. read-only · DB 미접속 · DB write 0.
//
// 게이트
//   1) 최종 승인 SSOT 의 34 fp 매칭 · 중복 0 · 누락 0
//   2) 필수필드(fp/title/efficacy/usage/caution/summaryTable) · usageLabel 미포함(러너 주입)
//   3) 한글 잔존 0
//   4) 경구 동사 0 — take/taken/taking/swallow/orally/by mouth (용법·효능·주의·요약표 전체)
//   5) 점안 경로 표현 필수 (instill / eye / eyelid / conjunctival sac / eye drops)
//   6) 공식 용법 수량(방울 수·횟수·간격·기간) 보존 0 누락 (missingNumericsEn)
//   7) 연령 경계 보존: 공식 용법 연령 → EN 용법, 공식 주의 연령 → EN 용법/주의
//   8) 한쪽/양쪽 눈 축 보존
//   9) 점안 고유 주의 축 보존 — 콘택트렌즈 · 용기 끝 접촉 · 점안 간격
//  10) 금기·주의 축: 공식 주의 존재 → EN caution 존재, 금지문 존재 → EN 금지 표현 필수
//
// Usage(apps/api-server): npx tsx src/scripts/otc-unit2-oph-en-config-verify.ga.mjs [config...]
import fs from 'node:fs';
import path from 'node:path';
import { renderEn, missingNumericsEn } from './otc-v2-store-leaflet-runner.shared.ts';
import {
  OPHTHALMIC_PROFILE,
  OPHTHALMIC_ROUTE,
  hasOphthalmicRouteEn,
  missingDropCountsEn,
  missingEyeCautionEn,
  missingEyeSideEn,
} from './otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.ts';

const DATA = 'src/scripts/data';
const SOURCE = path.join(DATA, 'otc-unproduced-nonoral-unit2-ophthalmic-authoring-source.ga.json');
const SSOT = path.join(DATA, 'otc-unproduced-nonoral-unit2-ophthalmic-approved-ssot-v1.json');
const HANGUL = /[가-힣]/;
const ORAL_VERB_EN = /\b(take|takes|taken|taking|swallow|swallowed|swallowing|orally|by mouth)\b/i;
const PROHIBIT_KO = /(복용하지\s?(마|않)|사용하지\s?(마|않)|투여하지\s?(마|말)|점안하지\s?(마|않))/;
const PROHIBIT_EN = /\b(do not|must not|never)\b/i;

const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
if (ssot.status !== 'APPROVED_FOR_PRODUCTION') throw new Error(`SSOT status ${ssot.status}`);
const byFp = new Map(src.groups.map((g) => [g.fp, g]));
const sizeByFp = new Map(ssot.groups.map((g) => [g.fp, g.size]));
const targetFps = new Set(ssot.groups.map((g) => g.fp));

const norm = (s) => (s || '').normalize('NFKC').replace(/\s+/g, ' ');
const numOf = (re, text) => [...new Set([...norm(text).matchAll(re)].map((m) => m[1].replace(/,/g, '')))];
const AGE_RE = /(?:만\s?)?(\d+(?:\.\d+)?)\s*(?:세|개월)/g;
const hasNum = (en, v) => {
  const esc = v.replace('.', '\\.');
  return new RegExp(`(?:^|[^\\d])${esc}(?:[^\\d]|$)`).test(' ' + en.toLowerCase() + ' ');
};

const files = process.argv.slice(2).filter((a) => a.endsWith('.json'));
const explicit = files.length ? files
  : fs.readdirSync(DATA).filter((f) => /^otc-unit2-oph-en-config-ga-p\d+\.json$/.test(f)).sort().map((f) => path.join(DATA, f));

const failures = [];
const seen = new Map();
let entries = 0;
for (const f of explicit) {
  if (!fs.existsSync(f)) { failures.push(`config 부재: ${f}`); continue; }
  const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const e of cfg.groups || []) {
    entries += 1;
    const where = `${path.basename(f)}#${e.fp}`;
    const g = byFp.get(e.fp);
    if (!targetFps.has(e.fp)) { failures.push(`${where}: 점안 Unit2 대상 fp 아님`); continue; }
    if (seen.has(e.fp)) failures.push(`${where}: fp 중복 (이미 ${seen.get(e.fp)})`); else seen.set(e.fp, path.basename(f));
    if (e.usageLabel !== undefined) failures.push(`${where}: usageLabel 포함 금지(러너 주입)`);
    for (const k of ['title', 'efficacy', 'usage', 'caution']) {
      if (!e[k] || !String(e[k]).trim()) failures.push(`${where}: ${k} 공백`);
      else if (HANGUL.test(String(e[k]))) failures.push(`${where}: 한글 잔존 ${k}`);
    }
    if (!e.summaryTable || !Object.keys(e.summaryTable).length) failures.push(`${where}: summaryTable 비어있음`);
    else for (const [k, v] of Object.entries(e.summaryTable)) {
      if (HANGUL.test(String(k)) || HANGUL.test(String(v))) failures.push(`${where}: summaryTable 한글 잔존`);
    }
    if (!g) continue;

    const enAllParts = [e.title, e.efficacy, e.usage, e.caution,
      ...Object.entries(e.summaryTable || {}).flat()].map(String);
    const enAll = enAllParts.join('\n');

    // renderEn — apply 시점과 동일 게이트(한글·경구 동사·수치). 점안 전용 프로파일 주입.
    const r = renderEn({ groupKey: e.fp, title: e.title, efficacy: e.efficacy, usage: e.usage, caution: e.caution, summaryTable: e.summaryTable },
      OPHTHALMIC_ROUTE, g.official.dosage, OPHTHALMIC_PROFILE);
    for (const a of r.anomalies) failures.push(`${where}: ${a}`);
    if (!r.html) failures.push(`${where}: 빈 html`);

    // 경구 동사 — EN 전 영역
    for (const part of enAllParts) {
      const m = part.match(ORAL_VERB_EN);
      if (m) { failures.push(`${where}: 경구 동사 잔존 "${m[0]}"`); break; }
    }

    // 점안 경로 표현
    if (!hasOphthalmicRouteEn(e.usage)) failures.push(`${where}: 점안 경로 표현 없음(instill/eye/eyelid)`);

    // 수량 보존 (방울 수·횟수·간격·기간)
    const lost = missingNumericsEn(g.official.dosage, e.usage);
    if (lost.length) failures.push(`${where}: 용법 수량 누락 ${lost.join(',')}`);
    const lostDrops = missingDropCountsEn(g.official.dosage, e.usage);
    if (lostDrops.length) failures.push(`${where}: 1회 방울 수 누락 ${lostDrops.join(',')}`);

    // 연령 경계
    const missAgeDos = numOf(AGE_RE, g.official.dosage).filter((v) => !hasNum(e.usage, v));
    if (missAgeDos.length) failures.push(`${where}: 용법 연령 누락 ${missAgeDos.join(',')}`);
    const missAgeCau = numOf(AGE_RE, g.official.caution).filter((v) => !hasNum(`${e.usage}\n${e.caution}`, v));
    if (missAgeCau.length) failures.push(`${where}: 주의 연령 누락 ${missAgeCau.join(',')}`);

    // 한쪽/양쪽 눈 축
    const side = missingEyeSideEn(g.official.dosage, e.usage);
    if (side.missing.length) failures.push(`${where}: 적용 눈 축 누락 ${side.missing.join(',')}`);

    // 점안 고유 주의 축 (콘택트렌즈 · 용기 끝 접촉 · 점안 간격)
    const eye = missingEyeCautionEn(g.official.caution, enAll);
    if (eye.missing.length) failures.push(`${where}: 점안 주의 축 누락 ${eye.missing.join(',')}`);

    // 금기·주의 축
    if (g.official.caution && !String(e.caution).trim()) failures.push(`${where}: 주의 축 누락`);
    if (PROHIBIT_KO.test(g.official.caution) && !PROHIBIT_EN.test(e.caution)) failures.push(`${where}: 금기 표현 누락`);
  }
}
const missingFps = [...targetFps].filter((fp) => !seen.has(fp)).sort();
const verdict = failures.length === 0 && missingFps.length === 0 ? 'COMPLETE' : (failures.length ? 'FAIL' : 'INCOMPLETE');
const writeT = [...seen.keys()].reduce((a, fp) => a + (sizeByFp.get(fp) || 0), 0) * 2;
console.log(`OPH-EN-VERIFY — ${verdict}`);
console.log(`  configs ${explicit.length} · entries ${entries} · covered ${seen.size}/${targetFps.size} fp · 누락 ${missingFps.length} · 중복 0 기준검사 포함`);
console.log(`  예상 EN write ${writeT}T / 필요 ${ssot.writePlan.en}T`);
if (failures.length) { console.log(`  실패 ${failures.length}건:`); for (const f of failures.slice(0, 25)) console.log(`   - ${f}`); }
if (missingFps.length && missingFps.length <= 12) console.log(`  누락 fp: ${missingFps.join(',')}`);
process.exit(verdict === 'COMPLETE' ? 0 : 1);
