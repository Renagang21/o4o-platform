/**
 * WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1 §8 — 소매 → 식약처 기능성 매칭
 *
 * 방향은 **소매 → 기능성** 이다. 기능성 보고를 모집단 출발점으로 쓰지 않는다.
 * 상품명이 명확히 같을 때만 연결하고, 애매하면 연결하지 않고 CHECK 로 둔다
 * ("잘못된 기능성 매칭보다 미매칭 유지가 낫다" — WO §8).
 *
 * 산출: tmp/cosmetics-retail-census/functional-match.json
 */
import { normalize } from '../cosmetics-census-pilot/normalize-core.mjs';
import { readOut, writeOut } from './lib.mjs';

const norm = (s) => normalize(s ?? '', null).core.replace(/\s+/g, '').toLowerCase();

/** 기능성 보고 제품명은 브랜드를 앞에 붙여 쓰는 일이 많다 → 브랜드 접두를 뗀 키도 함께 만든다. */
function keysForFunctional(name, brands) {
  const base = norm(name);
  const keys = new Set([base]);
  for (const b of brands) {
    if (b.length >= 2 && base.startsWith(b) && base.length - b.length >= 4) keys.add(base.slice(b.length));
  }
  return [...keys];
}

/** 기능성 심사 대상이 되는 유형인데 매칭이 안 되면 단순 미매칭이 아니라 확인 대상이다. */
const FUNCTIONAL_TYPES = new Set(['선케어', '염모제', '탈모케어']);

function main() {
  const retail = readOut('retail-unique-guide-candidates.json').candidates;
  const functional = readOut('functional-index.json').rows;

  const brands = new Set(
    retail.map((c) => (c.brandName ?? '').replace(/\s+/g, '').toLowerCase()).filter((b) => b.length >= 2),
  );

  // 기능성 index: 키 → 보고 목록
  const fIdx = new Map();
  const fRowKeys = new Array(functional.length);
  functional.forEach((r, i) => {
    const ks = keysForFunctional(r.productName, brands);
    fRowKeys[i] = ks;
    for (const k of ks) {
      if (!k) continue;
      if (!fIdx.has(k)) fIdx.set(k, []);
      fIdx.get(k).push(i);
    }
  });

  const hitRows = new Set();
  const results = [];
  const counts = { RETAIL_FUNCTIONAL_MATCHED: 0, RETAIL_NO_FUNCTIONAL_MATCH: 0, CHECK: 0 };

  for (const c of retail) {
    const brand = (c.brandName ?? '').replace(/\s+/g, '').toLowerCase();
    const core = c.canonicalProductName.replace(/\s+/g, '').toLowerCase();
    const tryKeys = [core, brand + core];
    let idxs = null;
    let usedKey = null;
    for (const k of tryKeys) {
      if (fIdx.has(k)) {
        idxs = fIdx.get(k);
        usedKey = k;
        break;
      }
    }

    let status;
    let note = null;
    if (idxs) {
      const companies = new Set(idxs.map((i) => functional[i].companyName));
      if (companies.size > 1) {
        status = 'CHECK';
        note = `동일 제품명 기능성 보고가 서로 다른 업체 ${companies.size}곳 — 같은 제품인지 판단 필요`;
      } else {
        status = 'RETAIL_FUNCTIONAL_MATCHED';
      }
      for (const i of idxs) hitRows.add(i);
    } else if (c.type && FUNCTIONAL_TYPES.has(c.type)) {
      status = 'CHECK';
      note = `기능성 심사 유형(${c.type})인데 상품명 기준 매칭 없음 — 표기 차이 가능`;
    } else {
      status = 'RETAIL_NO_FUNCTIONAL_MATCH';
    }
    counts[status] += 1;

    results.push({
      key: c.key,
      brandName: c.brandName,
      canonicalProductName: c.canonicalProductName,
      type: c.type,
      status,
      note,
      matchedKey: usedKey,
      functionalReports: idxs
        ? idxs.slice(0, 5).map((i) => ({
            reportSeq: functional[i].reportSeq,
            reportNo: functional[i].reportNo,
            productName: functional[i].productName,
            companyName: functional[i].companyName,
          }))
        : [],
      functionalReportCount: idxs ? idxs.length : 0,
    });
  }

  const functionalUnmatched = functional.length - hitRows.size;

  writeOut('functional-match.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1',
      direction: '소매 → 기능성 (기능성은 규제정보 보강축)',
      retailCandidates: retail.length,
      functionalRows: functional.length,
      RETAIL_FUNCTIONAL_MATCHED: counts.RETAIL_FUNCTIONAL_MATCHED,
      RETAIL_NO_FUNCTIONAL_MATCH: counts.RETAIL_NO_FUNCTIONAL_MATCH,
      CHECK: counts.CHECK,
      FUNCTIONAL_UNMATCHED: functionalUnmatched,
      matchRule: '정규화 코어 완전일치(브랜드 접두 유무 포함)만 연결. 부분일치·유사도 매칭은 하지 않는다.',
    },
    results,
  });

  process.stderr.write(
    `${JSON.stringify({ ...counts, FUNCTIONAL_UNMATCHED: functionalUnmatched }, null, 2)}\n`,
  );
}

main();
