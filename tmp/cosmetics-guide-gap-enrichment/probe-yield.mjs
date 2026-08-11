/** 특징 결손(featureless) 모집단에서 소스별 실제 확보율을 100건으로 실측한다. */
import fs from 'node:fs';
import { extractMusinsa } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/extract-core.mjs';
import { fetchText, mapPool } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/lib.mjs';

const gaps = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/gap-population.json', 'utf8'));
const featureless = gaps.filter((g) => g.missing.mainFeatures);
console.log('featureless =', featureless.length);

const which = process.argv[2] ?? 'musinsa';

if (which === 'musinsa') {
  const pool = featureless.filter((g) => g.sources.some((s) => s.source === 'MUSINSA_BEAUTY'));
  const N = 100;
  const picks = Array.from({ length: N }, (_, k) => pool[Math.floor((k * pool.length) / N)]);
  const stat = { pool: pool.length, sampled: N, table: 0, capacity: 0, spec: 0, usage: 0, ingredients: 0, functionalY: 0, noTable: 0, dead: 0 };
  const hits = [];
  await mapPool(
    picks,
    3,
    async (g) => {
      const s = g.sources.find((x) => x.source === 'MUSINSA_BEAUTY');
      let html;
      try {
        html = await fetchText(`https://www.musinsa.com/products/${s.id}`, { Referer: 'https://www.musinsa.com/' });
      } catch {
        stat.dead += 1;
        return;
      }
      if (html == null) return void (stat.dead += 1);
      const f = extractMusinsa(html);
      if (!f) return void (stat.noTable += 1);
      stat.table += 1;
      for (const k of ['capacity', 'spec', 'usage', 'ingredients']) if (f[k]) stat[k] += 1;
      if (/^Y$/i.test(f.functional ?? '')) stat.functionalY += 1;
      if (hits.length < 8) hits.push({ name: g.productName, capacity: f.capacity, spec: f.spec?.slice(0, 70), usage: f.usage?.slice(0, 50) });
    },
    350,
  );
  console.log(JSON.stringify(stat, null, 1));
  console.log(JSON.stringify(hits, null, 1));
}

if (which === 'hwahae') {
  const pool = featureless.filter((g) => g.sources.some((s) => s.source === 'HWAHAE_RANKING'));
  const bidHtml = await fetchText('https://www.hwahae.co.kr/rankings', {});
  const bid = bidHtml?.match(/"buildId":"([^"]+)"/)?.[1];
  console.log('pool =', pool.length, 'buildId =', bid);
  const N = 20;
  const picks = Array.from({ length: N }, (_, k) => pool[Math.floor((k * pool.length) / N)]);
  for (const g of picks.slice(0, 3)) {
    const s = g.sources.find((x) => x.source === 'HWAHAE_RANKING');
    console.log('\n--- url:', s.url);
    const html = await fetchText(s.url, {});
    if (html == null) {
      console.log('404');
      continue;
    }
    fs.writeFileSync(`tmp/cosmetics-guide-gap-enrichment/probe-hwahae-${s.id}.html`, html, 'utf8');
    const text = html.replace(/<[^>]+>/g, ' ');
    for (const k of ['전성분', '용량', '기능성', '사용법', '사용방법', '제조', '주의사항', '용법']) {
      console.log('  ', k.padEnd(6), text.includes(k) ? 'HIT' : 'miss');
    }
    console.log('   len', html.length);
  }
}
