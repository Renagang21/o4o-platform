/**
 * HFF producible universe 스캔 — 제품별 exact full-set signature + statementNo emit. read-only, DB write 0.
 *   PROXY_PORT=5442 DB_USERNAME=.. DB_PASSWORD=.. DB_NAME=.. npx tsx src/scripts/hff-combo-universe-scan.ts --lo 2 --hi 8 --out <path>
 *
 * select 와 동일한 hardened 파서(hff-source-parse.parseSpecs)로 각 제품의 exact 스펙 집합을 산출.
 * unknown 스펙 0 · size in [lo,hi] · 고형·비수출·비벌크만 → {sig, stmt} 배열 emit.
 * 조합별 clean/비승격 집계는 후처리(별도 promotion SQL)와 결합.
 */
import '../env-loader.js';
import fs from 'node:fs';
import { parseSpecs } from './hff-source-parse.js';
import { isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { resolveSource, type HffRawItem } from './hff-raw-source.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const LO = parseInt(arg('lo', '2'), 10); const HI = parseInt(arg('hi', '8'), 10); const OUT = arg('out');
if (!OUT) throw new Error('--out 필요');

function isLiquidDrop(name: string, sungsang: string, srv: string): boolean {
  const t = `${name} ${sungsang}`;
  if (/액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상/.test(t)) return true;
  if (/\d\s*(?:방울|drop)/.test(srv)) return true;
  if (/\bmL\b|\bml\b|㎖/.test(sungsang)) return true;
  return false;
}

const rows: Array<{ sig: string; stmt: string }> = [];
let scanned = 0, kept = 0;
const src = resolveSource(process.argv, process.env, undefined);
for await (const it of src.gen as AsyncGenerator<HffRawItem>) {
  scanned++;
  const base = it.BASE_STANDARD ?? ''; const name = (it.PRDUCT ?? '').trim(); const srv = it.SRV_USE ?? ''; const sungsang = it.SUNGSANG ?? ''; const stmt = (it.STTEMNT_NO ?? '').trim();
  if (!stmt) continue;
  const { byKey, unknownLabels } = parseSpecs(base);
  if (unknownLabels.length > 0) continue;
  const keys = [...byKey.keys()];
  if (keys.length < LO || keys.length > HI) continue;
  if (isLiquidDrop(name, sungsang, srv)) continue;
  if (isBulkMaterial(srv).bulk) continue;
  if (/전량\s*수출|수출\s*전용|수출용|for\s*export/i.test(`${name} ${srv} ${sungsang}`)) continue;
  void normalizeSource;
  rows.push({ sig: keys.sort().join('+'), stmt });
  kept++;
}
fs.writeFileSync(OUT, JSON.stringify({ scanned, kept, rows }, null, 0));
console.log('JSON_UNIVERSE_BEGIN');
console.log(JSON.stringify({ scanned, kept, distinctSigs: new Set(rows.map((r) => r.sig)).size }, null, 1));
console.log('JSON_UNIVERSE_END');
