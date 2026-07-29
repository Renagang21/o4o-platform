/**
 * WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1
 *   — pilot 500 제품별 KO 저작 + EN 번역메모리(TM) 저작·검증 (에이전트 가)
 *
 * DB 접근 0. prep 산출물(otc-v4-next2000-prep/source)만 입력으로 쓴다.
 * pilot 100 author(otc-v4-pilot-100-author.ga.ts) 와 로직 동일 — 경로와 TM seed 만 다르다.
 *
 * 모드:
 *   --ko          KO 저작(제품별) → ko payload + 게이트 리포트
 *   --skeleton    EN TM 스켈레톤 생성/갱신(기존 값 보존 + pilot 100 TM · oral v3 TM seed 병합)
 *   --en          TM 으로 EN 조립 + renderEnV4 검증 → en payload + 리포트
 *
 * EN 은 문장 1:1 번역메모리로만 만든다. 원문에 없는 의료사실 생성 0. 미등록 문장은 커버리지 실패.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, md5, CONTENT_SECTIONS } from './otc-v4-master-leaflet-contract.ga.js';
import { composeKoV4, renderEnV4, enFormLabel, type MasterIdentity } from './otc-v4-master-leaflet-composer.ga.js';
import { toPlain, type EnV3Payload } from './otc-v3-content-leaflet-composer.na.js';
import { WO_500, PILOT_500_LEDGER } from './otc-v4-next2000-contract.ga.js';

const PREP = path.join(DATA_DIR, 'otc-v4-next2000-prep.ga.json');
const SOURCE = path.join(DATA_DIR, 'otc-v4-next2000-source.ga.json');
const TM = path.join(DATA_DIR, 'otc-v4-next2000-tm.ga.json');
/** seed 우선순위: pilot 100 TM(동일 V4 계약) → oral V3 TM. 둘 다 문장 1:1 검증 통과본. */
/** seed 우선순위: pilot 500 TM(최대·최신 검증본) → pilot 100 TM → oral V3 TM. 전부 문장 1:1 검증 통과본. */
const SEED_TMS = [
  path.join(DATA_DIR, 'otc-v4-pilot-500-tm.ga.json'),
  path.join(DATA_DIR, 'otc-v4-pilot-100-tm.ga.json'),
  path.join(DATA_DIR, 'otc-easy-drug-ready-oral-v3-tm.da.json'),
];
const OUT_KO = path.join(DATA_DIR, 'otc-v4-next2000-ko-payload.ga.json');
const OUT_EN = path.join(DATA_DIR, 'otc-v4-next2000-en-payload.ga.json');
const OUT_REPORT = path.join(DATA_DIR, 'otc-v4-next2000-author-report.ga.json');
const has = (k: string): boolean => process.argv.includes(`--${k}`);

/** oral V3(da) VERBATIM — 결정론적 문장 분해. 줄 단위 경계. */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  const marked = text.replace(/([가-힣)\]])\.(\s*)/g, '$1.');
  return marked.split(/[\n]+/).map((s) => s.trim()).filter(Boolean);
}

interface PrepRow {
  masterId: string; productName: string | null; ledgerProductName: string;
  permitCode: string | null; gencode: string | null; gencodeCount: number;
  route: string | null; producible: boolean; stratum: string;
  officialSourceHash: string | null; plannedSourceRef: string;
}
const loadPrep = () => JSON.parse(fs.readFileSync(PREP, 'utf8')) as { rows: PrepRow[] };
const loadSource = () => JSON.parse(fs.readFileSync(SOURCE, 'utf8')) as Record<string, Record<string, string>>;
const loadLedgerForm = (): Map<string, string | null> => {
  const j = JSON.parse(fs.readFileSync(PILOT_500_LEDGER, 'utf8'));
  return new Map(j.masters.map((m: any) => [m.masterId, m.dosageForm ?? null]));
};
const identity = (r: PrepRow, forms: Map<string, string | null>): MasterIdentity => ({
  masterId: r.masterId,
  productName: r.productName || r.ledgerProductName,
  permitCode: r.permitCode,
  gencode: r.gencode,
  gencodeCount: r.gencodeCount,
  dosageForm: forms.get(r.masterId) ?? null,
  route: r.route as string,
});

function runKo(): void {
  const { rows } = loadPrep();
  const src = loadSource();
  const forms = loadLedgerForm();
  const targets = rows.filter((r) => r.producible);
  const payloads: any[] = [];
  const blocked: Array<{ masterId: string; anomalies: string[] }> = [];
  for (const r of targets) {
    const sec = src[r.masterId];
    const m = identity(r, forms);
    const res = composeKoV4(sec, m);
    if (res.anomalies.length || !res.build.html) { blocked.push({ masterId: r.masterId, anomalies: res.anomalies }); continue; }
    payloads.push({
      masterId: r.masterId, productName: m.productName, permitCode: m.permitCode, route: m.route,
      stratum: r.stratum, officialSourceHash: r.officialSourceHash, sourceRef: r.plannedSourceRef,
      title: m.productName, summary: res.source.summaryTable['작용'] || res.source.efficacy.split('\n')[0].slice(0, 200),
      contentHash: md5(res.build.html), content: res.build.html,
      sectionsPresent: CONTENT_SECTIONS.filter((k) => (sec[k] || '').trim() !== ''),
    });
  }
  fs.writeFileSync(OUT_KO, JSON.stringify({ wo: WO_500, kind: 'ko-payload', total: payloads.length, payloads }, null, 2) + '\n', 'utf8');
  const byRoute: Record<string, number> = {};
  for (const p of payloads) byRoute[p.route] = (byRoute[p.route] || 0) + 1;
  console.log(JSON.stringify({ mode: 'ko', targets: targets.length, composed: payloads.length, blocked: blocked.length, byRoute, blockedDetail: blocked.slice(0, 20) }, null, 2));
}

