/**
 * WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1  §14
 *
 * HFF 전용 최소 모듈 — 기존 canonical 의 renderer family 를 보존하면서
 * **누락된 공식 기능성 절만 삽입**한다. 공용 renderer·CSS 는 건드리지 않는다.
 *
 * 계약 (§2 / §6 / §14):
 *   - 변경은 **삽입 전용(additive-only)**. 기존 바이트를 지우거나 바꾸지 않는다.
 *     → after 에서 삽입 문자열을 그 offset 에서 제거하면 before 와 byte 동일해야 한다.
 *   - renderer family / 최상위 wrapper / h2 순서 / class 집합 / 카드 순서 / footer 불변.
 *   - 삽입 위치가 단일하게 결정되지 않거나 원료 대응이 불명확하면 patch 하지 않고
 *     HUMAN_REVIEW_REQUIRED 로 분리한다.
 *   - 공식 원문(MAIN_FNCTN) 밖의 문구는 만들지 않는다. 영문 단독 절은 삽입하지 않는다.
 *   - COMPOSITE 에 DRIVER 기준(전용 h2 등)을 강제하지 않는다(§13).
 */
import { createSegmenter } from './hff-ko-function-clause-segmenter-v2.mjs';

/* ── 정규화 계약 (driver 와 동일 정의) ─────────────────────────────────── */
export const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const norm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/[\t ]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
export const flat = (s) => norm(s).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

const { extractFunctionsV2 } = createSegmenter({ norm, flat });

/** HTML → 표시 텍스트 (태그 제거 + 엔티티 복원). 비교 전용. */
export const htmlText = (h) => String(h ?? '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** 비교 키 — 공백·문장부호·가운뎃점 변형·괄호 번호 표기를 흡수한다. */
export const cmpText = (s) => htmlText(s)
  .replace(/[·․‧∙・ㆍ･ᆞ]/g, '·')
  .replace(/[（(](국문|영문)[）)]/g, '')
  .replace(/[()（）]/g, '')
  .replace(/[.,、。·\s]+$/g, '')
  .replace(/\s+/g, '');

/** 절을 하위 구(句)로 분해 — 기존 렌더가 공식 복합절을 분해 저장한 경우의 커버리지 판정용. */
const subPhrases = (key) => String(key)
  .split(/[·,，/]/)
  .map((p) => p.trim())
  .filter((p) => p.length >= 4);

/** 선두 원료 라벨 표기(`비타민D : …`, `1) EPA및DHA함유유지 : …`) 제거. */
const stripInlineLabel = (s) => String(s).replace(/^[^:：]{1,30}[:：]\s*/, '');
/** 고시·제조방법 등 대괄호 주석 제거 — 기능성 문구 자체의 존재 판정용. */
const stripAnnotations = (s) => String(s).replace(/\[[^\]]*\]/g, '');

/** 절의 비교 변형 후보 — 모두 "이미 반영되어 있는가" 판정용(보수적: 있으면 건드리지 않음). */
const coverageVariants = (clause) => {
  const base = cmpText(clause);
  const v = new Map([['EXACT', base]]);
  const noLabel = cmpText(stripInlineLabel(clause));
  if (noLabel && noLabel !== base) v.set('LABEL_STRIPPED', noLabel);
  const noAnn = cmpText(stripAnnotations(clause));
  if (noAnn && noAnn !== base) v.set('ANNOTATION_STRIPPED', noAnn);
  const both = cmpText(stripAnnotations(stripInlineLabel(clause)));
  if (both && !v.has('EXACT_BOTH') && both !== base && both !== noLabel && both !== noAnn) v.set('LABEL_ANNOTATION_STRIPPED', both);
  return [...v.entries()];
};

/* ── 기능성 컨테이너 탐색 ─────────────────────────────────────────────── */
const FUNC_H2 = /기능성|영양기능/;

/** `<ul ...>` 여는 태그 위치에서 짝이 맞는 `</ul>` 의 시작 offset 을 반환. */
export function matchUlEnd(html, openIdx) {
  const re = /<\/?ul\b[^>]*>/g;
  re.lastIndex = openIdx;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('</')) {
      depth--;
      if (depth === 0) return m.index;
    } else depth++;
  }
  return -1;
}

