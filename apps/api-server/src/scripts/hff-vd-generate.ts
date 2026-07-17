/**
 * 비타민 D 단일형 — 생성 드라이버 (compose + Guard 전수, read-only DB)
 *   npx tsx src/scripts/hff-vd-generate.ts --start 0 --count 30 --prefix vdn --pad 2 \
 *        --out <json> --drafts <dir>
 * vd-pool.json 슬라이스를 composeVd 로 작성 → runGuard 전수 → json(가드입력) + html 저장 + 통계.
 * DB write 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { composeVd, toGuardInput, type VdSeed } from './hff-vd-compose.js';

const SCR = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/2b5935f9-9c75-483f-8206-e3385235d4d4/scratchpad';
const arg = (n: string, d?: string): string => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : (d ?? '');
};

const start = parseInt(arg('start', '0'), 10);
const count = parseInt(arg('count', '30'), 10);
const prefix = arg('prefix', 'vdn');
const pad = parseInt(arg('pad', '2'), 10);
const outJson = arg('out', `${SCR}/${prefix}.json`);
const draftsDir = arg('drafts', `${SCR}/${prefix}-drafts`);
const writeHtml = arg('html', '1') === '1';

const pool = JSON.parse(fs.readFileSync(`${SCR}/vd-pool.json`, 'utf8')) as VdSeed[];
const slice = pool.slice(start, start + count);
fs.mkdirSync(draftsDir, { recursive: true });

const inputs: ReturnType<typeof toGuardInput>[] = [];
let pass = 0, review = 0, blocked = 0;
const ruleHits: Record<string, number> = {};
const flagged: string[] = [];

slice.forEach((seed, i) => {
  const slug = `${prefix}-${String(start + i + 1).padStart(pad, '0')}`;
  const gi = toGuardInput(seed, slug);
  inputs.push(gi);
  const r = runGuard(gi, { phase: 'all' });
  if (r.overallStatus === 'BLOCKED') blocked++;
  else if (r.overallStatus === 'REVIEW_REQUIRED') review++;
  else pass++;
  const risk = r.findings.filter((f) => f.status === 'BLOCKED' || f.status === 'REVIEW_REQUIRED');
  for (const f of risk) ruleHits[`${f.ruleId}:${f.status}`] = (ruleHits[`${f.ruleId}:${f.status}`] ?? 0) + 1;
  if (risk.length) {
    flagged.push(`${slug} | ${String(seed.productName).slice(0, 26)} | ${r.overallStatus}`);
    for (const f of risk.slice(0, 4)) flagged.push(`     ${f.status} ${f.ruleId} [${f.language}] "${String(f.matchedText ?? '').slice(0, 40)}"`);
  }
  if (writeHtml) {
    const { ko, en } = composeVd(seed);
    fs.writeFileSync(path.join(draftsDir, `${slug}.ko.html`), ko + '\n');
    fs.writeFileSync(path.join(draftsDir, `${slug}.en.html`), en + '\n');
  }
});

fs.writeFileSync(outJson, JSON.stringify(inputs, null, 1));

console.log(`═══ 비타민 D 생성 [${prefix}] start=${start} count=${slice.length} ═══\n`);
console.log(`PASS ${pass} · REVIEW ${review} · BLOCKED ${blocked}`);
console.log(`위험 rule 분포:`, JSON.stringify(ruleHits));
if (flagged.length) { console.log('\n=== 위험 신호 상세 ==='); flagged.forEach((l) => console.log(l)); }
else console.log('위험 신호 없음(BLOCKED·REVIEW 0)');
console.log(`\n→ ${outJson} (${inputs.length}) · drafts ${writeHtml ? draftsDir : '(skip)'}`);
