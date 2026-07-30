/**
 * Phase E — SAFE 6건 제안 canonical 생성 + rollback manifest.
 *
 * 패치 규칙(보수적):
 *  - 기능성 블록만 교체한다. 블록 외부는 **byte 동일**을 사후 검증한다.
 *  - 기존 sd-item 그룹은 **원문 그대로(substring)** 재사용한다(재생성 금지).
 *  - 삽입 그룹은 동일 문서 형제 마크업 형태로 생성하고, **원문 라인 순서**에 맞춰 배치한다.
 *  - 그룹이 2개 이상이면 driver 계약대로 `sd-core` 로 감싼다(단일이면 그대로).
 */
import fs from 'node:fs';
import { connectReadOnly, D, sha, nrm, dense, unesc, sliceFunctionBlock } from './hff-ko-function-review-pilot-47-lib.mjs';

const SAFE = `${D}/hff-ko-function-review-pilot-47-safe-targets-v1.json`;
const CLS = `${D}/hff-ko-function-review-pilot-47-pattern-classification-v1.json`;
const OUT_RB = `${D}/hff-ko-function-review-pilot-47-rollback-manifest-v1.json`;

const { targets } = JSON.parse(fs.readFileSync(SAFE, 'utf8'));
const { rows: cls } = JSON.parse(fs.readFileSync(CLS, 'utf8'));
const byIdx = new Map(cls.map((r) => [r.pilotIndex, r]));

const c = await connectReadOnly();
const canon = new Map((await c.query(
  `SELECT id, content, updated_at FROM shared_product_descriptions WHERE id = ANY($1)`, [targets.map((t) => t.canonicalId)]
)).rows.map((r) => [r.id, r]));
await c.end();

const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why']);

/** 원문 라인 순서대로 라벨 목록 (닫힘/손상 모두) */
function sourceLabelOrder(raw) {
  const out = [];
  for (const line0 of (raw ?? '').replace(/\r/g, '').split('\n')) {
    const line = line0.trim();
    if (!line.startsWith('[')) continue;
    const closed = line.match(/^\[([^\]]+)\]/);
    if (closed) { out.push(closed[1].trim()); continue; }
    const m = line.slice(1).match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\((?:가|나|다|라|마)\)/);
    if (m) out.push(line.slice(1, 1 + m.index).trim());
  }
  return out;
}

const rb = [];
const problems = [];

