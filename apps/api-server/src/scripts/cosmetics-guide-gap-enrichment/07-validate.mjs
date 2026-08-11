/**
 * WO §9 — 자동 보완 결과 품질 검증.
 *
 * **보완 엔진(`enrich-core` · `content-edit-core`)을 import 하지 않는다.**
 * 허용 동작을 검증기에서 독립적으로 다시 유도해 엔진 버그가 스스로를 통과시키지 못하게 한다
 * (선행 WO 의 `03-validate.mjs` 와 같은 방식).
 *
 * 산출: validation.json · sample-review-100.md
 */
import { readOut, writeOut, OUT_DIR } from './lib.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const plan = readOut('dry-run-plan.json');
const mfdsDetail = readOut('mfds-detail.json').details;

const tight = (s) => (s ?? '').replace(/[^0-9a-z가-힣]/gi, '').toLowerCase();
const unesc = (s) =>
  String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

/** 과장·단정 표현. 화장품 설명서에 새로 들어가면 안 된다. */
const HYPE_RE = /최고|최강|완벽|100%|즉시\s*효과|확실한\s*효과|부작용\s*없|영구|의학적|치료|예방|질병|근본\s*해결/;
/** 의약품적 표현 — 화장품에서 금지된다. */
const DRUG_CLAIM_RE = /치료제|처방|의약품|효능\s*보증|병을\s*낫/;

const violations = [];
const add = (masterId, code, detail) => violations.push({ masterId, code, detail });

const byCode = {};
for (const p of plan) {
  const before = p.before.content ?? '';
  const after = p.after.content ?? '';

  // ── 1. 기존 사실이 사라지지 않았는가 ────────────────────────────────
  const beforeBlocks = before.split('\n');
  const afterBlocks = after.split('\n');
  const replacedOneLine = p.typeChange != null;
  for (const b of beforeBlocks) {
    if (afterBlocks.includes(b)) continue;
    // 유형 정정이 있으면 한 줄 설명·사용 안내 2블록만 바뀔 수 있다.
    if (replacedOneLine && (b.includes('제품입니다.') || b.startsWith('<h3>사용 방법</h3>'))) continue;
    // 특징 절은 항목이 덧붙어 바뀐다 — 원래 <li> 가 전부 남아 있어야 한다.
    if (b.startsWith('<h3>주요 특징</h3>')) {
      const items = [...b.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
      const afterSec = afterBlocks.find((x) => x.startsWith('<h3>주요 특징</h3>')) ?? '';
      const missing = items.filter((it) => !afterSec.includes(`<li>${it}</li>`));
      if (missing.length) add(p.masterId, 'ORIGINAL_FEATURE_LOST', missing.slice(0, 3).join(' | '));
      continue;
    }
    add(p.masterId, 'ORIGINAL_BLOCK_LOST', b.slice(0, 120));
  }

  // ── 2. 구조 ─────────────────────────────────────────────────────────
  if (afterBlocks.filter((b) => b.startsWith('<h3>주요 특징</h3>')).length > 1) add(p.masterId, 'DUPLICATE_FEATURE_SECTION', '');
  if (afterBlocks.filter((b) => b.startsWith('<h3>사용 방법</h3>')).length > 1) add(p.masterId, 'DUPLICATE_USAGE_SECTION', '');
  if (!after.trim()) add(p.masterId, 'EMPTY_CONTENT', '');
  if (after.length <= before.length && !p.typeChange) add(p.masterId, 'NOT_A_SUPERSET', '');
  // 분류·유통 확인 꼬리는 항상 마지막에 남아야 한다.
  const tailIdx = afterBlocks.findIndex((b) => b.startsWith('<p><small>'));
  if (tailIdx >= 0 && afterBlocks.slice(tailIdx).some((b) => b.startsWith('<h3>'))) {
    add(p.masterId, 'SECTION_AFTER_TAIL', '');
  }

  // ── 3. 추가된 문장 하나하나의 근거 ──────────────────────────────────
  const rawNames = (p.matchEvidence.retailSources ?? []).length ? null : null;
  for (const f of p.addedFeatures ?? []) {
    const text = f.text;
    if (HYPE_RE.test(text)) add(p.masterId, 'HYPE_EXPRESSION', text);
    if (DRUG_CLAIM_RE.test(text)) add(p.masterId, 'DRUG_CLAIM', text);
    if (!after.includes(`<li>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`)) {
      add(p.masterId, 'FEATURE_NOT_IN_CONTENT', text);
    }

    if (f.evidence === 'MFDS_REPORT_OFFICIAL') {
      const ev = p.matchEvidence.mfds;
      if (!ev) {
        add(p.masterId, 'MFDS_FEATURE_WITHOUT_EVIDENCE', text);
        continue;
      }
      const d = mfdsDetail[ev.reportSeq];
      if (!d || d._missing || d._failed) {
        add(p.masterId, 'MFDS_DETAIL_MISSING', ev.reportSeq);
        continue;
      }
      // 제품 동일성 — 보고 제품명과 상품명이 정규화 기준으로 같아야 한다(브랜드 접두 허용).
      const a = tight(d.productName);
      const b = tight(p.productName);
      const brand = tight(p.brandName);
      const sameProduct = a === b || a === brand + b || (a.startsWith(brand) && a.slice(brand.length) === b);
      if (!sameProduct) add(p.masterId, 'MFDS_PRODUCT_MISMATCH', `${d.productName} ≠ ${p.brandName} ${p.productName}`);
      // 효능 문장은 보고 원문 그대로여야 한다 — 요약·재구성 금지.
      if (f.from === 'MFDS_EFFICACY') {
        const body = text.replace(/^식약처 기능성화장품 보고 효능·효과:\s*/, '');
        if (!d.efficacy || d.efficacy.replace(/\s+/g, ' ').trim() !== body.replace(/\s+/g, ' ').trim()) {
          add(p.masterId, 'MFDS_EFFICACY_NOT_VERBATIM', body.slice(0, 80));
        }
      }
      if (f.from === 'MFDS_REPORT_NO' && !text.includes(ev.reportNo)) add(p.masterId, 'MFDS_REPORT_NO_MISMATCH', text);
    }

    if (f.evidence === 'RETAIL_LISTING') {
      // 용량·구성은 판매명에 **문자 그대로** 있어야 한다. 없으면 만들어낸 값이다.
      const value = text.replace(/^(용량\/구성|구성):\s*/, '');
      const names = [p.productName, ...(p.matchEvidence.rawProductNames ?? [])].join(' ');
      const numbers = [...value.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0]);
      const namesTight = tight(names);
      if (numbers.length && !numbers.some((n) => namesTight.includes(tight(n)))) {
        add(p.masterId, 'CAPACITY_NUMBER_NOT_IN_NAME', `${value} ∉ ${names.slice(0, 80)}`);
      }
    }
  }

  // ── 4. 유형 정정 ────────────────────────────────────────────────────
  if (p.typeChange) {
    const { from, to } = p.typeChange;
    const n = (p.productName ?? '').replace(/\s+/g, '');
    if (!n.endsWith(to) && !n.includes(to)) add(p.masterId, 'TYPE_CHANGE_NOT_IN_NAME', `${from}→${to} · ${p.productName}`);
    if (n.includes(from)) add(p.masterId, 'TYPE_CHANGE_AMBIGUOUS_NAME', `${from}→${to} · ${p.productName}`);
    if (!after.includes(`— ${to} 제품입니다.`)) add(p.masterId, 'TYPE_CHANGE_NOT_RENDERED', `${from}→${to}`);
    if (after.includes(`— ${from} 제품입니다.`)) add(p.masterId, 'OLD_TYPE_REMAINS', `${from}→${to}`);
    // 부위·용도 표기가 사라지면 안 된다(바디→일반 등 열화 금지).
    const prefixes = ['클렌징', '바디', '헤어', '두피', '아이', '핸드', '립', '네일', '선'];
    const fromP = prefixes.find((x) => from.startsWith(x));
    if (fromP && !to.startsWith(fromP)) add(p.masterId, 'TYPE_CHANGE_DEGRADES', `${from}→${to}`);
  }

  // ── 5. 사용 방법 ────────────────────────────────────────────────────
  if (p.addedUsage) {
    if (HYPE_RE.test(p.addedUsage)) add(p.masterId, 'HYPE_EXPRESSION_USAGE', p.addedUsage);
    if (!after.includes('<h3>사용 방법</h3>')) add(p.masterId, 'USAGE_NOT_RENDERED', '');
    if (before.includes('<h3>사용 방법</h3>')) add(p.masterId, 'USAGE_OVERWRITTEN', '');
  }
}

