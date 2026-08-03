/** 조합 결과 표본 점검 (offline). */
import fs from 'node:fs';
import { zh } from './hff-zh-b01-translate.mjs';
const P = JSON.parse(fs.readFileSync('apps/api-server/src/scripts/data/hff-zh-b01-phrases-v1.json', 'utf8'));
const want = process.argv[2] ?? 'compose';
const min = parseInt(process.argv[3] ?? '60', 10);
let n = 0;
for (const p of P.phrases) {
  const r = zh(p.kind, p.text);
  if (!r || !String(r.how).startsWith(want) || p.docFreq < min) continue;
  console.log(`${p.docFreq}\t${p.kind} | ${p.text}\n\t=> ${r.zh}`);
  if (++n >= 45) break;
}
