/** 남은 후보 원천 접근성 실측 (차단 여부만 확인, 우회하지 않는다). */
import { fetchText } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/lib.mjs';

const CANDS = [
  ['glowpick search', 'https://www.glowpick.com/search/result?keyword=%EC%84%A0%ED%81%AC%EB%A6%BC'],
  ['glowpick api', 'https://api.glowpick.com/api/v1/products?keyword=selfie'],
  ['oliveyoung global search', 'https://global.oliveyoung.com/display/search?query=toner'],
  ['naver shopping', 'https://search.shopping.naver.com/search/all?query=%ED%86%A0%EB%84%88'],
  ['mfds nedrug list', 'https://nedrug.mfds.go.kr/pbp/CCBDC01/getList?page=1&limit=10&sortOrder=false'],
];
for (const [label, url] of CANDS) {
  try {
    const t = await fetchText(url, {}, 0);
    console.log(`${label}: ${t == null ? '404' : `len=${t.length}`}`);
  } catch (e) {
    console.log(`${label}: ${String(e.message).slice(0, 70)}`);
  }
}
