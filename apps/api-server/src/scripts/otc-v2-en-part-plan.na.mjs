// WO-O4O-OTC-REMAINING-READY-SHARD-NA-V2-LIVE-APPLY-V1 — EN 저작 파트 분할 계획 + 원문 열람 (에이전트 나).
// read-only · DB 미접속 · write 0 (열람/계획 출력 전용).
//
// Usage(apps/api-server):
//   node src/scripts/otc-v2-en-part-plan.na.mjs            → 12파트 분할 요약
//   node src/scripts/otc-v2-en-part-plan.na.mjs 3          → p03 의 원문 전문 출력(무절단)
//   node src/scripts/otc-v2-en-part-plan.na.mjs 3 --fp=xx  → 특정 fp 만
import fs from 'node:fs';
import path from 'node:path';

const DATA = 'src/scripts/data';
const FULL = path.join(DATA, 'otc-v2-authoring-source-full.na.json');
const PART_SIZE = 20;

const full = JSON.parse(fs.readFileSync(FULL, 'utf8'));
/** 저작 파트 분할 SSOT — master 수 내림차순, 동수는 fp 사전순(결정적). */
export const ordered = full.groups.slice().sort((a, b) => b.size - a.size || a.fp.localeCompare(b.fp));
export const partOf = (n) => ordered.slice((n - 1) * PART_SIZE, n * PART_SIZE);
export const partCount = Math.ceil(ordered.length / PART_SIZE);

const argPart = process.argv[2] && /^\d+$/.test(process.argv[2]) ? parseInt(process.argv[2], 10) : null;
const onlyFp = (process.argv.find((a) => a.startsWith('--fp=')) || '').split('=')[1];

if (!argPart) {
  let tot = 0;
  for (let i = 1; i <= partCount; i++) {
    const p = partOf(i);
    const m = p.reduce((a, x) => a + x.size, 0);
    tot += m;
    const routes = {};
    for (const x of p) routes[x.route] = (routes[x.route] || 0) + 1;
    console.log(`p${String(i).padStart(2, '0')}  ${String(p.length).padStart(2)}fp ${String(m).padStart(4)}m  ${JSON.stringify(routes)}  cauMax=${Math.max(...p.map((x) => x.lens.cau))}`);
  }
  console.log(`TOTAL ${ordered.length} fp / ${tot} master`);
  const rt = {};
  for (const x of ordered) rt[x.route] = (rt[x.route] || 0) + 1;
  console.log(`routes ${JSON.stringify(rt)}`);
} else {
  const p = partOf(argPart).filter((g) => !onlyFp || g.fp === onlyFp);
  for (const g of p) {
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`FP ${g.fp} · gencode ${g.gencode} · route ${g.route} · form ${g.form} · ${g.size}m`);
    console.log(`── 효능·효과 ──\n${g.official.indication}`);
    console.log(`── 용법·용량 ──\n${g.official.dosage}`);
    console.log(`── 주의(경고+주의사항+상호작용+이상반응) ──\n${g.official.caution}`);
  }
  console.log(`\n(part ${argPart} · ${p.length} groups)`);
}
