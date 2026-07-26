// WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-EN-AUTHORING-AND-VALIDATION-V1 — EN config 파트 병합 (에이전트 가).
//
// 공용 러너의 EN apply 는 `--en-config=<한 파일>` 을 읽고 eligible 전 fp 의 페이로드를 요구한다.
// 따라서 p01~p19 파트 저작본을 무변형 병합해 최종 EN JSON 1개를 만든다.
// 본문(title/efficacy/usage/caution/summaryTable)은 1 byte 도 바꾸지 않는다.
// read-only 입력 · DB 미접속 · write 는 병합 산출 파일 1개뿐 · 타임스탬프 없음(2회 실행 byte-identical).
//
// Usage(apps/api-server):
//   node src/scripts/otc-unit2-en-config-merge.ga.mjs
import fs from 'node:fs';
import path from 'node:path';

const DATA = 'src/scripts/data';
const OUT = path.join(DATA, 'otc-unit2-en-config-ga-all.json');
const EXPECTED_FP = 374;
const files = fs.readdirSync(DATA)
  .filter((f) => /^otc-unit2-en-config-ga-p\d+\.json$/.test(f)).sort();

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
if (groups.length !== EXPECTED_FP) throw new Error(`entries ${groups.length} !== ${EXPECTED_FP}`);

fs.writeFileSync(OUT, JSON.stringify({
  wo: 'WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-EN-AUTHORING-AND-VALIDATION-V1',
  unitId: 'oral-unit-2',
  note: '파트 저작본 무변형 병합(본문 미수정). apply 입력 전용. usageLabel 은 공용 러너가 주입한다.',
  parts: files, groups,
}, null, 1) + '\n', 'utf8');
console.log(`UNIT2-EN-CONFIG-MERGE ga — parts ${files.length} · entries ${groups.length} → ${OUT}`);
