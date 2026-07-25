// WO-O4O-OTC-REMAINING-READY-SHARD-DA-V2-LIVE-APPLY-V1 — 저작 파트 원문 출력 (에이전트 다).
// read-only · DB 미접속 · write 0. authoring-source-full.da.json 의 [from,to) 구간을 사람이 읽는 형태로 출력한다.
// Usage(apps/api-server): node src/scripts/otc-v2-emit-part.da.mjs <from> <to>
import fs from 'node:fs';

const full = JSON.parse(fs.readFileSync('src/scripts/data/otc-v2-authoring-source-full.da.json', 'utf8'));
const from = parseInt(process.argv[2] || '0', 10);
const to = parseInt(process.argv[3] || String(from + 20), 10);
for (const [i, g] of full.groups.slice(from, to).entries()) {
  console.log(`\n===== #${from + i} fp=${g.fp} gencode=${g.gencode} route=${g.route} form=${g.form} size=${g.size}`);
  console.log(`--IND--\n${g.official.indication}`);
  console.log(`--DOS--\n${g.official.dosage}`);
  console.log(`--CAU--\n${g.official.caution}`);
}
console.log(`\n[TOTAL ${full.groups.length} groups · emitted ${from}..${Math.min(to, full.groups.length) - 1}]`);
