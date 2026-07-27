/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1 — agent-da EN 저작·검증 파이프라인
 *
 * 결정론적 문장단위 번역메모리(TM) 방식:
 *   - KO source dump(otc-easy-drug-ready-oral-v3-ko-source-dump.da.json)의 fp별 공식 6섹션을 문장으로 분해.
 *   - 각 문장을 TM(otc-easy-drug-ready-oral-v3-tm.da.json: {ko문장 -> en문장})에서 조회해 EN 섹션을 조립.
 *   - 공식 원문에 없는 의료 사실 생성 0(TM은 문장 1:1 번역만). TM 미등록 문장은 커버리지 실패로 STOP.
 *   - fp별 EnV3Payload 조립 → renderEnV3 검증(한글 0 · 경구동사 0[oral 무] · 수치/연령/기간 보존).
 *
 * 모드:
 *   --skeleton : TM 스켈레톤 생성(미등록 문장을 빈 값으로, 등장 unit/횟수 태깅). 기존 TM 값은 보존(병합).
 *   (default)  : TM으로 EN 조립+검증. EN payload 파일 + 검증 리포트 출력.
 *   --unit=oral-unit-1 : 해당 unit fp만 처리(우선순위 처리용).
 *
 * DB 접근 없음(dump 파일만). 저작은 TM 파일 편집으로 수행.
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-en-author.da.ts --skeleton
 *   ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-en-author.da.ts [--unit=oral-unit-1]
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderEnV3, type EnV3Payload } from './otc-easy-drug-ready-oral-v3-composer.da.js';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const DUMP = path.join(DATA_DIR, 'otc-easy-drug-ready-oral-v3-ko-source-dump.da.json');
const TM = path.join(DATA_DIR, 'otc-easy-drug-ready-oral-v3-tm.da.json');
const OUT_PAYLOAD = path.join(DATA_DIR, 'otc-easy-drug-ready-oral-v3-en-payload.da.json');
const OUT_REPORT = path.join(DATA_DIR, 'otc-easy-drug-ready-oral-v3-en-report.da.json');
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const has = (k: string): boolean => process.argv.includes(`--${k}`);

const SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'] as const;
const SEC_TO_FIELD: Record<string, keyof EnV3Payload> = {
  '효능·효과': 'efficacy', '용법·용량': 'usage', '경고': 'warning',
  '사용상 주의사항': 'precaution', '이상반응': 'adverse', '상호작용': 'interaction',
};

/** 결정론적 문장 분해. 십진수(숫자.숫자) 미분할. 한글/닫는괄호 뒤 마침표를 경계로. 줄바꿈도 경계. */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  const marked = text.replace(/([가-힣)\]])\.(\s*)/g, '$1.');
  return marked.split(/[\n]+/).map((s) => s.trim()).filter(Boolean);
}

interface Rec { fp: string; unit: string; gencode: string; route: string; form: string; repName: string | null; official: Record<string, string>; }

/**
 * 경구 제형(KO) → EN 표준 제형명. 제목은 브랜드가 아니라 제형+일반명코드로 구성(content-fp representative).
 * na 형제 WO(otc-ready-na-v3)의 제형 제목 방식과 동일. 미등록 제형은 STOP(무단 생성 금지).
 */
const FORM_EN: Record<string, string> = {
  '정': 'tablet',
  '연질캡슐': 'soft capsule',
  '캡슐': 'capsule',
  '현탁액': 'suspension',
  '시럽': 'syrup',
  '장용정': 'enteric-coated tablet',
  '내복액': 'oral liquid',
  '서방정': 'extended-release tablet',
  '장용캡슐': 'enteric-coated capsule',
};

function loadTm(): Record<string, string> {
  if (!fs.existsSync(TM)) return {};
  const j = JSON.parse(fs.readFileSync(TM, 'utf8'));
  return j.entries || {};
}