function loadTmEntries(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return j.entries || {};
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
        m.count++; m.masters.add(r.masterId); m.routes.add(r.route as string); meta.set(s, m);
      }
    }
  }
  const keys = [...meta.keys()].sort();
  const entries: Record<string, string> = {};
  const annotations: Record<string, { count: number; masters: number; routes: string[]; section: string; from: string }> = {};
  const fromSeed: Record<string, number> = {};
  for (const k of keys) {
    let v = existing[k] || '';
    let from = v ? 'v4-500' : '';
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
    wo: WO_500, agent: 'ga', kind: 'sentence-translation-memory',
    note: '문장 1:1 KO→EN 번역만. 공식 원문에 없는 의료사실 생성 금지. 수치·연령·기간 보존. 한글 잔존 금지.',
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

/** renderEnV4 anomaly 의 EN 필드명 → 대조할 KO 공식 원문 섹션. */
const EN_FIELD_TO_KO: Record<string, string> = {
  efficacy: '효능·효과', usage: '용법·용량', warning: '경고',
  precaution: '사용상 주의사항', adverse: '이상반응', interaction: '상호작용',
};
const ORAL_KO = /복용|삼키|먹|섭취|마시|경구/;

function runEn(): void {
  const guardExemptions: Array<{ masterId: string; route: string; anomaly: string; koSection: string }> = [];
  const { rows } = loadPrep();
  const src = loadSource();
  const forms = loadLedgerForm();
  const ko = JSON.parse(fs.readFileSync(OUT_KO, 'utf8'));
  const koBy = new Map<string, any>(ko.payloads.map((p: any) => [p.masterId, p]));
  const tm = loadTmEntries(TM);
  const missing = new Set<string>();
  const payloads: any[] = [];
  const anomalies: Array<{ masterId: string; issues: string[] }> = [];

  for (const r of rows.filter((x) => x.producible && koBy.has(x.masterId))) {
    const m = identity(r, forms);
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
    if (miss) { anomalies.push({ masterId: r.masterId, issues: [`TM 미등록 문장 ${miss}건`] }); continue; }
    const title = `${enFormLabel(m.route)}${m.permitCode ? ` (MFDS ${m.permitCode})` : ''}`;
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
        Category: `Over-the-counter medicine · ${enFormLabel(m.route)}`,
        'How it works': enSec['효능·효과'].split('\n')[0].slice(0, 120),
        'Why this one': m.permitCode
          ? `Based on the official MFDS approval for product code ${m.permitCode}. Check the ingredient and strength rather than the product name.`
          : 'Based on the official MFDS approval for this product. Check the ingredient and strength rather than the product name.',
        'Who should ask first': (enSec['경고'] || enSec['사용상 주의사항']) ? 'If any item in the safety information applies to you, ask the pharmacist at the store first.' : '',
      },
    };
    for (const k of Object.keys(payload.summaryTable)) if (!payload.summaryTable[k]) delete payload.summaryTable[k];
    const res = renderEnV4(payload, m.route, sec['용법·용량'] || '');
    // ── 원문 근거 기반 route 가드 예외 ────────────────────────────────────────────
    // renderEnV4 는 비경구 제품의 EN 에 경구 동사가 보이면 route 역전으로 본다. 그러나
    // 외용제 주의사항의 "실수로 이 약을 복용한 경우" 처럼 **공식 원문 자체에 경구 동사가 있는**
    // 경우가 있고, 이때 EN 은 원문에 충실한 번역이지 역전이 아니다.
    // → 해당 섹션의 KO 공식 원문에 경구 동사가 실제로 존재할 때만 그 anomaly 를 면제하고 전건 기록한다.
    //   (공용 composer 는 pilot 100 LIVE 산출물의 재현성 때문에 수정하지 않는다.)
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
    if (remaining.length) { anomalies.push({ masterId: r.masterId, issues: remaining }); continue; }
    payloads.push({
      masterId: r.masterId, route: m.route, title,
      summary: payload.summaryTable['How it works'],
      contentHash: md5(res.html), content: res.html,
    });
  }
  fs.writeFileSync(OUT_EN, JSON.stringify({ wo: WO_500, kind: 'en-payload', total: payloads.length, payloads }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_REPORT, JSON.stringify({
    wo: WO_500, mode: 'en', composed: payloads.length, blocked: anomalies.length,
    tmMissingUnique: missing.size, missingSample: [...missing].slice(0, 30), anomalies: anomalies.slice(0, 200),
    routeGuardExemptions: guardExemptions.length,
    routeGuardExemptionPolicy: '해당 섹션 KO 공식 원문에 경구 동사가 실제 존재할 때만 면제(원문 충실 번역). 원문 근거 없는 경구 동사는 면제하지 않는다.',
    routeGuardExemptionDetail: guardExemptions,
  }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ mode: 'en', composed: payloads.length, blocked: anomalies.length, tmMissingUnique: missing.size, routeGuardExemptions: guardExemptions.length, anomalySample: anomalies.slice(0, 10) }, null, 2));
}

if (has('ko')) runKo();
else if (has('skeleton')) runSkeleton();
else if (has('en')) runEn();
else { console.error('mode 필요: --ko | --skeleton | --en'); process.exit(1); }