/**
 * canonical HTML 에서 기능성 섹션을 전수 추출한다.
 * 반환: [{ h2, h2Index, blockStart, blockEnd, ulOpenIdx, ulEndIdx, ulClass,
 *          mode: 'PER_INGREDIENT'|'FLAT', ingredients: [{name, ulOpenIdx, ulEndIdx, items}], items }]
 */
export function findFunctionalSections(content) {
  const html = String(content ?? '');
  const h2s = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => ({
    label: htmlText(m[1]), index: m.index, endIndex: m.index + m[0].length,
  }));
  const out = [];
  for (let i = 0; i < h2s.length; i++) {
    if (!FUNC_H2.test(h2s[i].label)) continue;
    const blockStart = h2s[i].endIndex;
    const blockEnd = i + 1 < h2s.length ? h2s[i + 1].index : html.length;
    const block = html.slice(blockStart, blockEnd);
    const ulRel = block.search(/<ul\b[^>]*>/);
    if (ulRel < 0) { out.push({ h2: h2s[i].label, h2Index: h2s[i].index, blockStart, blockEnd, ulOpenIdx: -1, mode: 'NO_LIST', items: [], ingredients: [] }); continue; }
    // DRIVER 그룹 구조: `<div class="sd-item"><span class="sd-tag">원료</span><ul>…</ul></div>`
    //   (sd-core 로 감싸이거나 단독 카드). 이 구조는 최상위 ul 이 없으므로 먼저 판정한다.
    if (/class="sd-item"/.test(block) && /class="sd-tag"/.test(block)) {
      const groups = [];
      const gRe = /<div class="sd-item">(?:<span class="sd-tag">([^<]{1,60})<\/span>)?\s*<ul\b[^>]*>/g;
      let gm;
      while ((gm = gRe.exec(block))) {
        const absOpen = blockStart + gm.index + gm[0].lastIndexOf('<ul');
        const absEnd = matchUlEnd(html, absOpen);
        groups.push({
          name: gm[1] ? htmlText(gm[1]) : null,
          ulOpenIdx: absOpen, ulEndIdx: absEnd,
          items: absEnd > 0 ? [...html.slice(absOpen, absEnd).matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => htmlText(x[1])) : [],
        });
      }
      out.push({
        h2: h2s[i].label, h2Index: h2s[i].index, blockStart, blockEnd,
        ulOpenIdx: groups[0]?.ulOpenIdx ?? -1, ulEndIdx: groups[0]?.ulEndIdx ?? -1,
        ulClass: 'sd-item', extraTopUl: 0,
        mode: groups.length ? 'DRIVER_GROUP' : 'UNRECOGNIZED_GROUP',
        ingredients: groups,
        items: groups.flatMap((x) => x.items),
      });
      continue;
    }
    const ulOpenIdx = blockStart + ulRel;
    const ulEndIdx = matchUlEnd(html, ulOpenIdx);
    const ulClass = (html.slice(ulOpenIdx).match(/^<ul\b[^>]*class="([^"]*)"/) ?? [])[1] ?? '';
    // 같은 블록에 최상위 ul 이 2개 이상이면 삽입 위치가 단일하지 않다.
    let extraTopUl = 0;
    if (ulEndIdx > 0) {
      const rest = html.slice(ulEndIdx, blockEnd);
      extraTopUl = (rest.match(/<ul\b[^>]*>/g) ?? []).length;
    }
    const inner = ulEndIdx > 0 ? html.slice(ulOpenIdx, ulEndIdx) : '';
    // 원료별 구조: `<li><b>원료</b><ul ...>…</ul></li>`
    const ingredients = [];
    const ingRe = /<li><b>([^<]{1,60})<\/b>\s*<ul\b[^>]*>/g;
    let g;
    while ((g = ingRe.exec(inner))) {
      const absOpen = ulOpenIdx + g.index + g[0].lastIndexOf('<ul');
      const absEnd = matchUlEnd(html, absOpen);
      ingredients.push({
        name: htmlText(g[1]),
        ulOpenIdx: absOpen,
        ulEndIdx: absEnd,
        items: absEnd > 0 ? [...html.slice(absOpen, absEnd).matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => htmlText(x[1])) : [],
      });
    }
    const items = ingredients.length
      ? ingredients.flatMap((x) => x.items)
      : [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => htmlText(x[1]));
    out.push({
      h2: h2s[i].label, h2Index: h2s[i].index, blockStart, blockEnd,
      ulOpenIdx, ulEndIdx, ulClass, extraTopUl,
      mode: ingredients.length ? 'PER_INGREDIENT' : 'FLAT',
      ingredients, items,
    });
  }
  return out;
}