function main(): void {
  const dump = JSON.parse(fs.readFileSync(DUMP, 'utf8'));
  const records: Rec[] = dump.records;
  const unitFilter = arg('unit');
  const recs = unitFilter ? records.filter((r) => r.unit === unitFilter) : records;

  if (has('skeleton')) {
    const existing = loadTm();
    const meta = new Map<string, { count: number; units: Set<string>; sample: string }>();
    for (const r of records) for (const k of SECTIONS) for (const s of splitSentences(r.official[k] || '')) {
      const m = meta.get(s) || { count: 0, units: new Set<string>(), sample: `${k}` };
      m.count++; m.units.add(r.unit); meta.set(s, m);
    }
    const keys = [...meta.keys()].sort();
    const entries: Record<string, string> = {};
    const annotations: Record<string, { count: number; units: string[]; filled: boolean }> = {};
    for (const k of keys) {
      entries[k] = existing[k] || '';
      const m = meta.get(k)!;
      annotations[k] = { count: m.count, units: [...m.units].sort(), filled: !!existing[k] };
    }
    const filled = keys.filter((k) => entries[k]).length;
    fs.writeFileSync(TM, JSON.stringify({
      wo: dump.wo, agent: 'da', kind: 'sentence-translation-memory',
      note: '문장 1:1 KO→EN 번역만. 공식 원문에 없는 의료사실 생성 금지. 수치·연령·기간 보존. 한글 잔존 금지.',
      total: keys.length, filled, annotations, entries,
    }, null, 2), 'utf8');
    console.log(`TM skeleton: ${keys.length} unique sentences, ${filled} filled (${keys.length - filled} pending)`);
    const u1 = new Set<string>(), u2 = new Set<string>();
    for (const [k, a] of Object.entries(annotations)) { if (a.units.includes('oral-unit-1')) u1.add(k); if (a.units.includes('oral-unit-2')) u2.add(k); }
    console.log(`  unit-1 needs ${u1.size} sentences · unit-2 needs ${u2.size} · shared ${[...u1].filter((x) => u2.has(x)).length}`);
    return;
  }

  // compose + validate
  const tm = loadTm();
  const missing = new Set<string>();
  const payloads: any[] = [];
  const anomalies: Array<{ fp: string; unit: string; issues: string[] }> = [];

  for (const r of recs) {
    const enSec: Record<string, string> = {};
    const issues: string[] = [];
    for (const k of SECTIONS) {
      const raw = r.official[k] || '';
      if (!raw) { enSec[k] = ''; continue; }
      const sents = splitSentences(raw);
      const en: string[] = [];
      for (const s of sents) {
        const t = tm[s];
        if (!t) { missing.add(s); en.push(`⟪MISSING⟫`); }
        else en.push(t);
      }
      enSec[k] = en.join(' ');
    }
    const enForm = FORM_EN[r.form];
    if (!enForm) { issues.push(`EN 미등록 제형(STOP): ${r.form}`); }
    const payloadNoLabel: Omit<EnV3Payload, 'usageLabel'> = {
      groupKey: r.fp,
      title: `${enForm || r.form} (${r.gencode})`,
      efficacy: enSec['효능·효과'], usage: enSec['용법·용량'],
      warning: enSec['경고'], precaution: enSec['사용상 주의사항'],
      adverse: enSec['이상반응'], interaction: enSec['상호작용'],
      summaryTable: {
        Category: 'OTC medicine',
        'Why this one': `Products sharing general-name code ${r.gencode} have the same ingredient, strength and form — check by ingredient, not by brand name.`,
      },
    };
    const rendered = renderEnV3(payloadNoLabel, r.route, r.official['용법·용량'] || '');
    if (rendered.anomalies.length) { issues.push(...rendered.anomalies); }
    if (issues.length) anomalies.push({ fp: r.fp, unit: r.unit, issues });
    payloads.push({ fp: r.fp, unit: r.unit, gencode: r.gencode, route: r.route, sourceRef: (dump.records.find((x: Rec) => x.fp === r.fp) as any)?.sourceRef, payload: payloadNoLabel, htmlLen: rendered.html.length });
  }

  const missingArr = [...missing].sort();
  const report = {
    wo: dump.wo, agent: 'da', unitFilter: unitFilter || 'ALL',
    fpProcessed: recs.length,
    tmFilled: Object.values(tm).filter(Boolean).length,
    missingSentences: missingArr.length,
    anomalyFps: anomalies.length,
    coverageComplete: missingArr.length === 0,
    validationClean: anomalies.length === 0,
    missingSample: missingArr.slice(0, 30),
    anomalies: anomalies.slice(0, 30),
  };
  fs.writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2), 'utf8');
  if (missingArr.length === 0 && anomalies.length === 0) {
    fs.writeFileSync(OUT_PAYLOAD, JSON.stringify({ wo: dump.wo, agent: 'da', unitFilter: unitFilter || 'ALL', count: payloads.length, payloads }, null, 2), 'utf8');
  }
  console.log('=== oral V3 EN author/validate ===');
  console.log(JSON.stringify({ ...report, missingSample: report.missingSample.length, anomalies: report.anomalies.length }, null, 2));
  if (missingArr.length) { console.log('MISSING (first 20):'); for (const s of missingArr.slice(0, 20)) console.log('  · ' + s.slice(0, 90)); }
  if (anomalies.length) { console.log('ANOMALIES (first 10):'); for (const a of anomalies.slice(0, 10)) console.log(`  ✗ ${a.fp} ${a.unit}: ${a.issues.join('; ')}`); }
  if (report.coverageComplete && report.validationClean) console.log(`EN READY → payload written (${payloads.length} fp)`);
}
main();
