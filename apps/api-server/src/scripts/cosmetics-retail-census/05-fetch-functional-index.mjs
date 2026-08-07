/**
 * WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1 §8 — 식약처 기능성화장품 보고 **전량 index**
 *
 * 파일럿과 같은 공개 목록(「기능성화장품제품정보(보고)」)을 쓰되, 이번에는 표본이 아니라
 * 상품명 매칭에 필요한 **목록 필드만** 전량 수집한다. 상세 페이지는 열지 않는다
 * (18만 건 상세 순회는 규모상 불필요하고 예의에도 어긋난다 — 매칭은 상품명 기준이다).
 *
 * 주의: 식약처는 **모집단의 출발점이 아니라 규제정보 보강축**이다 (WO §2·§8).
 *
 * 산출: tmp/cosmetics-retail-census/functional-index.json
 */
import { fetchText, mapPool, writeOut } from './lib.mjs';

const LIST = 'https://nedrug.mfds.go.kr/pbp/CCBDC01/getList';
const PAGE_SIZE = 500;

const stripTags = (s) =>
  s.replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(' ');

function parseList(html) {
  const rows = [];
  // 주석 안에도 <td> 템플릿이 있어 먼저 제거하지 않으면 컬럼이 한 칸씩 밀린다.
  const tbody = html.replace(/<!--[\s\S]*?-->/g, '').match(/<tbody[\s\S]*?<\/tbody>/);
  if (!tbody) return rows;
  for (const tr of tbody[0].match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const tds = (tr.match(/<td[\s\S]*?<\/td>/g) ?? []).map((t) => stripTags(t));
    const seq = tr.match(/cosmeticReportSeq=(\d+)/)?.[1];
    if (!seq || tds.length < 7) continue;
    rows.push({
      reportSeq: seq,
      reportNo: tds[1],
      productName: tds[2],
      companyName: tds[3],
      reportedAt: tds[4],
    });
  }
  return rows;
}

async function main() {
  const t0 = Date.now();
  const first = await fetchText(`${LIST}?page=1&limit=${PAGE_SIZE}&sortOrder=false`);
  const totalPages = Number(first.match(/id="totalPages" value="(\d+)"/)?.[1] ?? 0);
  if (!totalPages) throw new Error('STOP: totalPages 파싱 실패 — 목록 구조 변경 의심');
  process.stderr.write(`기능성 보고 전량 index: ${totalPages} 페이지 x ${PAGE_SIZE}\n`);

  const bySeq = new Map();
  for (const r of parseList(first)) bySeq.set(r.reportSeq, r);

  const rest = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  let done = 0;
  let failed = 0;
  await mapPool(rest, 3, async (p) => {
    try {
      for (const r of parseList(await fetchText(`${LIST}?page=${p}&limit=${PAGE_SIZE}&sortOrder=false`))) {
        bySeq.set(r.reportSeq, r);
      }
    } catch {
      failed += 1;
    }
    done += 1;
    if (done % 25 === 0) process.stderr.write(`  ${done}/${rest.length} pages, ${bySeq.size} rows\n`);
  });

  const rows = [...bySeq.values()];
  writeOut('functional-index.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1',
      source: 'MFDS_FUNCTIONAL_COSMETIC_REPORT_LIST',
      totalPages,
      pageSize: PAGE_SIZE,
      failedPages: failed,
      rows: rows.length,
      note: '목록 필드만 수집 (상세 미조회). 규제정보 보강축이며 모집단 출발점이 아니다.',
      elapsedSec: Math.round((Date.now() - t0) / 1000),
    },
    rows,
  });
  process.stderr.write(`기능성 index ${rows.length}건 (실패 페이지 ${failed})\n`);
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.stack ?? e}\n`);
  process.exit(1);
});
