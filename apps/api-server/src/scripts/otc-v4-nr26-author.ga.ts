/**
 * WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1
 *   — nasal 14 · rectal 12 KO 저작 + EN 번역메모리 저작 (에이전트 가). DB 접근 0.
 *
 * 입력은 선정 산출물(otc-v4-nr26-prep / -source)뿐이다.
 * route535 author 와 로직 동일 — composer 만 NR 래퍼(otc-v4-nr26-compose)로 바꾼다.
 *
 * 모드:
 *   --ko        KO 저작 → ko payload + 경로 게이트 리포트
 *   --skeleton  EN TM 스켈레톤(기존 값 보존 + 선행 검증 TM seed 병합)
 *   --en        TM 조립 → renderEnNR 검증 → en payload + 리포트
 *
 * EN 은 문장 1:1 번역메모리로만 만든다. 원문에 없는 의료사실 생성 0. 미등록 문장은 커버리지 실패.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, md5, CONTENT_SECTIONS } from './otc-v4-master-leaflet-contract.ga.js';
import { toPlain, type EnV3Payload } from './otc-v3-content-leaflet-composer.na.js';
import { composeKoNR, renderEnNR, nrFormEn, type NrIdentity } from './otc-v4-nr26-compose.ga.js';
import { WO_NR, P } from './otc-v4-nr26-contract.ga.js';

const PREP = P('otc-v4-nr26-prep.ga.json');
const SOURCE = P('otc-v4-nr26-source.ga.json');
const TM = P('otc-v4-nr26-tm.ga.json');
/** seed 우선순위: route535(최신·비경구 교정본) → finalall → next2000 → pilot500 → pilot100 → oral V3. */
const SEED_TMS = [
  'otc-v4-route535-tm.ga.json',
  'otc-v4-finalall-tm.ga.json',
  'otc-v4-next2000-tm.ga.json',
  'otc-v4-pilot-500-tm.ga.json',
  'otc-v4-pilot-100-tm.ga.json',
  'otc-easy-drug-ready-oral-v3-tm.da.json',
].map((f) => path.join(DATA_DIR, f));
const OUT_KO = P('otc-v4-nr26-ko-payload.ga.json');
const OUT_EN = P('otc-v4-nr26-en-payload.ga.json');
const OUT_REPORT = P('otc-v4-nr26-author-report.ga.json');
const has = (k: string): boolean => process.argv.includes(`--${k}`);

/** oral V3(da) VERBATIM — 결정론적 문장 분해. 줄 단위 경계. */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  const marked = text.replace(/([가-힣)\]])\.(\s*)/g, '$1.');
  return marked.split(/[\n]+/).map((s) => s.trim()).filter(Boolean);
}

interface PrepRow {
  masterId: string; unit: string; productName: string | null; ledgerProductName: string;
  permitCode: string | null; gencode: string | null; gencodeCount: number;
  route: string; producible: boolean; stratum: string;
  officialSourceHash: string; plannedSourceRef: string;
}
const loadPrep = () => JSON.parse(fs.readFileSync(PREP, 'utf8')) as { rows: PrepRow[] };
const loadSource = () => JSON.parse(fs.readFileSync(SOURCE, 'utf8')) as Record<string, Record<string, string>>;
/** carry-over 원장에는 dosageForm 이 없다. 추정하지 않고 route 라벨(비강용제/직장용제)로 간다. */
const identity = (r: PrepRow): NrIdentity => ({
  masterId: r.masterId,
  productName: r.productName || r.ledgerProductName,
  permitCode: r.permitCode,
  gencode: r.gencode,
  gencodeCount: r.gencodeCount,
  dosageForm: null,
  route: r.route,
});

function runKo(): void {
  const { rows } = loadPrep();
  const src = loadSource();
  const targets = rows.filter((r) => r.producible);
  const payloads: any[] = [];
  const blocked: Array<{ masterId: string; route: string; anomalies: string[] }> = [];
  const gateReport: any[] = [];
  for (const r of targets) {
    const sec = src[r.masterId];
    const m = identity(r);
    const res = composeKoNR(sec, m);
    if (res.gate) {
      gateReport.push({
        masterId: r.masterId, unit: r.unit, route: r.route, lang: 'ko',
        elementsPreserved: res.gate.elements.filter((e) => e.inOfficial && e.inRendered).map((e) => e.key),
        elementsAbsentInOfficial: res.gate.elements.filter((e) => !e.inOfficial).map((e) => e.key),
        elementViolations: res.gate.elementViolations,
        inversions: res.gate.inversions,
        ownMarkerInRendered: res.gate.ownMarkerInRendered,
      });
    }
    if (res.anomalies.length || !res.build.html) { blocked.push({ masterId: r.masterId, route: r.route, anomalies: res.anomalies }); continue; }
    payloads.push({
      masterId: r.masterId, unit: r.unit, productName: m.productName, permitCode: m.permitCode, route: m.route,
      stratum: r.stratum, officialSourceHash: r.officialSourceHash, sourceRef: r.plannedSourceRef,
      title: m.productName, summary: res.source.summaryTable['작용'] || res.source.efficacy.split('\n')[0].slice(0, 200),
      contentHash: md5(res.build.html), content: res.build.html,
      sectionsPresent: CONTENT_SECTIONS.filter((k) => (sec[k] || '').trim() !== ''),
    });
  }
  fs.writeFileSync(OUT_KO, JSON.stringify({ wo: WO_NR, kind: 'ko-payload', total: payloads.length, payloads, routeGate: gateReport }, null, 2) + '\n', 'utf8');
  const byRoute: Record<string, number> = {};
  for (const p of payloads) byRoute[p.route] = (byRoute[p.route] || 0) + 1;
  console.log(JSON.stringify({ mode: 'ko', targets: targets.length, composed: payloads.length, blocked: blocked.length, byRoute, blockedDetail: blocked.slice(0, 20) }, null, 2));
}

