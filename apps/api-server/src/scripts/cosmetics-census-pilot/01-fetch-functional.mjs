/**
 * WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0 — 단계 1: 기능성화장품 후보 500
 *
 * 출처: 식약처 의약품안전나라 공개 목록 「기능성화장품제품정보(보고)」
 *   목록 https://nedrug.mfds.go.kr/pbp/CCBDC01/getList
 *   상세 https://nedrug.mfds.go.kr/pbp/CCBDC01/getItem?cosmeticReportSeq={seq}
 * 공개 페이지이며 로그인·인증·차단우회를 하지 않는다.
 *
 * 표본: 유명제품 선별 금지 → **재현 가능한 계통 표본(systematic sample)**.
 *   전체 페이지를 균등 간격으로 SAMPLE_N 개 뽑아 각 페이지의 PAGE_SIZE 건을 전량 취한다.
 *   목록은 보고일자 내림차순이므로 균등 간격 = 보고 시점 전 구간에 고르게 분포한다.
 *
 * 산출: tmp/cosmetics-pilot/functional-candidates-500.json
 * 사용: node apps/api-server/src/scripts/cosmetics-census-pilot/01-fetch-functional.mjs
 */
import { UA, fetchText, mapPool, stripTags, writeOut } from './lib.mjs';

const LIST = 'https://nedrug.mfds.go.kr/pbp/CCBDC01/getList';
const ITEM = 'https://nedrug.mfds.go.kr/pbp/CCBDC01/getItem';
const PAGE_SIZE = 10;
const TARGET = 500;
const SAMPLE_N = TARGET / PAGE_SIZE; // 50 페이지

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
      businessType: tds[5],
      businessRegNo: tds[6],
    });
  }
  return rows;
}

/** 상세 페이지의 캡션 문구를 앵커로 삼아 값 셀만 뽑는다. */
function parseItem(html) {
  const out = { efficacy: null, usage: null, caution: null };
  const tables = html.match(/<table[\s\S]*?<\/table>/g) ?? [];
  for (const t of tables) {
    const cap = stripTags(t.match(/<caption[\s\S]*?<\/caption>/)?.[0] ?? '');
    const lines = stripTags(t.replace(/<caption[\s\S]*?<\/caption>/, ''))
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    // 첫 줄은 항상 헤더 라벨(효능효과/용법용량/사용상의주의사항) — 값만 남긴다.
    const value = lines.slice(1).join('\n').trim();
    if (cap.includes('효능효과 테이블')) out.efficacy = value || null;
    else if (cap.includes('용법용량 테이블')) out.usage = value || null;
    else if (cap.includes('주의사항 테이블')) out.caution = value || null;
  }
  return out;
}

/** 보고 데이터에만 근거한 결정 규칙 (외부 시장 확인은 별도 표본 검증 단계에서 수행) */
const NON_MARKET_PATTERNS = [
  { re: /수출용|수출\s*전용|for\s*export/i, note: '수출 전용 표기' },
  { re: /벌크|bulk|반제품/i, note: '벌크/반제품 표기' },
  { re: /시험용|테스트용|샘플용/i, note: '시험·샘플용 표기' },
  { re: /^[A-Z0-9\-_.]{2,}$/, note: '제품명이 코드성 문자열' },
];
/** 제품 식별 자체가 애매해 사람 판단이 필요한 신호 */
const AMBIGUOUS_PATTERNS = [
  { re: /(\d+)\s*호\b/, note: '색상/호수 표기 포함 — 단위 판단 필요' },
  { re: /\b(NO|No)\.?\s*\d+\b/, note: '호수 표기 포함 — 단위 판단 필요' },
  { re: /(웜톤|쿨톤|라이트|미디엄|딥|다크)\s*(베이지|톤)?/, note: '색상 계열 표기 포함' },
];

function decide(row, detail, dupNameCount) {
  const name = row.productName ?? '';
  for (const p of NON_MARKET_PATTERNS) {
    if (p.re.test(name)) return { candidateDecision: 'UNCONFIRMED', decisionNote: p.note };
  }
  if (!name.trim()) return { candidateDecision: 'UNCONFIRMED', decisionNote: '제품명 결측' };
  if (!detail.efficacy) {
    return { candidateDecision: 'UNCONFIRMED', decisionNote: '공식 효능효과 원문 없음 — grounding 불가' };
  }
  if (dupNameCount > 1) {
    return {
      candidateDecision: 'CHECK',
      decisionNote: `동일 제품명이 서로 다른 보고번호 ${dupNameCount}건 — 같은 제품인지 판단 필요`,
    };
  }
  for (const p of AMBIGUOUS_PATTERNS) {
    if (p.re.test(name)) return { candidateDecision: 'CHECK', decisionNote: p.note };
  }
  return { candidateDecision: 'TARGET', decisionNote: '식약처 보고 원문 + 효능효과 확보' };
}

