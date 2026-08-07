/**
 * WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1 — 소스 C: Olive Young Global
 *
 * 공개 best-seller JSON 만 사용한다. 실측(2026-08-07):
 *   - limit/offset/page 파라미터를 바꿔도 **항상 동일한 상위 100건**만 반환한다 → 확장 불가
 *   - 브랜드 목록 페이지(`/display/page/brand`) 및 브랜드 API 는 **HTTP 403** → 우회하지 않는다
 *   - Olive Young Korea 는 파일럿과 동일하게 403
 *
 * 규모는 작지만 **한국어명 ↔ 공식 영문명 쌍을 주는 유일한 소스**라 영문명 축으로 유지한다.
 *
 * 산출: tmp/cosmetics-retail-census/source-oliveyoung-global.json
 */
import { fetchJson, fetchText, writeOut } from './lib.mjs';

const Q = 'curLangCode=en&langCode=en&mrgnCntryCode=9999&dlvCntryCode=1230&showSoldoutProduct=true';
const BEST = `https://global.oliveyoung.com/display/product/best-seller/order-best?${Q}&limit=100`;
const H = { Referer: 'https://global.oliveyoung.com/' };

/** 차단 여부를 사실대로 기록하기 위해 확인만 하고, 우회는 하지 않는다. */
async function probeBlocked(url) {
  try {
    await fetchText(url, H, 0);
    return null;
  } catch (e) {
    return String(e.message).startsWith('BLOCKED') ? e.message : `실패: ${e.message}`;
  }
}

async function main() {
  const t0 = Date.now();
  const raw = await fetchJson(BEST, H);
  const list = Array.isArray(raw) ? raw : (raw.data ?? []);

  const products = list.map((p) => ({
    source: 'OLIVEYOUNG_GLOBAL_BEST',
    sourceProductId: p.prdtNo ? String(p.prdtNo) : null,
    sourceUrl: `https://global.oliveyoung.com/product/detail?prdtNo=${p.prdtNo}`,
    brandName: p.korBrandName || p.brandName || null,
    rawProductName: p.korPrdtName || p.prdtName || '',
    canonicalProductName: null,
    englishProductName: p.prdtName || null,
    category: null,
    raw: { englishBrandName: p.brandName ?? null },
  }));

  const blockedBrand = await probeBlocked('https://global.oliveyoung.com/display/page/brand');
  const blockedKorea = await probeBlocked('https://www.oliveyoung.co.kr/store/main/main.do');

  writeOut('source-oliveyoung-global.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1',
      source: 'OLIVEYOUNG_GLOBAL_BEST',
      uniqueProducts: products.length,
      withEnglishName: products.filter((p) => p.englishProductName).length,
      limitations: {
        paging: 'limit/offset/page 무시 — 상위 100건 고정 (실측)',
        brandTraversal: blockedBrand ?? '접근 가능',
        oliveYoungKorea: blockedKorea ?? '접근 가능',
        policy: '차단 소스는 우회하지 않는다',
      },
      elapsedSec: Math.round((Date.now() - t0) / 1000),
    },
    products,
  });
  process.stderr.write(`OY Global ${products.length}건 (영문명 ${products.filter((p) => p.englishProductName).length})\n`);
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.stack ?? e}\n`);
  process.exit(1);
});
