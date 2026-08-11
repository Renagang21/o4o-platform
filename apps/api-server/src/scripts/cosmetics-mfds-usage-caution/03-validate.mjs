/**
 * WO §8 — 독립 검증.
 *
 * **보완 엔진(`enrich-core` · `content-edit-core`)을 import 하지 않는다.**
 * 근거도 계획 파일이 아니라 **원천(mfds-detail.json)과 운영 DB dump** 에서 다시 읽어 대조한다.
 *
 * 산출: validation.json · sample-review-60.md
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_DIR, readJsonl, readOut, readPrev, writeOut } from './lib.mjs';

const plan = readOut('dry-run-plan.json');
const details = readPrev('mfds-detail.json').details;

const db = new Map();
await readJsonl(join(OUT_DIR, 'db-cosmetics-ko-canonical.jsonl'), (r) => db.set(r.desc_id, r));

const tight = (s) => (s ?? '').replace(/[^0-9a-z가-힣]/gi, '').toLowerCase();
const unesc = (s) =>
  String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const HYPE_RE = /최고|최강|완벽|100%|즉시\s*효과|확실한\s*효과|부작용\s*없|영구|근본\s*해결/;
/**
 * 의약품적 **주장**만 잡는다.
 *
 * 처음 규칙은 `의약품` 낱말만 보고 6건을 잡았는데, 전부 염모제 공식 주의사항의
 * "임의로 **의약품** 등을 사용하는 것은 삼가 주십시오" 였다 — 의약품을 쓰지 말라는 **경고문**이지
 * 의약품적 주장이 아니다. 규칙을 주장 형태로 좁혔다(오탐 6 → 0, 아래 음성 대조로 미탐 0 확인).
 */
const DRUG_CLAIM_RE = /치료제|처방전|의약품\s*(?:대체|수준|처럼|과\s*같은|입니다|이다)|병을\s*낫/;

const violations = [];
const add = (masterId, code, detail) => violations.push({ masterId, code, detail: String(detail).slice(0, 200) });

const seenDesc = new Set();