async function main() {
  const t0 = Date.now();
  const first = await fetchText(`${LIST}?page=1&limit=${PAGE_SIZE}&sortOrder=false`);
  const totalPages = Number(first.match(/id="totalPages" value="(\d+)"/)?.[1] ?? 0);
  if (!totalPages) throw new Error('STOP: totalPages 파싱 실패 — 목록 구조 변경 의심');
  const totalCount = totalPages * PAGE_SIZE;
  process.stderr.write(`totalPages=${totalPages} (~${totalCount} 건) 에서 ${SAMPLE_N} 페이지 계통표본\n`);

  const pages = Array.from({ length: SAMPLE_N }, (_, k) =>
    Math.round((k * (totalPages - 1)) / (SAMPLE_N - 1)) + 1,
  );

  const grab = async (ps) =>
    (
      await mapPool(ps, 4, async (p) =>
        parseList(await fetchText(`${LIST}?page=${p}&limit=${PAGE_SIZE}&sortOrder=false`)),
      )
    ).flat();

  const bySeq = new Map();
  for (const r of await grab(pages)) bySeq.set(r.reportSeq, r);
  // 페이지 경계·중복 보고번호로 TARGET 에 못 미치면 미사용 페이지로 결정론적으로 보충한다.
  const used = new Set(pages);
  let probe = 2;
  while (bySeq.size < TARGET && probe <= totalPages) {
    if (!used.has(probe)) {
      used.add(probe);
      for (const r of await grab([probe])) bySeq.set(r.reportSeq, r);
    }
    probe += 37; // 고정 간격 — 재현 가능
  }
  const listed = [...bySeq.values()].slice(0, TARGET);
  process.stderr.write(`목록 수집 ${listed.length} 건 (조회 페이지 ${used.size})\n`);

  const nameCount = new Map();
  for (const r of listed) nameCount.set(r.productName, (nameCount.get(r.productName) ?? 0) + 1);

  let done = 0;
  const candidates = await mapPool(listed, 4, async (row) => {
    const url = `${ITEM}?cosmeticReportSeq=${row.reportSeq}`;
    let detail = { efficacy: null, usage: null, caution: null };
    let fetchError = null;
    try {
      detail = parseItem(await fetchText(url, UA, 2));
    } catch (e) {
      fetchError = String(e.message ?? e);
    }
    if (++done % 50 === 0) process.stderr.write(`  상세 ${done}/${listed.length}\n`);
    const d = fetchError
      ? { candidateDecision: 'UNCONFIRMED', decisionNote: `상세 조회 실패: ${fetchError}` }
      : decide(row, detail, nameCount.get(row.productName) ?? 1);
    return {
      source: 'MFDS_NEDRUG_FUNCTIONAL_REPORT',
      sourceProductName: row.productName,
      brandName: null, // 보고 데이터에는 소비자 브랜드가 없다 (책임판매업자만 존재)
      responsibleCompany: row.companyName,
      canonicalProductName: null, // 단계 3 정규화에서 결정
      englishProductName: null,
      sourceUrl: url,
      ...d,
      raw: {
        reportNo: row.reportNo,
        reportedAt: row.reportedAt,
        businessType: row.businessType,
        businessRegNo: row.businessRegNo,
        efficacy: detail.efficacy,
        usage: detail.usage,
        caution: detail.caution,
      },
    };
  });

  const counts = candidates.reduce((a, c) => ((a[c.candidateDecision] = (a[c.candidateDecision] ?? 0) + 1), a), {});
  writeOut('functional-candidates-500.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0',
      source: 'MFDS 의약품안전나라 기능성화장품제품정보(보고) 공개 목록',
      listUrl: LIST,
      populationTotalPages: totalPages,
      populationApproxCount: totalCount,
      samplingMethod: `계통표본: page = round(k*(totalPages-1)/${SAMPLE_N - 1})+1, k=0..${SAMPLE_N - 1}, limit=${PAGE_SIZE}`,
      sampledPages: pages,
      candidateCount: candidates.length,
      decisionCounts: counts,
      elapsedSec: Math.round((Date.now() - t0) / 1000),
    },
    candidates,
  });
  process.stderr.write(`decisions ${JSON.stringify(counts)} elapsed=${Math.round((Date.now() - t0) / 1000)}s\n`);
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.stack ?? e}\n`);
  process.exit(1);
});
