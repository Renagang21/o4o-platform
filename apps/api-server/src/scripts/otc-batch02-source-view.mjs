import { readFileSync, writeFileSync } from 'node:fs';
const j = JSON.parse(readFileSync('C:\\tmp\\otc-b02-source.json', 'utf8'));
function uniq(arr, key) { const m = new Map(); for (const r of arr) { const t = r[key] || '(null)'; m.set(t, (m.get(t) || 0) + 1); } return [...m.entries()]; }
let out = '';
out += '=== 알파칼시돌 easydrug 효능원문 distinct ===\n';
for (const [t, c] of uniq(j.alphacalcidol, 'easydrugText')) out += `[${c}건] ${String(t).slice(0, 300)}\n\n`;
out += '\n=== 알파칼시돌 summary distinct ===\n';
for (const [t, c] of uniq(j.alphacalcidol, 'summary')) out += `[${c}건] ${t}\n`;
out += '\n\n=== 아르기닌 easydrug 효능원문 distinct ===\n';
for (const [t, c] of uniq(j.arginine, 'easydrugText')) out += `[${c}건] ${String(t).slice(0, 600)}\n\n`;
out += '\n=== 아르기닌 draft content_json ===\n' + JSON.stringify(j.arginineDraft[0].content, null, 1) + '\nfp=' + j.arginineDraft[0].fp + '\n';
writeFileSync('C:\\tmp\\otc-b02-source-view.txt', out, 'utf8');
console.log('written', out.length);
