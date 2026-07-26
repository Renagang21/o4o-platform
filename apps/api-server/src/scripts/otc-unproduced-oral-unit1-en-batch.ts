/**
 * WO-O4O-OTC-UNPRODUCED-ORAL-UNIT1-FINAL-PRODUCTION-V1 — Unit 1 EN 저작 보조 도구
 *
 * ⚠️ READ-ONLY · DB write 0. 저작 자체는 사람/모델이 하고, 이 도구는 **입력 제공과 검증**만 한다.
 *
 *  --dump --from=N --count=M   : 크기 내림차순 N번째부터 M개 그룹의 공식 원문을 출력(저작 입력)
 *  --status                    : 저작 진행 현황(부분 파일 누적 기준)
 *  --merge                     : parts/*.json 을 병합해 otc-unproduced-oral-unit1-en.json 생성 + 전건 검증
 *
 * 부분 저작 파일은 `src/scripts/data/unit1-en-parts/part-<NNN>.json` 에 누적한다.
 * 병합 시 fp 중복·미저작·렌더 게이트(한글 잔존·필수필드·수량 보존)를 전건 검사한다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { renderEn } from './otc-v2-store-leaflet-runner.shared.js';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT = path.join(DATA_DIR, 'otc-unproduced-oral-unit1-approved-ssot-v1.json');
const PARTS_DIR = path.join(DATA_DIR, 'unit1-en-parts');
const OUT = path.join(DATA_DIR, 'otc-unproduced-oral-unit1-en.json');
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');

interface EnEntry { fp: string; title: string; efficacy: string; usage: string; caution: string; summaryTable: Record<string, string> }

function load(): { groups: any[]; byMaster: Map<string, any> } {
  const j = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  const groups = [...j.groups].sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));
  return { groups, byMaster: new Map(j.masters.map((m: any) => [m.masterId, m])) };
}

function readParts(): Map<string, EnEntry> {
  const out = new Map<string, EnEntry>();
  if (!fs.existsSync(PARTS_DIR)) return out;
  for (const f of fs.readdirSync(PARTS_DIR).filter((x) => x.endsWith('.json')).sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(PARTS_DIR, f), 'utf8')) as { groups: EnEntry[] };
    for (const e of j.groups) {
      if (out.has(e.fp)) throw new Error(`fp 중복 저작 ${e.fp} (${f})`);
      out.set(e.fp, e);
    }
  }
  return out;
}

function dump(): void {
  const { groups, byMaster } = load();
  const from = parseInt(arg('from') || '0', 10);
  const count = parseInt(arg('count') || '20', 10);
  const done = readParts();
  const todo = groups.filter((g) => !done.has(g.fp));
  const slice = todo.slice(from, from + count);
  console.log(`# 저작 대상 ${slice.length} (미저작 ${todo.length} / 전체 ${groups.length})`);
  for (const g of slice) {
    const m = byMaster.get(g.masterIds[0]);
    console.log(`### ${g.fp} | ${g.form} | ${g.gencode} | ${g.size}m`);
    console.log(`E: ${m.official.indication}`);
    console.log(`U: ${m.official.dosage}`);
    console.log(`C: ${m.official.caution}`);
  }
}

function status(): void {
  const { groups } = load();
  const done = readParts();
  const doneM = groups.filter((g) => done.has(g.fp)).reduce((t, g) => t + g.size, 0);
  const totM = groups.reduce((t, g) => t + g.size, 0);
  console.log(`EN 저작 현황 — 그룹 ${done.size}/${groups.length} · master ${doneM}/${totM} · 남은 그룹 ${groups.length - done.size}`);
  const remain = groups.filter((g) => !done.has(g.fp));
  if (remain.length) console.log(`  남은 상위: ${remain.slice(0, 5).map((g) => `${g.fp}(${g.size}m)`).join(' ')}`);
}

function merge(): void {
  const { groups, byMaster } = load();
  const done = readParts();
  const missing = groups.filter((g) => !done.has(g.fp));
  const extra = [...done.keys()].filter((fp) => !groups.some((g) => g.fp === fp));
  const problems: string[] = [];
  if (extra.length) problems.push(`SSOT 밖 fp ${extra.length}건`);

  // 전건 렌더 게이트
  let rendered = 0;
  for (const g of groups) {
    const e = done.get(g.fp);
    if (!e) continue;
    const m = byMaster.get(g.masterIds[0]);
    const r = renderEn({ groupKey: g.fp, title: e.title, efficacy: e.efficacy, usage: e.usage,
      caution: e.caution, summaryTable: e.summaryTable }, 'oral', m.official.dosage);
    if (r.anomalies.length) problems.push(`[${g.fp}] ${r.anomalies.join('; ')}`);
    else rendered++;
  }

  console.log(`MERGE — 저작 ${done.size}/${groups.length} · 렌더 PASS ${rendered} · 미저작 ${missing.length} · 문제 ${problems.length}`);
  for (const p of problems.slice(0, 20)) console.log(`  ✗ ${p}`);
  if (missing.length) console.log(`  미저작 상위: ${missing.slice(0, 8).map((g) => `${g.fp}(${g.size}m)`).join(' ')}`);
  if (missing.length || problems.length) { console.log('  → 병합 파일 미생성(전건 저작·게이트 통과 후 생성).'); process.exitCode = 1; return; }

  const merged = { wo: 'WO-O4O-OTC-UNPRODUCED-ORAL-UNIT1-FINAL-PRODUCTION-V1', unitId: 'oral-unit-1',
    note: 'EN authored from the official MFDS e-drug-info Korean source. No new medical facts. Doses, ages, frequencies and durations preserved.',
    groups: groups.map((g) => done.get(g.fp)!) };
  fs.writeFileSync(OUT, JSON.stringify(merged, null, 1) + '\n', 'utf8');
  console.log(`  → ${OUT} (${merged.groups.length} 그룹)`);
}

function main(): void {
  if (process.argv.includes('--dump')) return dump();
  if (process.argv.includes('--status')) return status();
  if (process.argv.includes('--merge')) return merge();
  console.error('--dump --from=N --count=M | --status | --merge');
  process.exit(2);
}
main();
