import fs from 'node:fs';
import { fetchText, UA } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/lib.mjs';

const gaps = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/gap-population.json', 'utf8'));
const g = gaps.filter((x) => x.missing.mainFeatures && x.sources.some((s) => s.source === 'HWAHAE_RANKING'))[5];
const s = g.sources.find((x) => x.source === 'HWAHAE_RANKING');
const bidHtml = await fetchText('https://www.hwahae.co.kr/rankings', {});
const bid = bidHtml.match(/"buildId":"([^"]+)"/)[1];
const path = new URL(s.url).pathname; // /products/{name}/{id}
console.log('path', path, 'bid', bid);

for (const [label, url] of [
  ['raw page', s.url],
  ['next data', `https://www.hwahae.co.kr/_next/data/${bid}${path}.json`],
]) {
  const res = await fetch(url, { headers: { ...UA, Referer: 'https://www.hwahae.co.kr/' } });
  const t = await res.text();
  console.log(`\n${label}: status=${res.status} len=${t.length}`);
  if (t.length) {
    fs.writeFileSync(`tmp/cosmetics-guide-gap-enrichment/probe-hwahae-${label.replace(/\s/g, '')}.txt`, t, 'utf8');
    const txt = t.replace(/<[^>]+>/g, ' ');
    console.log('  keys:', ['전성분', '용량', '기능성', '사용', '주의', '성분', 'capacity', 'ingredient'].filter((k) => txt.includes(k)).join(','));
    console.log('  head:', t.slice(0, 300).replace(/\s+/g, ' '));
  }
}
