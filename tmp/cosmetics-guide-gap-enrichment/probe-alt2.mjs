import { fetchText } from '../../apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/lib.mjs';

const KEYS = ['전성분', '고시', '주요사양', '사용방법', '제조국', '용량', '내용물의 용량', '기능성'];
async function probe(label, url, headers = {}) {
  try {
    const t = await fetchText(url, headers, 0);
    if (t == null) return console.log(`${label}: 404`);
    console.log(`${label}: len=${t.length} hits=[${KEYS.filter((k) => t.includes(k)).join(',')}]`);
    return t;
  } catch (e) {
    console.log(`${label}: ${String(e.message).slice(0, 90)}`);
    return null;
  }
}

// ── 화해 상세 (census 가 이미 sourceProductId 를 가지고 있다) ──
const bidHtml = await fetchText('https://www.hwahae.co.kr/rankings', {});
const bid = bidHtml?.match(/"buildId":"([^"]+)"/)?.[1];
console.log('hwahae buildId =', bid);
const HID = '1984011';
const t1 = await probe('hwahae next data', `https://www.hwahae.co.kr/_next/data/${bid}/products/x/${HID}.json`);
const t2 = await probe('hwahae product page', `https://www.hwahae.co.kr/products/x/${HID}`);
const t3 = await probe('hwahae api v2', `https://api.hwahae.co.kr/v2/products/${HID}`);

// ── 올리브영 ──
await probe('oliveyoung detail', 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000192672');
await probe('oliveyoung search', 'https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=%ED%86%A0%EB%A6%AC%EB%93%A0');
