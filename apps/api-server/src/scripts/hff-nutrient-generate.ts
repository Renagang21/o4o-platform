/**
 * HFF 단일 영양소 — 생성 드라이버 (compose + Guard 전수, read-only DB)
 *   npx tsx src/scripts/hff-nutrient-generate.ts --pool <pool.json> --prefix zn --pad 3 --out <json> --drafts <dir>
 * DB write 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { composeNutrient, toGuardInput, type NSeed } from './hff-nutrient-compose.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const POOL = arg('pool'); const PREFIX = arg('prefix', 'n'); const PAD = parseInt(arg('pad', '3'), 10);
const OUT = arg('out'); const DRAFTS = arg('drafts'); const HTML = arg('html', '1') === '1';
const START = parseInt(arg('start', '0'), 10); const COUNT = parseInt(arg('count', '100000'), 10);
if (!POOL || !OUT) throw new Error('--pool, --out 필요');

const pool = JSON.parse(fs.readFileSync(POOL, 'utf8')) as NSeed[];
const slice = pool.slice(START, START + COUNT);
if (HTML && DRAFTS) fs.mkdirSync(DRAFTS, { recursive: true });

const inputs: ReturnType<typeof toGuardInput>[] = [];
let pass = 0, review = 0, blocked = 0; const ruleHits: Record<string, number> = {}; const flagged: string[] = [];
slice.forEach((seed, i) => {
  const slug = `${PREFIX}-${String(START + i + 1).padStart(PAD, '0')}`;
  const gi = toGuardInput(seed, slug); inputs.push(gi);
  const r = runGuard(gi, { phase: 'all' });
  if (r.overallStatus === 'BLOCKED') blocked++; else if (r.overallStatus === 'REVIEW_REQUIRED') review++; else pass++;
  const risk = r.findings.filter((f) => f.status === 'BLOCKED' || f.status === 'REVIEW_REQUIRED');
  for (const f of risk) ruleHits[`${f.ruleId}:${f.status}`] = (ruleHits[`${f.ruleId}:${f.status}`] ?? 0) + 1;
  if (risk.length) { flagged.push(`${slug} | ${String(seed.productName).slice(0, 24)} | ${r.overallStatus}`); for (const f of risk.slice(0, 4)) flagged.push(`     ${f.status} ${f.ruleId} [${f.language}] "${String(f.matchedText ?? '').slice(0, 40)}"`); }
  if (HTML && DRAFTS) { const { ko, en } = composeNutrient(seed); fs.writeFileSync(path.join(DRAFTS, `${slug}.ko.html`), ko + '\n'); fs.writeFileSync(path.join(DRAFTS, `${slug}.en.html`), en + '\n'); }
});
fs.writeFileSync(OUT, JSON.stringify(inputs, null, 1));
console.log(`[${PREFIX}] count ${slice.length}: PASS ${pass} · REVIEW ${review} · BLOCKED ${blocked}`);
console.log(`위험 rule: ${JSON.stringify(ruleHits)}`);
if (flagged.length) flagged.forEach((l) => console.log(l)); else console.log('위험 신호 없음');
console.log(`→ ${OUT} (${inputs.length})${HTML && DRAFTS ? ` · drafts ${DRAFTS}` : ''}`);