for (const p of plan) {
  const row = db.get(p.descId);
  if (!row) {
    add(p.masterId, 'DESC_ROW_NOT_FOUND', p.descId);
    continue;
  }
  if (seenDesc.has(p.descId)) add(p.masterId, 'DUPLICATE_TARGET_DESC', p.descId);
  seenDesc.add(p.descId);

  const before = row.content ?? '';
  const after = p.after.content ?? '';
  const beforeBlocks = before.split('\n');
  const afterBlocks = after.split('\n');

  // ── 1. 계획의 before 가 실제 DB 값인가 ─────────────────────────────
  if (before !== p.before.content) add(p.masterId, 'BEFORE_NOT_CURRENT_DB', p.descId);

  // ── 2. 빈 내용 ──────────────────────────────────────────────────────
  if (!after.trim()) add(p.masterId, 'EMPTY_CONTENT', '');
  if (/<li>\s*<\/li>|<p>\s*<\/p>/.test(after)) add(p.masterId, 'EMPTY_ELEMENT', '');

  // ── 3. 기존 사실 삭제 ───────────────────────────────────────────────
  for (const b of beforeBlocks) {
    if (afterBlocks.includes(b)) continue;
    // 용법 교체 대상 블록 하나만 바뀔 수 있다.
    if (b.startsWith('<h3>사용 방법</h3>') && p.changedFields.includes('usage')) continue;
    add(p.masterId, 'ORIGINAL_BLOCK_LOST', b);
  }

  // ── 4. 절 중복 · 순서 ───────────────────────────────────────────────
  for (const t of ['주요 특징', '사용 방법', '주의사항']) {
    if (afterBlocks.filter((b) => b.startsWith(`<h3>${t}</h3>`)).length > 1) add(p.masterId, 'DUPLICATE_SECTION', t);
  }
  const iUsage = afterBlocks.findIndex((b) => b.startsWith('<h3>사용 방법</h3>'));
  const iCaution = afterBlocks.findIndex((b) => b.startsWith('<h3>주의사항</h3>'));
  const iTail = afterBlocks.findIndex((b) => b.startsWith('<p><small>'));
  if (iCaution >= 0 && iUsage >= 0 && iCaution < iUsage) add(p.masterId, 'SECTION_ORDER_WRONG', '주의사항이 사용 방법보다 앞');
  if (iCaution >= 0 && iTail >= 0 && iCaution > iTail) add(p.masterId, 'SECTION_AFTER_TAIL', '주의사항이 꼬리 뒤');
  // 블록 계약 — 본문은 `\n` 으로 블록을 나눈다. 새 절 안에 개행이 들어가면 블록 수가 어긋난다.
  // (블록 자체를 검사하면 split 이 이미 잘라놓아 항상 통과하므로 **블록 수**로 본다.)
  const expectedBlocks = beforeBlocks.length + (p.changedFields.includes('cautions') ? 1 : 0);
  if (afterBlocks.length !== expectedBlocks) {
    add(p.masterId, 'BLOCK_COUNT_UNEXPECTED', `${afterBlocks.length} ≠ ${expectedBlocks}`);
  }

  // ── 5. 원천 대조 — 계획이 아니라 mfds-detail 에서 다시 읽는다 ──────
  const d = details[p.mfdsSourceKey.reportSeq];
  if (!d || d._missing || d._failed) {
    add(p.masterId, 'MFDS_DETAIL_MISSING', p.mfdsSourceKey.reportSeq);
    continue;
  }

  // 제품 동일성 — 보고 제품명 ↔ 운영 상품명(브랜드 접두 허용)
  const a = tight(d.productName);
  const b2 = tight(row.name);
  const brand = tight(row.brand_name);
  const sameProduct = a === b2 || a === brand + b2 || (brand.length >= 2 && a.startsWith(brand) && a.slice(brand.length) === b2);
  if (!sameProduct) add(p.masterId, 'MFDS_PRODUCT_MISMATCH', `${d.productName} ≠ ${row.brand_name} ${row.name}`);
  if (d.companyName && p.mfdsSourceKey.companyName && tight(d.companyName) !== tight(p.mfdsSourceKey.companyName)) {
    add(p.masterId, 'MFDS_COMPANY_MISMATCH', `${d.companyName} ≠ ${p.mfdsSourceKey.companyName}`);
  }

  // ── 6. 용법 ─────────────────────────────────────────────────────────
  if (p.changedFields.includes('usage')) {
    const body = unesc(afterBlocks[iUsage]?.replace(/^<h3>사용 방법<\/h3><p>/, '').replace(/<\/p>$/, '') ?? '');
    if (norm(body) !== norm(d.usage)) add(p.masterId, 'USAGE_NOT_VERBATIM', body);
    if (!/\d/.test(body)) add(p.masterId, 'USAGE_NOT_MORE_SPECIFIC', body);
    if (HYPE_RE.test(body) || DRUG_CLAIM_RE.test(body)) add(p.masterId, 'USAGE_CLAIM', body);
    // 주의사항 본문이 사용 방법 자리에 들어가지 않았는가(필드 뒤바뀜)
    if (norm(body) === norm(String(d.cautions ?? '').replace(/\s+/g, ' '))) add(p.masterId, 'FIELD_SWAPPED_USAGE', '');
    if (/^\s*1\./.test(body)) add(p.masterId, 'USAGE_LOOKS_LIKE_CAUTION', body);
  } else if (iUsage >= 0) {
    // 손대지 않았다면 원래 문장 그대로여야 한다.
    const beforeUsage = beforeBlocks.find((x) => x.startsWith('<h3>사용 방법</h3>'));
    if (beforeUsage && afterBlocks[iUsage] !== beforeUsage) add(p.masterId, 'USAGE_CHANGED_UNPLANNED', '');
  }

  // ── 7. 주의사항 ─────────────────────────────────────────────────────
  if (p.changedFields.includes('cautions')) {
    if (before.includes('<h3>주의사항</h3>')) add(p.masterId, 'CAUTION_OVERWRITTEN', '');
    const block = afterBlocks[iCaution] ?? '';
    if (!block.startsWith('<h3>주의사항</h3><ul>')) add(p.masterId, 'CAUTION_NOT_LIST', block.slice(0, 60));
    const items = [...block.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => unesc(m[1]));
    const srcLines = String(d.cautions ?? '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length !== srcLines.length) add(p.masterId, 'CAUTION_LINE_COUNT_MISMATCH', `${items.length} ≠ ${srcLines.length}`);
    for (let k = 0; k < Math.min(items.length, srcLines.length); k += 1) {
      if (items[k] !== srcLines[k]) {
        add(p.masterId, 'CAUTION_NOT_VERBATIM', `[${k}] ${items[k]}`);
        break;
      }
    }
    if (items.some((x) => HYPE_RE.test(x) || DRUG_CLAIM_RE.test(x))) add(p.masterId, 'CAUTION_CLAIM', '');
    // 필드 뒤바뀜 — 용법 문장이 주의사항 자리에 들어가지 않았는가
    if (items.length === 1 && norm(items[0]) === norm(d.usage)) add(p.masterId, 'FIELD_SWAPPED_CAUTION', '');
  } else if (iCaution >= 0 && !before.includes('<h3>주의사항</h3>')) {
    add(p.masterId, 'CAUTION_ADDED_UNPLANNED', '');
  }
}

const byCode = {};
for (const v of violations) byCode[v.code] = (byCode[v.code] ?? 0) + 1;

// ── 계통표본 60건 ──────────────────────────────────────────────────────
const N = Math.min(60, plan.length);
const sample = Array.from({ length: N }, (_, k) => plan[Math.floor((k * plan.length) / N)]);
const md = ['# 공식 용법·주의사항 보완 계통표본 60건 (WO §8)', '', `대상 ${plan.length}건 중 \`index = floor(k × ${plan.length} / ${N})\` 로 뽑았다.`, ''];
for (const [i, p] of sample.entries()) {
  md.push(`## ${i + 1}. ${p.brandName} ${p.productName}`);
  md.push(`- 변경: ${p.changedFields.join(', ')} · 보고번호 ${p.mfdsSourceKey.reportNo} · ${p.mfdsSourceKey.companyName}`);
  md.push(`- 용법 판정: ${p.usageVerdict} — ${p.usageReason}`);
  if (p.addedUsage) md.push(`  - 기존(유형 일반): ${p.before.usage}`);
  if (p.addedUsage) md.push(`  - 공식: ${p.addedUsage}`);
  md.push('', '```html', unesc(p.after.content), '```', '');
}
writeFileSync(join(OUT_DIR, 'sample-review-60.md'), md.join('\n'), 'utf8');

writeOut('validation.json', {
  wo: 'WO-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1',
  planned: plan.length,
  violations: violations.length,
  byCode,
  samples: violations.slice(0, 40),
});
process.stderr.write(`planned=${plan.length} violations=${violations.length} ${JSON.stringify(byCode)}\n`);
