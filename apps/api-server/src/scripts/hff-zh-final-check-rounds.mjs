/**
 * WO-O4O-HFF-ZH-ALL-REMAINING-10414-DIRECT-BULK-PRODUCTION-AND-TRACK-CLOSURE-V1  §4 / §6
 *
 * 저작 라운드 파일 전수 점검. 라운드를 얹을 때마다 실행한다.
 *   - lostNums: 원문 수치·단위 토큰이 번역에서 유실되지 않았는지 확인(§4 수치·단위 보존)
 *   - 번역 슬롯 한국어 0 (§6)
 *   - 빈 번역 0
 * 인자로 파일을 주지 않으면 data/hff-zh-b04-z*-translations-v1.json 전체를 본다.
 */
import fs from 'node:fs';
import { lostNums } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(D).filter((f) => /^hff-zh-b04-z\d+-translations-v1\.json$/.test(f)).map((f) => `${D}/${f}`);

let total = 0, bad = 0;
const problems = [];
for (const f of files) {
  const T = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const kind of Object.keys(T)) {
    for (const [ko, zh] of Object.entries(T[kind] ?? {})) {
      total++;
      if (!zh || !String(zh).trim()) { bad++; problems.push({ f, ko, why: 'EMPTY' }); continue; }
      if (/[가-힣]/.test(zh)) { bad++; problems.push({ f, ko, zh, why: 'HANGUL_LEFT' }); continue; }
      const lost = lostNums(ko, zh);
      if (lost.length) { bad++; problems.push({ f, ko, zh, why: 'NUMBER_LOST', lost }); }
    }
  }
}
console.log(JSON.stringify({ files: files.length, entries: total, bad, problems: problems.slice(0, 40) }, null, 1));
process.exit(bad ? 1 : 0);
