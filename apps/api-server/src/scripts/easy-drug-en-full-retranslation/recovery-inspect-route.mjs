/** 진단용: 지정 master 의 사용 방법 섹션에서 KO route 표지와 EN 대응어를 대조한다 (write 0). */
import { streamKoUnits, loadTM, tmKey } from './tm-lib.mjs';
import { ROUTE_VERB, ROUTE_SECTIONS } from './en-frame.mjs';

const targets = new Set(process.argv.slice(2));
const tm = loadTM();
for (const ko of streamKoUnits()) {
  if (!targets.has(ko.masterId)) continue;
  console.log(`\n##### ${ko.masterId} (itemSeq ${ko.itemSeq})`);
  for (const s of ko.segments) {
    if (s.kind !== 'BODY' || !ROUTE_SECTIONS.includes(s.section)) continue;
    const hit = tm.get(tmKey(s.text));
    const keys = Object.keys(ROUTE_VERB).filter((k) => s.text.includes(k));
    const miss = keys.filter((k) => !ROUTE_VERB[k].some((w) => (hit?.en ?? '').toLowerCase().includes(w)));
    console.log(`- KO: ${s.text}`);
    console.log(`  EN: ${hit ? hit.en : '(TM MISS)'}`);
    console.log(`  hash=${tmKey(s.text)} koRoute=${JSON.stringify(keys)} unmatched=${JSON.stringify(miss)}`);
  }
  targets.delete(ko.masterId);
  if (!targets.size) break;
}
