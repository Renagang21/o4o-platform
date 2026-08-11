/** 판매명에 **이미 게시돼 있으나 추출되지 않은** 사실값을 유형별로 실측한다. */
import fs from 'node:fs';
import { extractCapacity } from '../../apps/api-server/src/scripts/cosmetics-guide-production/guide-core.mjs';

const gaps = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/gap-population.json', 'utf8'));
const fl = gaps.filter((g) => g.missing.mainFeatures);

// 1) 용량이 판매명에 보이는데 추출되지 않은 건
const capLike = /(\d[\d,]*(?:\.\d+)?)\s*(ml|mL|ML|g|kg|L|cc)(?![A-Za-z가-힣])/;
const missedCap = fl.filter((g) => g.sources.some((s) => capLike.test(s.rawProductName) && !extractCapacity(s.rawProductName)));
console.log('용량 표기가 있으나 미추출:', missedCap.length);
console.log(missedCap.slice(0, 10).map((g) => g.sources[0].rawProductName).join('\n'));

// 2) 세트/구성 표기
const setRe = /(\d+\s*종)|세트|기획|키트|듀오|듀얼|(\d+\s*개입)|(\d+\s*매입)|(\d+\s*팩)|택\s*\d|SET|set|PACK|pack/;
const setHits = fl.filter((g) => [g.productName, ...g.sources.map((s) => s.rawProductName)].some((n) => setRe.test(n)));
console.log('\n세트/구성 표기 보유:', setHits.length);
console.log(setHits.slice(0, 8).map((g) => g.sources[0].rawProductName).join('\n'));

// 3) 색상/호수(variants) 가 있는데 특징이 비어 있는 건 — 렌더 계약상 있으면 이미 나왔어야 한다
console.log('\n(참고) featureless 총계:', fl.length);