function loadTmEntries(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8')).entries || {};
}

function runSkeleton(): void {
  const { rows } = loadPrep();
  const src = loadSource();
  const targets = rows.filter((r) => r.producible);
  const existing = loadTmEntries(TM);
  const seeds = SEED_TMS.map((f) => ({ file: path.basename(f), entries: loadTmEntries(f) }));
  const meta = new Map<string, { count: number; masters: Set<string>; routes: Set<string>; section: string }>();
  for (const r of targets) {
    for (const k of CONTENT_SECTIONS) {
      for (const s of splitSentences(toPlain(src[r.masterId][k] || ''))) {
        const m = meta.get(s) || { count: 0, masters: new Set<string>(), routes: new Set<string>(), section: k };
        m.count++; m.masters.add(r.masterId); m.routes.add(r.route); meta.set(s, m);
      }
    }
  }
  const keys = [...meta.keys()].sort();
  const entries: Record<string, string> = {};
  const annotations: Record<string, { count: number; masters: number; routes: string[]; section: string; from: string }> = {};
  const fromSeed: Record<string, number> = {};
  for (const k of keys) {
    let v = existing[k] || '';
    let from = v ? 'v4-nr26' : '';
    if (!v) {
      for (const s of seeds) {
        if (s.entries[k]) { v = s.entries[k]; from = s.file; fromSeed[s.file] = (fromSeed[s.file] || 0) + 1; break; }
      }
    }
    entries[k] = v;
    const m = meta.get(k)!;
    annotations[k] = { count: m.count, masters: m.masters.size, routes: [...m.routes].sort(), section: m.section, from };
  }
  const filled = keys.filter((k) => entries[k]).length;
  fs.writeFileSync(TM, JSON.stringify({
    wo: WO_NR, agent: 'ga', kind: 'sentence-translation-memory',
    note: '문장 1:1 KO→EN 번역만. 공식 원문에 없는 의료사실 생성 금지. 수치·연령·기간 보존. 한글 잔존 금지. 경로 표현 역전 금지.',
    total: keys.length, filled, annotations, entries,
  }, null, 2) + '\n', 'utf8');
  const pendingByRoute: Record<string, number> = {};
  const pendingBySection: Record<string, number> = {};
  for (const k of keys) if (!entries[k]) {
    for (const rt of annotations[k].routes) pendingByRoute[rt] = (pendingByRoute[rt] || 0) + 1;
    pendingBySection[annotations[k].section] = (pendingBySection[annotations[k].section] || 0) + 1;
  }
  console.log(JSON.stringify({ mode: 'skeleton', uniqueSentences: keys.length, filled, fromSeed, pending: keys.length - filled, pendingByRoute, pendingBySection }, null, 2));
}

/** renderEnV3 anomaly 의 EN 필드명 → 대조할 KO 공식 원문 섹션. */
const EN_FIELD_TO_KO: Record<string, string> = {
  efficacy: '효능·효과', usage: '용법·용량', warning: '경고',
  precaution: '사용상 주의사항', adverse: '이상반응', interaction: '상호작용',
};
const ORAL_KO = /복용|삼키|먹|섭취|마시|경구/;

