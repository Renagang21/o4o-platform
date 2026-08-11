/**
 * WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1 — §2 모집단 census (read-only)
 *
 * 운영 DB 에서 regulatory_type='COSMETIC' 전량의 상품명을 읽어 비정상 패턴 분포를 산출한다.
 * 규칙은 이 census 의 실측 빈도에서 도출한다 — 추정으로 만들지 않는다. DB write 0.
 */
import { withDb } from '../cosmetics-productmaster-apply-pilot/db.mjs';
import { writeOut } from './lib.mjs';

/** 여는 괄호 → 닫는 괄호 */
const PAIRS = { '[': ']', '(': ')', '{': '}', '<': '>', '【': '】', '（': '）', '〔': '〕' };
const CLOSERS = new Set(Object.values(PAIRS));

/** 괄호 균형 검사 — 종류별로 열림/닫힘 수만 본다(중첩 순서까지 따지지 않는다). */
export function bracketBalance(name) {
  const bad = [];
  for (const [open, close] of Object.entries(PAIRS)) {
    const o = name.split(open).length - 1;
    const c = name.split(close).length - 1;
    if (o !== c) bad.push({ open, close, o, c });
  }
  return bad;
}

/** 이름 맨 앞의 괄호 묶음 토큰들을 순서대로 뽑는다. */
export function leadingBracketTokens(name) {
  const tokens = [];
  let s = name.trim();
  for (;;) {
    const m = s.match(/^\s*([[(【（〔])([^\]）)】〕]*)([\])】）〕])\s*/);
    if (!m) break;
    tokens.push(m[2].trim());
    s = s.slice(m[0].length);
  }
  return { tokens, rest: s };
}

async function main() {
  const out = {
    wo: 'WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1',
    step: '01-census',
    readOnly: true,
  };
  let rows = [];

  await withDb(async (q) => {
    const rt = await q(`SELECT regulatory_type t, COUNT(*)::int c FROM product_masters GROUP BY 1`);
    out.baselineRegulatoryTypeCounts = Object.fromEntries(rt.rows.map((r) => [r.t, r.c]));

    const res = await q(
      `SELECT m.id, m.name, m.regulatory_name, m.brand_name,
              m.tags->>'censusKey' census_key, m.tags->>'woBatch' wo_batch, m.tags->>'productType' product_type,
              s.id desc_id, s.summary, length(s.content)::int content_len
         FROM product_masters m
         LEFT JOIN shared_product_descriptions s
           ON s.master_id = m.id AND s.description_type = 'STORE'
          AND COALESCE(s.language,'ko') = 'ko' AND s.status = 'canonical' AND s.deleted_at IS NULL
        WHERE m.regulatory_type = 'COSMETIC'
        ORDER BY m.id`,
    );
    rows = res.rows;
  });

  out.total = rows.length;
  out.byWoBatch = {};
  for (const r of rows) out.byWoBatch[r.wo_batch ?? '(none)'] = (out.byWoBatch[r.wo_batch ?? '(none)'] ?? 0) + 1;
  out.withoutCanonical = rows.filter((r) => !r.desc_id).length;

  // ── 선두 괄호 토큰 빈도 (규칙 설계의 근거)
  const tokenFreq = new Map();
  let leadingBracketCount = 0;
  for (const r of rows) {
    const { tokens } = leadingBracketTokens(r.name);
    if (tokens.length) leadingBracketCount++;
    for (const t of tokens) tokenFreq.set(t, (tokenFreq.get(t) ?? 0) + 1);
  }
  out.leadingBracketCount = leadingBracketCount;
  out.leadingTokenFreq = [...tokenFreq.entries()].sort((a, b) => b[1] - a[1]).map(([token, n]) => ({ token, n }));

  // ── 비문자로 시작(선행 CHECK §9 기준)
  const nonWordLead = rows.filter((r) => /^[^0-9A-Za-z가-힣]/.test(r.name));
  out.nonWordLeadingCount = nonWordLead.length;
  const leadCharFreq = new Map();
  for (const r of nonWordLead) leadCharFreq.set(r.name[0], (leadCharFreq.get(r.name[0]) ?? 0) + 1);
  out.leadingCharFreq = [...leadCharFreq.entries()].sort((a, b) => b[1] - a[1]).map(([ch, n]) => ({ ch, n }));

  // ── 괄호 불균형
  const imbalanced = rows
    .filter((r) => bracketBalance(r.name).length)
    .map((r) => ({ id: r.id, name: r.name, detail: bracketBalance(r.name) }));
  out.bracketImbalancedCount = imbalanced.length;
  out.bracketImbalanced = imbalanced;

  // ── 이름 안(선두 아님)의 판매 문구 후보 빈도
  const INLINE = ['1+1', '2+1', '증정', '사은품', '기획', '특가', '한정', '단독', '세트', '리필', '본품', '무료배송', '올영픽', '쿠폰'];
  out.inlineTokenFreq = INLINE.map((t) => ({
    token: t,
    n: rows.filter((r) => r.name.includes(t)).length,
  })).sort((a, b) => b.n - a.n);

  writeOut('census.json', out);
  writeOut('census-rows.json', { count: rows.length, rows });
  console.log(
    `census — COSMETIC ${out.total} / canonical 없음 ${out.withoutCanonical} / 선두괄호 ${out.leadingBracketCount} / 비문자시작 ${out.nonWordLeadingCount} / 괄호불균형 ${out.bracketImbalancedCount}`,
  );
  console.log('선두 토큰 상위 40:');
  for (const t of out.leadingTokenFreq.slice(0, 40)) console.log(`  ${String(t.n).padStart(5)}  ${t.token}`);
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
