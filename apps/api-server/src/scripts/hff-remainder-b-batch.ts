/**
 * READ-ONLY — harvest 산출에서 stmt-shard1 fresh 만 골라 combo generate → 통합 target. DB write 0.
 *   npx tsx src/scripts/hff-remainder-b-batch.ts --harvest <dir> --produced <json> --out <dir> [--max 1000]
 *
 * WO-O4O-HFF-REMAINDER-BULK-PRODUCTION-B-V1. 기존 정본(composeCombo+runComboGuard+runGuard) 재사용, 복제 0.
 * 개별 실패(HOLD)는 기록 후 계속 — 예외 수리 없음.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { composeCombo, runComboGuard, toGuardInput, type ComboSeed } from './hff-combo-compose.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const H = arg('harvest'); const PRODUCED = arg('produced'); const OUT = arg('out'); const MAX = parseInt(arg('max', '1000'), 10);
if (!H || !OUT || !PRODUCED) throw new Error('--harvest --produced --out 필요');
fs.mkdirSync(OUT, { recursive: true });
function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const produced = new Set(JSON.parse(fs.readFileSync(PRODUCED, 'utf8')) as string[]);

const sigDir = path.join(H, 'sig');
const files = fs.readdirSync(sigDir).filter((f) => f.endsWith('.json'));
const target: unknown[] = []; const holds: Array<{ statementNo: string; sig: string; reason: string }> = [];
let scannedSeeds = 0, shard1 = 0, pass = 0, review = 0; const bySig: Record<string, number> = {}; const holdRe: Record<string, number> = {};
outer:
for (const f of files) {
  let seeds: ComboSeed[];
  try { seeds = JSON.parse(fs.readFileSync(path.join(sigDir, f), 'utf8')); } catch { continue; }
  for (const seed of seeds) {
    scannedSeeds++;
    const stmt = String(seed.statementNo).trim(); if (!stmt || produced.has(stmt)) continue;
    if (stableHash(stmt) % 3 !== 1) continue; shard1++;
    try {
      const { ko, en } = composeCombo(seed);
      const multi = runComboGuard(seed, ko, en);
      if (multi.length) { holds.push({ statementNo: stmt, sig: f, reason: `G-MULTI:${multi[0].rule}` }); holdRe[multi[0].rule] = (holdRe[multi[0].rule] ?? 0) + 1; continue; }
      const gi = toGuardInput(seed, `rem-b1-${target.length + 1}`);
      const g = runGuard(gi, { phase: 'all' });
      const blocked = g.findings.filter((x) => x.status === 'BLOCKED');
      if (blocked.length) { holds.push({ statementNo: stmt, sig: f, reason: `BLOCKED:${blocked[0].ruleId}` }); holdRe[blocked[0].ruleId] = (holdRe[blocked[0].ruleId] ?? 0) + 1; continue; }
      if (g.overallStatus === 'REVIEW_REQUIRED') {
        const rules = g.findings.filter((x) => x.status === 'REVIEW_REQUIRED').map((x) => x.ruleId);
        // batch3/4 정책: D-CLAIM-GROUNDED·E-NAME-DERIVED-GROUNDED 는 grounded 판정 → 포함. PRE-SRC·truncated 는 HOLD.
        const hard = rules.filter((r) => /PRE-SRC|TRUNCATED/i.test(r));
        if (hard.length) { holds.push({ statementNo: stmt, sig: f, reason: `REVIEW:${hard[0]}` }); holdRe[hard[0]] = (holdRe[hard[0]] ?? 0) + 1; continue; }
        review++;
      }
      pass++; bySig[f.replace(/\.json$/, '')] = (bySig[f.replace(/\.json$/, '')] ?? 0) + 1;
      target.push(gi);
      if (target.length >= MAX) break outer;
    } catch (e) { holds.push({ statementNo: stmt, sig: f, reason: `ERR:${(e as Error).message.slice(0, 40)}` }); }
  }
}
fs.writeFileSync(path.join(OUT, 'remainder-b1-target.json'), JSON.stringify(target, null, 1));
fs.writeFileSync(path.join(OUT, 'remainder-b1-holds.json'), JSON.stringify(holds, null, 1));
console.log('JSON_REM_BEGIN');
console.log(JSON.stringify({ sigFiles: files.length, scannedSeeds, shard1Fresh: shard1, targetPass: target.length, reviewIncluded: review, holds: holds.length, topHoldReasons: Object.entries(holdRe).sort((a, b) => b[1] - a[1]).slice(0, 8), topSigs: Object.entries(bySig).sort((a, b) => b[1] - a[1]).slice(0, 12) }, null, 2));
console.log('JSON_REM_END');