/* ── 커버리지 판정 ────────────────────────────────────────────────────── */
/** 공식 절이 현재 canonical 에 이미 반영되어 있는지 — 전문 일치 또는 분해 반영 인정. */
export function clauseCoverage(clause, wholeContentText) {
  const key = cmpText(clause);
  if (!key) return { covered: true, how: 'EMPTY' };
  const variants = coverageVariants(clause);
  for (const [how, v] of variants) {
    if (wholeContentText.includes(v)) return { covered: true, how };
  }
  // 공식 복합절이 기존 렌더에서 분해 저장된 경우(가운뎃점·쉼표 구분) 도 반영으로 인정한다.
  for (const [how, v] of variants) {
    const parts = subPhrases(v);
    if (parts.length >= 2 && parts.every((p) => wholeContentText.includes(p))) {
      return { covered: true, how: `DECOMPOSED_${how}` };
    }
  }
  return { covered: false, how: 'MISSING' };
}

/**
 * 삽입 후보 절의 안전성 하드 가드.
 *   - 선두 원료 라벨을 품은 절은 다른 원료 문구를 다른 원료 영역에 혼입할 위험이 있다(§28).
 *   - 하위 구 일부가 이미 존재하면 삽입 시 부분 중복이 발생한다.
 */
export function insertHazard(clause, wholeContentText) {
  const raw = String(clause).trim();
  // 문두 구두점 잔여 — 세그먼트 경계가 깨진 절.
  if (/^[^0-9A-Za-z가-힣(（[]/.test(raw)) return 'INSERT_CLAUSE_LEADING_PUNCTUATION';
  // (국문)/(영문) 선두 표기가 붙은 절은 그대로 새 항목으로 넣지 않는다(§27: 기존 잔존은 결함 아님).
  if (/^[（(](국문|영문)[）)]/.test(raw)) return 'INSERT_CLAUSE_LANGUAGE_MARKER_PREFIX';
  if (/^[^:：]{1,30}[:：]\s*\S/.test(raw)) return 'INSERT_CLAUSE_CARRIES_INLINE_LABEL';
  // 절 내부에 다중 절 구분자(`/`, `2)`, `①`, 쉼표)가 있고 각 조각이 기능성 서술어로 끝나면
  // 그것은 단일 절이 아니라 결합 세그먼트이므로 한 항목으로 삽입하지 않는다.
  const END = /(필요|있음|있습니다|줌|준다|도움을 줌)[.。\s]*$/;
  const pieces = raw.split(/[,，/]|\d+\s*\)|[①-⑳]/).map((p) => p.trim()).filter(Boolean);
  if (pieces.length >= 2 && pieces.filter((p) => END.test(p)).length >= 2) return 'INSERT_CLAUSE_MULTI_CLAUSE_SEGMENT';
  // 정상 공식 기능성 절은 기능 서술어로 끝난다. 끝나지 않으면 잘린 조각·머리표기 등이다.
  //   예) '배변활동 원활'(절단) / '기능성 내용'(머리표기) 은 제외, '철의 흡수에 필요' 는 정상.
  const key = cmpText(raw);
  if (key.length < 5) return 'INSERT_CLAUSE_TOO_SHORT';
  if (!/(필요|있음|있습니다|줌|준다|관여)$/.test(key)) return 'INSERT_CLAUSE_NO_FUNCTION_PREDICATE';
  const parts = subPhrases(cmpText(clause));
  // 하위 구 판정 임계값은 커버리지(subPhrases) 와 동일하게 4자로 맞춘다.
  if (parts.length >= 2 && parts.some((p) => wholeContentText.includes(p))) return 'PARTIAL_DUPLICATION_RISK';
  return null;
}

/**
 * 평면(무라벨) 목록에 삽입할 때의 원료 귀속 위험 (§14 "원료 대응이 불명확하면 제외").
 *   - 공식 원문에 서로 다른 원료 라벨이 2개 이상 → 어느 원료 문구인지 표기 불가.
 *   - 라벨이 없더라도 공식 절 그룹(원료 단위 열거 블록)이 2개 이상이면 같은 이유로 불명확하다.
 *     예) `①…②…③…` / `①…` / `(1) …` 이 빈 줄로 나뉜 복합 영양성분 원문.
 */
export function flatAttributionHazard(officialBlocks, mainFnctn) {
  const labeled = officialBlocks.filter((b) => b.header != null);
  if (new Set(labeled.map((b) => cmpText(b.header))).size > 1) return 'FLAT_LIST_WITH_MULTIPLE_OFFICIAL_INGREDIENTS';
  if (officialBlocks.length > 1 || officialGroupRestartCount(mainFnctn) > 1) return 'FLAT_LIST_WITH_MULTIPLE_OFFICIAL_CLAUSE_GROUPS';
  return null;
}

/**
 * 공식 원문의 무라벨 원료 그룹 수 추정 — 열거 번호가 `①` 또는 `(1)` 로 **재시작**하는 횟수.
 * 세그먼터는 라벨 없는 블록을 하나로 평탄화하므로, 원문 열거 재시작이 유일한 그룹 경계 신호다.
 */
export function officialGroupRestartCount(mainFnctn) {
  const t = String(mainFnctn ?? '');
  const circled = (t.match(/①/g) ?? []).length;
  const paren = t.split(/\n/).filter((l) => /^\s*[(（]?1[)）]\s*\S/.test(l)).length;
  return circled + paren;
}

/* ── 대상 분석 (§12·§13) ──────────────────────────────────────────────── */
/**
 * @returns {{
 *   classification: 'FUNCTION_COMPLETE'|'SAFE_MISSING_CLAUSE'|'STRUCTURE_ADAPTER_REQUIRED'|'HUMAN_REVIEW_REQUIRED',
 *   reason: string, plan: null | {inserts: [{atIndex:number, html:string, text:string, ingredient:string|null}]},
 *   detail: object }}
 */
export function analyzeTarget({ content, mainFnctn, family }) {
  const html = String(content ?? '');
  const wholeText = cmpText(html);
  const v2 = extractFunctionsV2(mainFnctn);
  const officialBlocks = v2.groups;          // [{header, items}]
  const officialItems = v2.flat;             // ko 기능성 절 전량
  const englishOnly = (v2.analysis?.segments ?? []).filter((s) => s.kind === 'ENGLISH_ONLY_REVIEW');
  const detail = {
    officialClauseCount: officialItems.length,
    officialBlockCount: officialBlocks.length,
    officialLabeledBlockCount: officialBlocks.filter((b) => b.header != null).length,
    segmenterAutoEligible: v2.autoEligible,
    englishOnlyClauseCount: englishOnly.length,
    coverage: [],
    sections: [],
  };

  if (!officialItems.length) {
    return { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'NO_OFFICIAL_KO_CLAUSE', plan: null, detail };
  }

  const missing = [];
  for (const b of officialBlocks) {
    for (const it of b.items) {
      const cov = clauseCoverage(it, wholeText);
      detail.coverage.push({ header: b.header ?? null, clause: it, how: cov.how });
      if (!cov.covered) missing.push({ header: b.header ?? null, clause: it });
    }
  }

  const sections = findFunctionalSections(html);
  detail.sections = sections.map((s) => ({ h2: s.h2, mode: s.mode, ulClass: s.ulClass, itemCount: s.items.length, ingredients: s.ingredients.map((x) => x.name), extraTopUl: s.extraTopUl ?? 0 }));

  if (!missing.length) {
    return { classification: 'FUNCTION_COMPLETE', reason: 'ALL_OFFICIAL_CLAUSES_PRESENT', plan: null, detail };
  }
  if (!sections.length) {
    return { classification: 'STRUCTURE_ADAPTER_REQUIRED', reason: 'NO_FUNCTIONAL_SECTION', plan: null, detail };
  }
  if (sections.length > 1) {
    return { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'MULTIPLE_FUNCTIONAL_SECTIONS', plan: null, detail };
  }
  const sec = sections[0];
  if (sec.mode === 'UNRECOGNIZED_GROUP') {
    return { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'UNRECOGNIZED_GROUP_STRUCTURE', plan: null, detail };
  }
  if (sec.mode === 'NO_LIST' || sec.ulOpenIdx < 0 || sec.ulEndIdx < 0) {
    return { classification: 'STRUCTURE_ADAPTER_REQUIRED', reason: 'NO_INSERTABLE_LIST', plan: null, detail };
  }
  if ((sec.extraTopUl ?? 0) > 0) {
    return { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'MULTIPLE_TOP_LEVEL_LISTS', plan: null, detail };
  }

  // 삽입 자체가 위험한 절이 하나라도 있으면 이 제품 전체를 사람 검토로 분리한다.
  for (const m of missing) {
    const hz = insertHazard(m.clause, wholeText);
    if (hz) {
      detail.hazard = { clause: m.clause, hazard: hz };
      return { classification: 'HUMAN_REVIEW_REQUIRED', reason: hz, plan: null, detail };
    }
  }

  const inserts = [];
  if (sec.mode === 'PER_INGREDIENT' || sec.mode === 'DRIVER_GROUP') {
    // DRIVER_GROUP 에서 라벨 없는 단일 그룹(무라벨 원문)은 평면 목록과 동등하게 취급한다.
    const unlabeledSingle = sec.mode === 'DRIVER_GROUP' && sec.ingredients.length === 1 && sec.ingredients[0].name == null;
    if (unlabeledSingle) {
      const amb = flatAttributionHazard(officialBlocks, mainFnctn);
      if (amb) return { classification: 'HUMAN_REVIEW_REQUIRED', reason: amb, plan: null, detail };
      if (sec.ingredients[0].ulEndIdx < 0) return { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'INGREDIENT_LIST_UNBALANCED', plan: null, detail };
      for (const m of missing) inserts.push({ atIndex: sec.ingredients[0].ulEndIdx, html: `<li>${esc(m.clause)}</li>`, text: m.clause, ingredient: null });
      return {
        classification: 'SAFE_MISSING_CLAUSE', reason: 'APPEND_TO_UNLABELED_GROUP',
        plan: { family, sectionH2: sec.h2, mode: sec.mode, inserts }, detail,
      };
    }
    // 원료별 카드 → 누락 절의 공식 라벨이 정확히 하나의 카드와 대응해야 한다.
    for (const m of missing) {
      if (m.header == null) return { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'MISSING_CLAUSE_WITHOUT_INGREDIENT_LABEL', plan: null, detail };
      const key = cmpText(m.header);
      const hit = sec.ingredients.filter((x) => {
        const n = cmpText(x.name);
        return n === key || n.includes(key) || key.includes(n);
      });
      if (hit.length !== 1) return { classification: 'HUMAN_REVIEW_REQUIRED', reason: hit.length === 0 ? 'INGREDIENT_CARD_NOT_FOUND' : 'INGREDIENT_CARD_AMBIGUOUS', plan: null, detail };
      if (hit[0].ulEndIdx < 0) return { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'INGREDIENT_LIST_UNBALANCED', plan: null, detail };
      inserts.push({ atIndex: hit[0].ulEndIdx, html: `<li>${esc(m.clause)}</li>`, text: m.clause, ingredient: hit[0].name });
    }
  } else {
    // 평면 목록 → 원료 귀속 표기가 없으므로 다중 원료 원문과는 대응이 불명확하다.
    const amb = flatAttributionHazard(officialBlocks, mainFnctn);
    if (amb) return { classification: 'HUMAN_REVIEW_REQUIRED', reason: amb, plan: null, detail };
    for (const m of missing) {
      inserts.push({ atIndex: sec.ulEndIdx, html: `<li>${esc(m.clause)}</li>`, text: m.clause, ingredient: null });
    }
  }

  if (!inserts.length) return { classification: 'FUNCTION_COMPLETE', reason: 'NO_INSERT_REQUIRED', plan: null, detail };
  // 같은 대상에 동일 문구를 2회 이상 삽입하려는 계획은 세그먼트 분해 오류 신호다.
  const dupKey = inserts.map((x) => `${x.atIndex}|${cmpText(x.text)}`);
  if (new Set(dupKey).size !== dupKey.length) {
    return { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'DUPLICATE_INSERT_TEXT', plan: null, detail };
  }
  return {
    classification: 'SAFE_MISSING_CLAUSE',
    reason: sec.mode === 'PER_INGREDIENT' || sec.mode === 'DRIVER_GROUP' ? 'INSERT_INTO_INGREDIENT_CARD' : 'APPEND_TO_FLAT_LIST',
    plan: { family, sectionH2: sec.h2, mode: sec.mode, inserts },
    detail,
  };
}

/* ── patch 적용 (§14) ─────────────────────────────────────────────────── */
/** 삽입 전용 patch. 동일 offset 다중 삽입은 원문 순서를 유지한다. */
export function applyPatch({ content, plan }) {
  const html = String(content ?? '');
  const ordered = [...plan.inserts].map((x, i) => ({ ...x, seq: i }))
    .sort((a, b) => (b.atIndex - a.atIndex) || (b.seq - a.seq));   // 뒤에서부터 삽입 → offset 안정
  let out = html;
  for (const ins of ordered) out = out.slice(0, ins.atIndex) + ins.html + out.slice(ins.atIndex);
  return out;
}

/**
 * §14 patch 계약 검증. 실패 시 사유 배열 반환(빈 배열 = PASS).
 * 핵심: **삽입 문자열을 제거하면 before 와 byte 동일** (비기능성 노드 byte 불변의 강한 증명).
 */
export function verifyPatch({ before, after, plan }) {
  const fails = [];
  if (after === before) fails.push('NO_CHANGE_PRODUCED');

  // 1) additive-only 증명 — after 에서 삽입분을 역순 제거 → before 복원
  let peel = after;
  const ordered = [...plan.inserts].map((x, i) => ({ ...x, seq: i }))
    .sort((a, b) => (a.atIndex - b.atIndex) || (a.seq - b.seq));
  // 오름차순으로 벗겨내면, 앞선 삽입분 제거로 뒤쪽 offset 이 이미 보정되므로
  // k 번째 삽입은 항상 원본 offset(atIndex) 위치에 그대로 있다.
  for (const ins of ordered) {
    const at = ins.atIndex;
    if (peel.slice(at, at + ins.html.length) !== ins.html) { fails.push('INSERT_OFFSET_MISMATCH'); break; }
    peel = peel.slice(0, at) + peel.slice(at + ins.html.length);
  }
  if (!fails.includes('INSERT_OFFSET_MISMATCH') && peel !== before) fails.push('NOT_ADDITIVE_ONLY');

  // 2) 구조 불변
  const h2Seq = (h) => [...h.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => htmlText(m[1])).join('|');
  if (h2Seq(before) !== h2Seq(after)) fails.push('H2_SEQUENCE_CHANGED');
  const clsSet = (h) => [...new Set([...h.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))].sort().join(',');
  if (clsSet(before) !== clsSet(after)) fails.push('CLASS_SET_CHANGED');
  const wrapper = (h) => (h.match(/^<div class="[^"]*"/) ?? [''])[0];
  if (wrapper(before) !== wrapper(after)) fails.push('WRAPPER_CHANGED');
  const foot = (h) => (h.match(/<div class="sd-foot">[\s\S]*?<\/div>/) ?? [''])[0];
  if (foot(before) !== foot(after)) fails.push('FOOTER_CHANGED');
  const cardSeq = (h) => [...h.matchAll(/<div class="(sd-[^"]*)"/g)].map((m) => m[1]).join('|');
  if (cardSeq(before) !== cardSeq(after)) fails.push('CARD_ORDER_CHANGED');

  // 3) 태그 균형 (삽입한 li/ul)
  for (const t of ['ul', 'li', 'div', 'h2']) {
    const o = (after.match(new RegExp(`<${t}\\b`, 'g')) ?? []).length;
    const c = (after.match(new RegExp(`</${t}>`, 'g')) ?? []).length;
    if (o !== c) fails.push(`TAG_UNBALANCED_${t.toUpperCase()}`);
  }

  // 4) DRIVER 형식 교체 금지 — driver 고유 표지가 새로 생기지 않았는지
  const DRIVER_MARKS = ['이 제품은 식약처에 신고된 건강기능식품입니다', '주요 기능성', '매장 전문가 문의 안내', '확인 가능한 기준·규격 정보'];
  for (const mk of DRIVER_MARKS) {
    if (!before.includes(mk) && after.includes(mk)) fails.push('DRIVER_FORMAT_INJECTED');
  }

  // 5) 삽입 텍스트가 공식 원문 절과 동일한지 (원문 밖 문구 금지)
  for (const ins of plan.inserts) {
    if (!after.includes(ins.html)) fails.push('INSERTED_HTML_ABSENT');
  }
  return [...new Set(fails)];
}

export function createFunctionPatcher() {
  return { analyzeTarget, applyPatch, verifyPatch, findFunctionalSections, clauseCoverage, cmpText, htmlText, norm, flat, esc };
}
