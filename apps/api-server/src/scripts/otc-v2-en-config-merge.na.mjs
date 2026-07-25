// WO-O4O-OTC-REMAINING-READY-SHARD-NA-V2-LIVE-APPLY-V1 — EN config 파트 병합 (에이전트 나).
//
// 공용 러너의 EN apply 는 `--en-config=<한 파일>` 을 읽고 eligible 전 fp 의 페이로드를 요구한다
// (runApply: `fp ... EN 저작 페이로드 부재 → 중지`). 따라서 파트별 저작본을 apply 직전에
// 무변형 병합한다. 본문(title/efficacy/usage/caution/summaryTable)은 1 byte 도 바꾸지 않는다.
// read-only 입력 · DB 미접속 · write 는 병합 산출 파일 1개뿐.
//
// Usage(apps/api-server):
//   node src/scripts/otc-v2-en-config-merge.na.mjs
import fs from 'node:fs';
import path from 'node:path';

const DATA = 'src/scripts/data';
const OUT = path.join(DATA, 'otc-v2-en-config-na-all.json');
const files = fs.readdirSync(DATA)
  .filter((f) => /^otc-v2-en-config-na-p\d+\.json$/.test(f)).sort();

const groups = [];
const seen = new Set();
for (const f of files) {
  const cfg = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  for (const e of cfg.groups) {
    if (seen.has(e.fp)) throw new Error(`fp 중복 ${e.fp} (${f})`);
    seen.add(e.fp);
    groups.push(e);
  }
}
if (groups.length !== 240) throw new Error(`entries ${groups.length} !== 240`);

fs.writeFileSync(OUT, JSON.stringify({
  wo: 'WO-O4O-OTC-REMAINING-READY-SHARD-NA-V2-LIVE-APPLY-V1', shard: 'na',
  note: '파트 저작본 무변형 병합(본문 미수정). apply 입력 전용.',
  parts: files, groups,
}, null, 1) + '\n', 'utf8');
console.log(`EN-CONFIG-MERGE na — parts ${files.length} · entries ${groups.length} → ${OUT}`);
