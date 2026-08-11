import { fetchText } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/lib.mjs';

const ID = process.argv[2] ?? '3622141';
const CANDS = [
  ['legacy app page', `https://www.musinsa.com/app/goods/${ID}`],
  ['goods-detail + param', `https://goods-detail.musinsa.com/goods/${ID}?goodsSaleType=SALE`],
  ['api2 goods detail', `https://api.musinsa.com/api2/dp/v1/goods/${ID}/detail`],
  ['api2 goods info', `https://api.musinsa.com/api2/goods/${ID}`],
  ['display api', `https://display.musinsa.com/api/goods/${ID}`],
  ['goods api v1', `https://goods.musinsa.com/api2/goods/${ID}`],
];
for (const [label, url] of CANDS) {
  try {
    const t = await fetchText(url, { Referer: 'https://www.musinsa.com/' }, 0);
    if (t == null) {
      console.log(`${label}: 404`);
      continue;
    }
    const hit = ['전성분', '고시', '주요사양', '사용방법', '제조국'].filter((k) => t.includes(k));
    console.log(`${label}: len=${t.length} hits=[${hit.join(',')}]`);
  } catch (e) {
    console.log(`${label}: ${String(e.message).slice(0, 80)}`);
  }
}
