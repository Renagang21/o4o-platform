/** 진단용: 지정 master 에서 KO 경고 표지를 가진 문장 중 EN 경고 표지가 없는 문장을 찾는다 (write 0). */
import { streamKoUnits, loadTM, tmKey } from './tm-lib.mjs';
import { WARNING_KO, WARNING_EN } from './en-frame.mjs';

const targets = new Set(process.argv.slice(2));
const tm = loadTM();
for (const ko of streamKoUnits()) {
  if (!targets.has(ko.masterId)) continue;
  console.log(`\n##### ${ko.masterId} (itemSeq ${ko.itemSeq})`);
  for (const s of ko.segments) {
    if (s.kind !== 'BODY') continue;
    const koHit = WARNING_KO.filter((w) => s.text.includes(w));
    if (!koHit.length) continue;
    const hit = tm.get(tmKey(s.text));
    const en = (hit?.en ?? '').toLowerCase();
    const enHit = WARNING_EN.filter((w) => en.includes(w));
    if (enHit.length) continue; // EN 도 경고 표지를 가지면 손실 아님
    console.log(`- KO: ${s.text}`);
    console.log(`  EN: ${hit ? hit.en : '(TM MISS)'}`);
    console.log(`  hash=${tmKey(s.text)} koWarn=${JSON.stringify(koHit)}`);
  }
  targets.delete(ko.masterId);
  if (!targets.size) break;
}
