// WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-EN-AUTHORING-AND-VALIDATION-V1 — Unit 2 EN payload 검증기 (에이전트 가)
//
// 공용 러너 `otc-v2-store-leaflet-runner.shared.ts` 의 export 를 그대로 import 해서
// LIVE apply 시점과 동일한 판정을 사전에 수행한다. 공용 러너는 수정하지 않는다.
// read-only · DB 미접속 · DB write 0.
//
// 게이트
//   1) fp 374 매칭 · 중복 0 · 누락 0 (dry-run manifest 기준)
//   2) 필수필드(fp/title/efficacy/usage/caution/summaryTable) · usageLabel 미포함
//   3) 한글 잔존 0 (renderEn 내부 게이트와 동일)
//   4) 공식 용법 수치 보존 0 누락 (missingNumericsEn)
//   5) 연령 경계 보존: 공식 용법의 연령 수치 → EN 용법, 공식 주의의 연령 수치 → EN 용법/주의
//   6) 복용 횟수·간격·기간 보존: 공식 용법의 기간/간격 토큰 수치 → EN 용법
//   7) 금기·주의 축: 공식 주의 존재 → EN caution 존재, 금지문("복용하지 마")이 있으면 EN 에 금지 표현 필수
//   8) 경구 동사 존재(route=oral 계약) · 비경구 동사 혼입 검사(renderEn)
//
// Usage(apps/api-server): npx tsx src/scripts/otc-unit2-en-config-verify.ga.mjs [config...]
import fs from 'node:fs';
import path from 'node:path';
import { renderEn, missingNumericsEn } from './otc-v2-store-leaflet-runner.shared.ts';

const DATA = 'src/scripts/data';
const SOURCE = path.join(DATA, 'otc-unproduced-oral-unit2-authoring-source.ga.json');
const MANIFEST = path.join(DATA, 'otc-unproduced-oral-unit2-dryrun-manifest-v1.json');
const HANGUL = /[가-힣]/;
const ORAL_VERB_EN = /\b(take|taken|taking|swallow|by mouth|orally)\b/i;
const PROHIBIT_KO = /(복용하지\s?(마|않)|사용하지\s?(마|않)|투여하지\s?(마|말))/;
const PROHIBIT_EN = /\b(do not|must not|never)\b/i;

const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const byFp = new Map(src.groups.map((g) => [g.fp, g]));
const targetFps = new Set(manifest.groups.map((g) => g.fp));

const norm = (s) => (s || '').normalize('NFKC').replace(/\s+/g, ' ');
const numOf = (re, text) => [...new Set([...norm(text).matchAll(re)].map((m) => m[1].replace(/,/g, '')))];
const AGE_RE = /(?:만\s?)?(\d+(?:\.\d+)?)\s*(?:세|개월)/g;
const DUR_RE = /(\d+(?:\.\d+)?)\s*(?:시간|일|주|개월|분)/g;
const hasNum = (en, v) => {
  const esc = v.replace('.', '\\.');
  return new RegExp(`(?:^|[^\\d])${esc}(?:[^\\d]|$)`).test(' ' + en.toLowerCase() + ' ');
};

const files = process.argv.slice(2).filter((a) => a.endsWith('.json'));
const explicit = files.length ? files
  : fs.readdirSync(DATA).filter((f) => /^otc-unit2-en-config-ga-p\d+\.json$/.test(f)).sort().map((f) => path.join(DATA, f));

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
    if (!targetFps.has(e.fp)) { failures.push(`${where}: Unit2 대상 fp 아님`); continue; }
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

    // renderEn — apply 시점과 동일 게이트(한글·비경구 동사·수치)
    const r = renderEn({ groupKey: e.fp, title: e.title, efficacy: e.efficacy, usage: e.usage, caution: e.caution, summaryTable: e.summaryTable },
      g.route, g.official.dosage);
    for (const a of r.anomalies) failures.push(`${where}: ${a}`);
    if (!r.html) failures.push(`${where}: 빈 html`);

    // 수치 보존
    const lost = missingNumericsEn(g.official.dosage, e.usage);
    if (lost.length) failures.push(`${where}: 수치 누락 ${lost.join(',')}`);

    // 연령 경계
    const ageDos = numOf(AGE_RE, g.official.dosage);
    const missAgeDos = ageDos.filter((v) => !hasNum(e.usage, v));
    if (missAgeDos.length) failures.push(`${where}: 용법 연령 누락 ${missAgeDos.join(',')}`);
    const ageCau = numOf(AGE_RE, g.official.caution);
    const enAll = `${e.usage}\n${e.caution}`;
    const missAgeCau = ageCau.filter((v) => !hasNum(enAll, v));
    if (missAgeCau.length) failures.push(`${where}: 주의 연령 누락 ${missAgeCau.join(',')}`);

    // 복용 횟수·간격·기간
    const durDos = numOf(DUR_RE, g.official.dosage);
    const missDur = durDos.filter((v) => !hasNum(e.usage, v));
    if (missDur.length) failures.push(`${where}: 용법 기간·간격 누락 ${missDur.join(',')}`);

    // 금기·주의 축
    if (g.official.caution && !String(e.caution).trim()) failures.push(`${where}: 주의 축 누락`);
    if (PROHIBIT_KO.test(g.official.caution) && !PROHIBIT_EN.test(e.caution)) failures.push(`${where}: 금기 표현 누락`);

    // 경구 동사(route=oral 계약)
    if (g.route === 'oral' && !ORAL_VERB_EN.test(e.usage)) failures.push(`${where}: 경구 동사(take/orally) 없음`);
  }
}
const missingFps = [...targetFps].filter((fp) => !seen.has(fp)).sort();
const verdict = failures.length === 0 && missingFps.length === 0 ? 'COMPLETE' : (failures.length ? 'FAIL' : 'INCOMPLETE');
console.log(`UNIT2-EN-VERIFY — ${verdict}`);
console.log(`  configs ${explicit.length} · entries ${entries} · covered ${seen.size}/${targetFps.size} fp · 누락 ${missingFps.length} · 중복 0 기준검사 포함`);
console.log(`  예상 EN write ${[...seen.keys()].reduce((a, fp) => a + (byFp.get(fp)?.size || 0), 0) * 2}T / 필요 ${manifest.writePlan.en}T`);
if (failures.length) { console.log(`  실패 ${failures.length}건:`); for (const f of failures.slice(0, 25)) console.log(`   - ${f}`); }
if (missingFps.length && missingFps.length <= 10) console.log(`  누락 fp: ${missingFps.join(',')}`);
process.exit(verdict === 'COMPLETE' ? 0 : 1);
