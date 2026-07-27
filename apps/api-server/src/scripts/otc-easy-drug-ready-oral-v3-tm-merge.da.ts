/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1 — agent-da TM merge helper
 *
 * 번역 배치({lineNo: "English"})를 TM entries 에 병합한다. lineNo 는 빈도 desc + ko alpha 정렬 순서(1-based).
 * Korean 키를 재입력하지 않아 byte-불일치 위험 0. 배치 파일은 scratchpad 의 JSON.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-tm-merge.da.ts <batch.json>
 */
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const TM = path.join(DATA_DIR, 'otc-easy-drug-ready-oral-v3-tm.da.json');

function main(): void {
  const batchPath = process.argv[2];
  if (!batchPath) throw new Error('batch json path required');
  const j = JSON.parse(fs.readFileSync(TM, 'utf8'));
  const ann = j.annotations as Record<string, { count: number; units: string[] }>;
  const keys = Object.keys(j.entries).sort((a, b) => {
    const d = ann[b].count - ann[a].count; if (d) return d; return a.localeCompare(b);
  });
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8')) as Record<string, string>;
  let set = 0, skip = 0;
  const overwrites: string[] = [];
  for (const [lineStr, en] of Object.entries(batch)) {
    const idx = parseInt(lineStr, 10) - 1;
    if (idx < 0 || idx >= keys.length) throw new Error(`lineNo ${lineStr} out of range 1..${keys.length}`);
    if (typeof en !== 'string' || !en.trim()) { skip++; continue; }
    const key = keys[idx];
    if (j.entries[key] && j.entries[key] !== en) overwrites.push(`${lineStr}`);
    j.entries[key] = en;
    ann[key] && (j.annotations[key].filled = true);
    set++;
  }
  j.filled = keys.filter((k) => j.entries[k]).length;
  fs.writeFileSync(TM, JSON.stringify(j, null, 2), 'utf8');
  console.log(`merged batch: set ${set}, skipped-empty ${skip}, overwrites ${overwrites.length}${overwrites.length ? ' [' + overwrites.join(',') + ']' : ''}`);
  console.log(`TM filled ${j.filled}/${keys.length} (${keys.length - j.filled} pending)`);
}
main();