function runEn(): void {
  const guardExemptions: Array<{ masterId: string; route: string; anomaly: string; koSection: string }> = [];
  const { rows } = loadPrep();
  const src = loadSource();
  const ko = JSON.parse(fs.readFileSync(OUT_KO, 'utf8'));
  const koBy = new Map<string, any>(ko.payloads.map((p: any) => [p.masterId, p]));
  const tm = loadTmEntries(TM);
  const missing = new Set<string>();
  const payloads: any[] = [];
  const anomalies: Array<{ masterId: string; route: string; issues: string[] }> = [];
  const gateReport: any[] = [];

  for (const r of rows.filter((x) => x.producible && koBy.has(x.masterId))) {
    const m = identity(r);
    const sec = src[r.masterId];
    const enSec: Record<string, string> = {};
    let miss = 0;
    for (const k of CONTENT_SECTIONS) {
      const raw = toPlain(sec[k] || '');
      if (!raw) { enSec[k] = ''; continue; }
      const out: string[] = [];
      for (const s of splitSentences(raw)) {
        const t = tm[s];
        if (!t) { missing.add(s); miss++; out.push('⟪MISSING⟫'); } else out.push(t);
      }
      enSec[k] = out.join('\n\n');
    }
    if (miss) { anomalies.push({ masterId: r.masterId, route: r.route, issues: [`TM 미등록 문장 ${miss}건`] }); continue; }
    const title = `${nrFormEn(m.route)}${m.permitCode ? ` (MFDS ${m.permitCode})` : ''}`;
    const payload: Omit<EnV3Payload, 'usageLabel'> = {
      groupKey: r.masterId,
      title,
      efficacy: enSec['효능·효과'],
      usage: enSec['용법·용량'],
      warning: enSec['경고'],
      precaution: enSec['사용상 주의사항'],
      adverse: enSec['이상반응'],
      interaction: enSec['상호작용'],
      summaryTable: {
        Category: `Over-the-counter medicine · ${nrFormEn(m.route)}`,
        'How it works': enSec['효능·효과'].split('\n')[0].slice(0, 120),
        'Why this one': m.permitCode
          ? `Based on the official MFDS approval for product code ${m.permitCode}. Check the ingredient and strength rather than the product name.`
          : 'Based on the official MFDS approval for this product. Check the ingredient and strength rather than the product name.',
        'Who should ask first': (enSec['경고'] || enSec['사용상 주의사항']) ? 'If any item in the safety information applies to you, ask the pharmacist at the store first.' : '',
      },
    };
    for (const k of Object.keys(payload.summaryTable)) if (!payload.summaryTable[k]) delete payload.summaryTable[k];
    const res = renderEnNR(payload, m.route, sec);
    if (res.gate) {
      gateReport.push({
        masterId: r.masterId, unit: r.unit, route: r.route, lang: 'en',
        elementsPreserved: res.gate.elements.filter((e) => e.inOfficial && e.inRendered).map((e) => e.key),
        elementViolations: res.gate.elementViolations,
        inversions: res.gate.inversions,
        ownMarkerInRendered: res.gate.ownMarkerInRendered,
      });
    }
    // ── 원문 근거 기반 경구 동사 면제 ─────────────────────────────────────────────
    // 해당 섹션 KO 공식 원문에 경구 동사가 실제로 있을 때만 면제한다(원문 충실 번역).
    // 원문 근거 없는 경구 표현은 면제하지 않는다 — 그것이 경로 역전이다.
    const remaining: string[] = [];
    for (const a of res.anomalies) {
      const mm = a.match(/^비경구\([a-z]+\) EN ([a-zA-Z]+)에 경구 동사/);
      const koSec = mm ? EN_FIELD_TO_KO[mm[1]] : undefined;
      if (koSec && ORAL_KO.test(toPlain(sec[koSec] || ''))) {
        guardExemptions.push({ masterId: r.masterId, route: m.route, anomaly: a, koSection: koSec });
        continue;
      }
      remaining.push(a);
    }
    if (remaining.length) { anomalies.push({ masterId: r.masterId, route: r.route, issues: remaining }); continue; }
    payloads.push({
      masterId: r.masterId, unit: r.unit, route: m.route, title,
      summary: payload.summaryTable['How it works'],
      contentHash: md5(res.html), content: res.html,
    });
  }
  fs.writeFileSync(OUT_EN, JSON.stringify({ wo: WO_NR, kind: 'en-payload', total: payloads.length, payloads }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_REPORT, JSON.stringify({
    wo: WO_NR, mode: 'en', composed: payloads.length, blocked: anomalies.length,
    tmMissingUnique: missing.size, missingSample: [...missing].slice(0, 30), anomalies: anomalies.slice(0, 200),
    routeGuardExemptions: guardExemptions.length,
    routeGuardExemptionPolicy: '해당 섹션 KO 공식 원문에 경구 동사가 실제 존재할 때만 면제(원문 충실 번역). 원문 근거 없는 경구 동사는 면제하지 않는다.',
    routeGuardExemptionDetail: guardExemptions,
    routeGate: gateReport,
  }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ mode: 'en', composed: payloads.length, blocked: anomalies.length, tmMissingUnique: missing.size, routeGuardExemptions: guardExemptions.length, anomalySample: anomalies.slice(0, 10) }, null, 2));
}

if (has('ko')) runKo();
else if (has('skeleton')) runSkeleton();
else if (has('en')) runEn();
else { console.error('mode 필요: --ko | --skeleton | --en'); process.exit(1); }
