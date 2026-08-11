/** 지속 가능한 수집 속도를 실측한다. 차단 우회가 아니라 **속도를 낮추기 위한** 측정이다. */
import fs from 'node:fs';
import { fetchText, mapPool, rateStats } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/lib.mjs';

const gaps = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/gap-population.json', 'utf8'));
const musinsa = gaps.filter((g) => g.sources.some((s) => s.source === 'MUSINSA_BEAUTY'));

async function trial(label, conc, delay, n, offset) {
  Object.assign(rateStats, { requests: 0, throttled: 0, dead: 0, failed: 0 });
  const picks = Array.from({ length: n }, (_, k) => musinsa[(offset + k * 37) % musinsa.length]);
  const t0 = Date.now();
  let ok = 0;
  await mapPool(
    picks,
    conc,
    async (g) => {
      const s = g.sources.find((x) => x.source === 'MUSINSA_BEAUTY');
      try {
        const html = await fetchText(`https://www.musinsa.com/products/${s.id}`, { Referer: 'https://www.musinsa.com/' });
        if (html) ok += 1;
      } catch {
        /* 실패는 rateStats 에 남는다 */
      }
    },
    delay,
  );
  const sec = (Date.now() - t0) / 1000;
  console.log(
    `${label}: conc=${conc} delay=${delay}ms n=${n} → ok=${ok} throttled=${rateStats.throttled} failed=${rateStats.failed} dead=${rateStats.dead} ${sec.toFixed(1)}s (${(n / sec).toFixed(2)} req/s)`,
  );
}

await trial('T1', 1, 400, 20, 1);
await trial('T2', 2, 400, 20, 500);
await trial('T3', 3, 300, 30, 1500);