for (const v of violations) byCode[v.code] = (byCode[v.code] ?? 0) + 1;

// ── 계통표본 100건 (유명 제품 고르기 금지 — 인덱스 고정) ────────────────
const N = Math.min(100, plan.length);
const sample = Array.from({ length: N }, (_, k) => plan[Math.floor((k * plan.length) / N)]);
const md = [
  '# 자동 보완 계통표본 100건 (WO §9)',
  '',
  `대상 ${plan.length}건 중 \`index = floor(k × ${plan.length} / ${N})\` 로 뽑았다.`,
  '',
];
for (const [i, p] of sample.entries()) {
  md.push(`## ${i + 1}. ${p.brandName} ${p.productName}`);
  md.push(`- 변경 필드: ${p.changedFields.join(', ')} · 원천: ${p.source.join(', ')}`);
  if (p.typeChange) md.push(`- 유형 정정: ${p.typeChange.from} → ${p.typeChange.to}`);
  for (const f of p.addedFeatures ?? []) md.push(`- 추가 특징(${f.evidence}/${f.from}): ${f.text}`);
  if (p.addedUsage) md.push(`- 추가 사용 방법: ${p.addedUsage}`);
  if (p.matchEvidence.mfds) {
    md.push(`- 보고 대조: \`${p.matchEvidence.mfds.mfdsProductName}\` / ${p.matchEvidence.mfds.companyName} / 보고번호 ${p.matchEvidence.mfds.reportNo}`);
  }
  md.push('', '```html', unesc(p.after.content), '```', '');
}
writeFileSync(join(OUT_DIR, 'sample-review-100.md'), md.join('\n'), 'utf8');

writeOut('validation.json', {
  wo: 'WO-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1',
  planned: plan.length,
  violations: violations.length,
  byCode,
  samples: violations.slice(0, 40),
});
process.stderr.write(`planned=${plan.length} violations=${violations.length} ${JSON.stringify(byCode)}\n`);
