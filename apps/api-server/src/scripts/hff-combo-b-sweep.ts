/**
 * Agent B 소유 — CLEAN_REGISTERED B-domain combo 서명 일괄 sweep (select → generate, DB write 0).
 *   공용 hff-combo-select / hff-combo-generate 는 미편집(read-only child process 호출).
 *   입력: <WD>/clean-b-sigs.json ([{sig:'A+B', free:n}]).  출력: <WD>/sweep/<slug>/{pool,target,drafts}.
 *   집계: <WD>/sweep-summary.json (sig, eligible, PASS, REVIEW, HOLD).
 *
 * 실행: PROXY_PORT=5442 DB_USERNAME=o4o_api DB_PASSWORD=... DB_NAME=o4o_platform WD=<dir> \
 *         npx tsx src/scripts/hff-combo-b-sweep.ts [--from N] [--to M] [--min-free K]
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const WD = process.env.WD;
if (!WD) throw new Error('WD env 필요');
const FROM = parseInt(arg('from', '0'), 10);
const TO = parseInt(arg('to', '100000'), 10);
const MIN_FREE = parseInt(arg('min-free', '1'), 10);
const SWEEP = path.join(WD, 'sweep');
fs.mkdirSync(SWEEP, { recursive: true });

type Sig = { sig: string; free: number };
const sigs: Sig[] = JSON.parse(fs.readFileSync(path.join(WD, 'clean-b-sigs.json'), 'utf8'));
const slugOf = (sig: string, i: number): string => `cb-${String(i).padStart(3, '0')}-${sig.replace(/\+/g, '_').replace(/[^0-9A-Za-z가-힣_]/g, '')}`.slice(0, 90);

const NODE = process.execPath;
const run = (script: string, a: string[]): string => execFileSync(NODE, ['--import', 'tsx', script, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
const summary: Array<Record<string, unknown>> = [];
const SELECT = 'src/scripts/hff-combo-select.ts';
const GENERATE = 'src/scripts/hff-combo-generate.ts';

for (let i = 0; i < sigs.length; i++) {
  if (i < FROM || i >= TO) continue;
  const { sig, free } = sigs[i];
  if (free < MIN_FREE) continue;
  const slug = slugOf(sig, i);
  const dir = path.join(SWEEP, slug);
  fs.mkdirSync(path.join(dir, 'drafts'), { recursive: true });
  const pool = path.join(dir, 'pool.json');
  const target = path.join(dir, 'target.json');
  const combo = sig.replace(/\+/g, ',');
  let eligible = 0, pass = 0, hold = 0, err = '';
  try {
    const sOut = run(SELECT, ['--combo', combo, '--exclude-taken', '--out', pool]);
    const m = sOut.match(/ELIGIBLE (\d+)/); eligible = m ? parseInt(m[1], 10) : 0;
    const poolArr = JSON.parse(fs.readFileSync(pool, 'utf8')) as unknown[];
    eligible = poolArr.length;
    if (eligible > 0) {
      const gOut = run(GENERATE, ['--pool', pool, '--prefix', slug, '--out', target, '--drafts', path.join(dir, 'drafts')]);
      const tArr = JSON.parse(fs.readFileSync(target, 'utf8')) as unknown[];
      pass = tArr.length;
      const holdFile = target.replace(/\.json$/, '.blocked-hold.json');
      hold = fs.existsSync(holdFile) ? (JSON.parse(fs.readFileSync(holdFile, 'utf8')) as unknown[]).length : 0;
      void gOut;
    }
  } catch (e) { err = e instanceof Error ? e.message.split('\n')[0].slice(0, 200) : String(e); }
  const row = { i, sig, slug, censusFree: free, eligible, PASS: pass, HOLD: hold, err };
  summary.push(row);
  console.log(`[${i}] ${sig} → eligible ${eligible} PASS ${pass} HOLD ${hold}${err ? ' ERR:' + err : ''}`);
  fs.writeFileSync(path.join(WD, 'sweep-summary.json'), JSON.stringify(summary, null, 1));
}
const totPass = summary.reduce((s, r) => s + (r.PASS as number), 0);
console.log(`\n=== SWEEP DONE: sigs ${summary.length} · total PASS ${totPass} ===`);
