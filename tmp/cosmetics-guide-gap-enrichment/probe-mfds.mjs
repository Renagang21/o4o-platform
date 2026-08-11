/** 식약처 기능성화장품 보고 **상세** 페이지에 어떤 사실값이 있는지 실측한다. */
import fs from 'node:fs';
import { fetchText } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/lib.mjs';

const SEQ = process.argv[2] ?? '2026024677';
const urls = [
  ['getItem', `https://nedrug.mfds.go.kr/pbp/CCBDC01/getItem?cosmeticReportSeq=${SEQ}`],
  ['getItemDetail', `https://nedrug.mfds.go.kr/pbp/CCBDC01/getItemDetail?cosmeticReportSeq=${SEQ}`],
];
for (const [label, u] of urls) {
  try {
    const t = await fetchText(u, {}, 1);
    if (t == null) {
      console.log(`${label}: 404`);
      continue;
    }
    fs.writeFileSync(`tmp/cosmetics-guide-gap-enrichment/probe-mfds-${label}.html`, t, 'utf8');
    const text = t.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
    console.log(`\n=== ${label} len=${t.length} ===`);
    for (const k of ['효능', '효과', '기능성', '용법', '사용방법', '제형', '성분', '보고번호', '업체', '제품명']) {
      console.log('  ', k.padEnd(6), text.includes(k) ? 'HIT' : 'miss');
    }
    const i = text.indexOf('제품명');
    console.log(text.slice(Math.max(0, i - 100), i + 1400));
  } catch (e) {
    console.log(`${label}: ${String(e.message).slice(0, 90)}`);
  }
}
