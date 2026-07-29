/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-PRODUCTION-V1
 *   — pilot 100 제품별 KO 저작 + EN 번역메모리(TM) 저작·검증 (에이전트 가)
 *
 * DB 접근 0. prep 산출물(otc-v4-pilot-100-prep/source)만 입력으로 쓴다.
 *
 * 모드:
 *   --ko          KO 저작(제품별) → ko payload + 게이트 리포트
 *   --skeleton    EN TM 스켈레톤 생성/갱신(기존 값 보존 + 선행 WO TM seed 병합)
 *   --en          TM 으로 EN 조립 + renderEnV4 검증 → en payload + 리포트
 *
 * EN 은 문장 1:1 번역메모리로만 만든다. 원문에 없는 의료사실 생성 0. 미등록 문장은 커버리지 실패.
 */
import fs from 'node:fs';
import path from 'node:path';
import { WO, DATA_DIR, md5, CONTENT_SECTIONS } from './otc-v4-master-leaflet-contract.ga.js';
import { composeKoV4, renderEnV4, enFormLabel, type MasterIdentity } from './otc-v4-master-leaflet-composer.ga.js';
import { toPlain, type EnV3Payload } from './otc-v3-content-leaflet-composer.na.js';

const PREP = path.join(DATA_DIR, 'otc-v4-pilot-100-prep.ga.json');
const SOURCE = path.join(DATA_DIR, 'otc-v4-pilot-100-source.ga.json');
const TM = path.join(DATA_DIR, 'otc-v4-pilot-100-tm.ga.json');
const SEED_TM = path.join(DATA_DIR, 'otc-easy-drug-ready-oral-v3-tm.da.json');
const OUT_KO = path.join(DATA_DIR, 'otc-v4-pilot-100-ko-payload.ga.json');
const OUT_EN = path.join(DATA_DIR, 'otc-v4-pilot-100-en-payload.ga.json');
const OUT_REPORT = path.join(DATA_DIR, 'otc-v4-pilot-100-author-report.ga.json');
const has = (k: string): boolean => process.argv.includes(`--${k}`);

const SEC_TO_FIELD: Record<string, keyof EnV3Payload> = {
  '효능·효과': 'efficacy', '용법·용량': 'usage', '경고': 'warning',
  '사용상 주의사항': 'precaution', '이상반응': 'adverse', '상호작용': 'interaction',
};

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
  const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-ledger-v1.json'), 'utf8'));
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
  fs.writeFileSync(OUT_KO, JSON.stringify({ wo: WO, kind: 'ko-payload', total: payloads.length, payloads }, null, 2) + '\n', 'utf8');
  const byRoute: Record<string, number> = {};
  for (const p of payloads) byRoute[p.route] = (byRoute[p.route] || 0) + 1;
  console.log(JSON.stringify({ mode: 'ko', targets: targets.length, composed: payloads.length, blocked: blocked.length, byRoute, blockedDetail: blocked }, null, 2));
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
  const seed = loadTmEntries(SEED_TM);
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
  let fromSeed = 0;
  for (const k of keys) {
    const v = existing[k] || seed[k] || '';
    if (!existing[k] && seed[k]) fromSeed++;
    entries[k] = v;
    const m = meta.get(k)!;
    annotations[k] = { count: m.count, masters: m.masters.size, routes: [...m.routes].sort(), section: m.section, from: existing[k] ? 'v4' : seed[k] ? 'seed-oral-v3' : '' };
  }
  const filled = keys.filter((k) => entries[k]).length;
  fs.writeFileSync(TM, JSON.stringify({
    wo: WO, agent: 'ga', kind: 'sentence-translation-memory',
    note: '문장 1:1 KO→EN 번역만. 공식 원문에 없는 의료사실 생성 금지. 수치·연령·기간 보존. 한글 잔존 금지.',
    total: keys.length, filled, annotations, entries,
  }, null, 2) + '\n', 'utf8');
  // route 별 미충족 문장 수
  const pendingByRoute: Record<string, number> = {};
  for (const k of keys) if (!entries[k]) for (const rt of annotations[k].routes) pendingByRoute[rt] = (pendingByRoute[rt] || 0) + 1;
  console.log(JSON.stringify({ mode: 'skeleton', uniqueSentences: keys.length, filled, fromSeed, pending: keys.length - filled, pendingByRoute }, null, 2));
}

function runEn(): void {
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
    const koSum = koBy.get(r.masterId).summary as string;
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
    void koSum;
    for (const k of Object.keys(payload.summaryTable)) if (!payload.summaryTable[k]) delete payload.summaryTable[k];
    const res = renderEnV4(payload, m.route, sec['용법·용량'] || '');
    if (res.anomalies.length) { anomalies.push({ masterId: r.masterId, issues: res.anomalies }); continue; }
    payloads.push({
      masterId: r.masterId, route: m.route, title,
      summary: payload.summaryTable['How it works'],
      contentHash: md5(res.html), content: res.html,
    });
  }
  fs.writeFileSync(OUT_EN, JSON.stringify({ wo: WO, kind: 'en-payload', total: payloads.length, payloads }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_REPORT, JSON.stringify({
    wo: WO, mode: 'en', composed: payloads.length, blocked: anomalies.length,
    tmMissingUnique: missing.size, missingSample: [...missing].slice(0, 30), anomalies,
  }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ mode: 'en', composed: payloads.length, blocked: anomalies.length, tmMissingUnique: missing.size, anomalySample: anomalies.slice(0, 10) }, null, 2));
}

if (has('ko')) runKo();
else if (has('skeleton')) runSkeleton();
else if (has('en')) runEn();
else { console.error('mode 필요: --ko | --skeleton | --en'); process.exit(1); }