for (const t of targets) {
  const cn = canon.get(t.canonicalId);
  const r = byIdx.get(t.pilotIndex);
  const ko = cn.content;
  const blk = sliceFunctionBlock(ko);
  if (!blk.found) { problems.push({ i: t.pilotIndex, why: 'BLOCK_NOT_FOUND' }); continue; }

  const blockHtml = blk.html;
  const heading = blockHtml.match(/^<h2>[^<]*<\/h2>/)?.[0];
  if (!heading) { problems.push({ i: t.pilotIndex, why: 'HEADING_NOT_FOUND' }); continue; }
  const tail = blockHtml.slice(heading.length);            // 그룹 영역(+후행 공백)
  const trailingWs = tail.match(/\s*$/)?.[0] ?? '';

  // 기존 그룹 추출 (sd-item 안에는 중첩 div 없음)
  const existing = [...tail.matchAll(/<div class="sd-item">[\s\S]*?<\/div>/g)].map((m) => m[0]);
  if (!existing.length) { problems.push({ i: t.pilotIndex, why: 'NO_EXISTING_GROUP' }); continue; }
  const labelOf = (html) => nrm(unesc(html.match(/<span class="sd-tag">([\s\S]*?)<\/span>/)?.[1] ?? ''));

  // 기존 + 신규 그룹을 원문 라인 순서로 배치
  const pool = [
    ...existing.map((h) => ({ html: h, label: labelOf(h), isNew: false })),
    ...t.proposedGroups.map((g) => ({ html: g.html, label: nrm(g.label), isNew: true })),
  ];
  const order = sourceLabelOrder(r.sourceMainFnctnRaw);
  const used = new Set();
  const ordered = [];
  for (const L of order) {
    const idx = pool.findIndex((p, i) => !used.has(i) && dense(p.label) === dense(L));
    if (idx >= 0) { used.add(idx); ordered.push(pool[idx]); }
  }
  pool.forEach((p, i) => { if (!used.has(i)) ordered.push(p); });   // 미매칭은 원래 순서로 뒤에

  if (ordered.length !== pool.length) { problems.push({ i: t.pilotIndex, why: 'ORDER_LOST_GROUP' }); continue; }

  const groupsHtml = ordered.map((o) => o.html).join('');
  const newBlock = heading + (ordered.length >= 2 ? `<div class="sd-core">${groupsHtml}</div>` : groupsHtml) + trailingWs;
  const newContent = ko.slice(0, blk.start) + newBlock + ko.slice(blk.end);

  // ── 사후 안전 검증
  const before = ko.slice(0, blk.start), after = ko.slice(blk.end);
  const nBefore = newContent.slice(0, blk.start), nAfter = newContent.slice(newContent.length - after.length);
  const outsideIdentical = before === nBefore && after === nAfter;
  const allExistingPreserved = existing.every((h) => newContent.includes(h));
  const allNewPresent = t.proposedGroups.every((g) => newContent.includes(g.html));
  const classesOk = [...newContent.matchAll(/class="([^"]+)"/g)].every((m) => m[1].split(/\s+/).every((x) => !x || DEFINED.has(x)));
  const balanced = ['div', 'ul', 'li', 'span', 'p', 'h1', 'h2'].every((tag) =>
    (newContent.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length === (newContent.match(new RegExp(`</${tag}>`, 'g')) ?? []).length);
  const noEmpty = !/<li>\s*<\/li>|<ul>\s*<\/ul>|<div class="sd-item">\s*<\/div>|<h2>\s*<\/h2>/.test(newContent);
  const grew = newContent.length > ko.length;

  // 기능성 외 영역 텍스트 동일성(제품명·SRV_USE·HINT·BASE·footer).
  //   주의: newContent 는 길이가 늘어나므로 **구 offset 으로 슬라이스하면 안 된다**.
  //   before/after 는 위에서 이미 구 문서 기준으로 분리했고 nBefore/nAfter 는 신 문서 기준이다.
  const plain = (s) => nrm(s.replace(/<[^>]+>/g, ' '));
  const outsideTextSame = plain(before + after) === plain(nBefore + nAfter);
  // 기능성 블록 밖 필수 섹션이 모두 보존됐는지 (헤딩 존재 기준)
  const sectionsKept = ['섭취량 및 섭취방법', '확인 가능한 기준', '매장 전문가 문의']
    .every((h) => ko.includes(h) === newContent.includes(h));

  const checks = { outsideIdentical, allExistingPreserved, allNewPresent, classesOk, balanced, noEmpty, grew, outsideTextSame, sectionsKept };
  const ok = Object.values(checks).every(Boolean);
  if (!ok) problems.push({ i: t.pilotIndex, why: 'POST_CHECK_FAIL', checks });

  rb.push({
    targetIndex: rb.length + 1,
    pilotIndex: t.pilotIndex,
    candidateId: t.candidateId,
    statementNo: t.statementNo,
    productName: t.productName,
    productMasterId: t.productMasterId,
    canonicalId: t.canonicalId,
    reviewReason: t.pilotReasons.join(','),
    rendererFamily: t.rendererFamily,
    templateFamily: t.templateFamily,
    oldContent: ko,
    oldContentHash: sha(ko),
    newContent,
    newContentHash: sha(newContent),
    oldUpdatedAt: cn.updated_at?.toISOString?.() ?? String(cn.updated_at),
    patchOperation: 'INSERT_MISSING_GROUP',
    insertedGroups: t.proposedGroups.map((g) => ({ label: g.label, claims: g.claims, html: g.html })),
    insertedClauseCount: t.proposedGroups.reduce((a, g) => a + g.claims.length, 0),
    groupCountBefore: existing.length,
    groupCountAfter: ordered.length,
    wrappedInSdCore: ordered.length >= 2,
    postChecks: checks,
    applyStatus: 'PENDING',
  });
}

fs.writeFileSync(OUT_RB, JSON.stringify({
  builtAt: new Date().toISOString(), total: rb.length, problems,
  expectedUpdate: problems.length ? 0 : rb.length, targets: rb,
}, null, 1));

console.log(JSON.stringify({
  out: OUT_RB, built: rb.length, problems,
  summary: rb.map((x) => ({ i: x.pilotIndex, name: x.productName, groupsBefore: x.groupCountBefore, groupsAfter: x.groupCountAfter,
    clausesAdded: x.insertedClauseCount, sdCore: x.wrappedInSdCore, lenDelta: x.newContent.length - x.oldContent.length,
    checksAllPass: Object.values(x.postChecks).every(Boolean) })),
}, null, 2));
