/**
 * WO-O4O-OTC-EASY-DRUG-V4-CARRYOVER72-FINAL-PRODUCTION-V1
 *   — LIVE apply 전 유닛 콘텐츠 독립검증 (READ-ONLY, DB 접근 0)
 *
 * ⚠️ 독립성: composer/author/executor 를 import 하지 않는다. 섹션 파서·수치 추출·route 어휘를
 *    이 파일에서 독자 재구현하고 payload 실물과 공식 원문을 대조한다.
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-carryover72-content-verify.ga.ts --unit rectal
 */
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const UNIT = arg('--unit') || 'rectal';

const flat = (h: string): string => (h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const verbNorm = (s: string): string => s.replace(/복용|투여/g, '사용');
const nums = (s: string): string[] => (s.match(/[0-9]+(?:[.][0-9]+)?/g) || []);
const ageT = (s: string): string[] => (s.match(/[0-9]+\s*(세|개월|살)/g) || []).map((x) => x.replace(/\s/g, ''));
const durT = (s: string): string[] => (s.match(/[0-9]+\s*(일|주|개월|시간|분|회)/g) || []).map((x) => x.replace(/\s/g, ''));

/** 경로별 필수 표현 / 혼입 금지 표현 (독자 어휘). */
const REQUIRE: Record<string, RegExp> = {
  rectal: /항문|직장|좌약|관장|삽입|주입/,
  oromucosal: /구강|입\s*안|가글|양치|함수|트로키|녹여|인후|목/,
  /** multi-nonoral 은 **양쪽 경로가 모두** 본문에 있어야 한다. 하나라도 없으면 경로 소실이다. */
  'oromucosal+vaginal': /(?=[\s\S]*(?:구강|입\s*안|잇몸|구내염|치육염))(?=[\s\S]*(?:질\s*안|질내|질\s*세균))[\s\S]*/,
};
const FORBID: Record<string, RegExp> = {
  rectal: /점안|눈에\s*넣|질\s*내\s*삽입|비강|콧속|가글/,
  oromucosal: /항문|직장|좌약|관장|점안|비강|질\s*내/,
  'oromucosal+vaginal': /항문|직장|좌약|관장|점안|비강/,
};
const EN_ORAL = /\b(take|takes|taken|taking|swallow|swallowed|orally|by mouth|ingest)\b/i;
const ORAL_KO = /복용|삼키|먹|섭취|마시|경구/;

interface G { id: string; gate: string; actual: string; pass: boolean; detail?: unknown }
const gates: G[] = [];
const add = (id: string, gate: string, actual: string, pass: boolean, detail?: unknown): void => {
  gates.push({ id, gate, actual, pass, ...(detail !== undefined ? { detail } : {}) });
};

function main(): void {
  const prep = J('otc-v4-carryover72-prep.ga.json');
  const src: Record<string, Record<string, string>> = J('otc-v4-carryover72-source.ga.json');
  const ko = J('otc-v4-carryover72-ko-payload.ga.json').payloads as any[];
  const en = J('otc-v4-carryover72-en-payload.ga.json').payloads as any[];
  const rows: any[] = prep.rows;

  add('CV-01', '입력 = KO payload = EN payload', `${rows.length}/${ko.length}/${en.length}`,
    rows.length === ko.length && rows.length === en.length);
  add('CV-02', 'route 전건 주입 일치', `${rows.filter((r) => r.route === UNIT).length}/${rows.length}`,
    rows.every((r) => r.route === UNIT));

  const koBy = new Map(ko.map((p) => [p.masterId, p]));
  const enBy = new Map(en.map((p) => [p.masterId, p]));
  const secMiss: any[] = [], numMiss: any[] = [], ageMiss: any[] = [], durMiss: any[] = [];
  const routeMissing: any[] = [], routeForbid: any[] = [], enOralBad: any[] = [], enHangul: any[] = [];
  const cov: number[] = [];

  for (const r of rows) {
    const kp = koBy.get(r.masterId), ep = enBy.get(r.masterId);
    if (!kp || !ep) continue;
    const body = flat(kp.content), nbody = verbNorm(body);
    const official = src[r.masterId] || {};
    const present = Object.keys(official).filter((k) => (official[k] || '').trim() !== '');

    // 공식 6섹션 내용 보존 — 섹션별 토큰 커버리지
    for (const k of present) {
      const toks = [...new Set((verbNorm(flat(official[k])).match(/[가-힣]{2,}/g) || []))];
      if (!toks.length) continue;
      const c = (toks.length - toks.filter((t) => !nbody.includes(t)).length) / toks.length;
      cov.push(c);
      if (c < 0.95) secMiss.push({ masterId: r.masterId, sec: k, cov: +c.toFixed(3) });
    }
    // 수치·연령·기간
    const offAll = present.map((k) => flat(official[k])).join(' ');
    const mn = [...new Set(nums(offAll))].filter((x) => !nums(body).includes(x));
    if (mn.length) numMiss.push({ masterId: r.masterId, missing: mn.slice(0, 10) });
    const ma = [...new Set(ageT(offAll))].filter((x) => !ageT(body).includes(x));
    if (ma.length) ageMiss.push({ masterId: r.masterId, missing: ma.slice(0, 8) });
    const md = [...new Set(durT(offAll))].filter((x) => !durT(body).includes(x));
    if (md.length) durMiss.push({ masterId: r.masterId, missing: md.slice(0, 8) });
    // route 표현
    if (REQUIRE[UNIT] && !REQUIRE[UNIT].test(body)) routeMissing.push(r.masterId);
    if (FORBID[UNIT] && FORBID[UNIT].test(body)) routeForbid.push({ masterId: r.masterId, hit: (body.match(FORBID[UNIT]) || [])[0] });
    // EN
    const eb = flat(ep.content);
    if (/[가-힣]/.test(eb)) enHangul.push(r.masterId);
    if (EN_ORAL.test(eb) && !ORAL_KO.test(offAll)) enOralBad.push({ masterId: r.masterId, hit: (eb.match(EN_ORAL) || [])[0] });
  }

  cov.sort((a, b) => a - b);
  add('CV-03', '공식 섹션 내용 보존(커버리지 ≥0.95)', `미달 ${secMiss.length}`, secMiss.length === 0,
    { min: cov.length ? +cov[0].toFixed(4) : null, median: cov.length ? +cov[Math.floor(cov.length / 2)].toFixed(4) : null, sections: cov.length, worst: secMiss.slice(0, 5) });
  add('CV-04', '수치 누락 0', String(numMiss.length), numMiss.length === 0, numMiss.slice(0, 5));
  add('CV-05', '연령 토큰 누락 0', String(ageMiss.length), ageMiss.length === 0, ageMiss.slice(0, 5));
  add('CV-06', '기간·횟수 토큰 누락 0', String(durMiss.length), durMiss.length === 0, durMiss.slice(0, 5));
  add('CV-07', `${UNIT} 경로 표현 존재`, `미검출 ${routeMissing.length}`, routeMissing.length === 0, routeMissing.slice(0, 5));
  add('CV-08', '타 경로 표현 혼입 0', String(routeForbid.length), routeForbid.length === 0, routeForbid.slice(0, 5));
  add('CV-09', 'EN 한글 잔존 0', String(enHangul.length), enHangul.length === 0, enHangul.slice(0, 5));
  add('CV-10', 'EN 경구동사 오도입 0(원문 근거 없는 것)', String(enOralBad.length), enOralBad.length === 0, enOralBad.slice(0, 5));

  const pass = gates.every((g) => g.pass);
  const out = { wo: 'WO-O4O-OTC-EASY-DRUG-V4-CARRYOVER72-FINAL-PRODUCTION-V1', kind: 'pre-apply-content-verification', unit: UNIT, liveDbWrite: 0, independence: 'composer/author/executor 미import · 독자 파서·어휘·수치 추출', gatesTotal: gates.length, gatesPassed: gates.filter((g) => g.pass).length, verdict: pass ? 'PASS' : 'FAIL', gates };
  fs.writeFileSync(P(`otc-v4-carryover72-content-verification-${UNIT}.ga.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ...out, gates: gates.map((g) => ({ id: g.id, pass: g.pass, gate: g.gate, actual: g.actual })) }, null, 2));
  if (!pass) process.exitCode = 2;
}
main();
