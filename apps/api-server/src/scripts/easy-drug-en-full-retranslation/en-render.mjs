/**
 * EN 저장본 직렬화 (번역 생산 아님 — 검증 완료 세그먼트 원장을 HTML 로 되돌리는 결정적 변환).
 *
 * production artifact(en-units.jsonl)는 세그먼트 원장이지 HTML 이 아니다. DB 에 넣으려면
 * HTML 로 되돌려야 하는데, 마크업을 새로 만들면 KO 와 구조가 달라진다. 그래서
 * **KO canonical HTML 을 템플릿으로 쓰고 텍스트 노드만 EN 으로 치환한다.**
 *
 * ── 왜 segment(enHtml) 로 왕복 검증하지 않는가 ────────────────────────────────
 * extract-units.segment() 는 **KO 전용 파서**다. sd-tag 라벨이 한국어(`제품명` 등)일 때만
 * FIXED_IDENTITY 를 알아보고, 문장 분리도 KO 기준이다. EN HTML 을 그 파서에 넣으면
 * 라벨이 영어라 FIXED_IDENTITY 판정이 깨지고 값 노드가 BODY 로 재분리된다(실측: 30 vs 28).
 * 그러므로 EN 쪽은 **텍스트 노드 단위**로 검증한다 — 노드 개수와 노드별 텍스트가
 * 의도한 값과 정확히 일치하면 정렬은 증명된다. 문장 재분리는 HTML 내용과 무관하다.
 *
 * ── 정렬 증명 3단 ────────────────────────────────────────────────────────────
 *  1) 내 분류기를 KO HTML 에 돌린 결과의 kind 시퀀스 == segment(koHtml) 의 kind 시퀀스
 *     (정본 파서와의 등가성. 내가 복제한 상태기계가 틀리면 여기서 걸린다)
 *  2) enSegments 의 kind 시퀀스 == segment(koHtml) 의 kind 시퀀스,
 *     그리고 FIXED_IDENTITY 세그먼트는 텍스트까지 동일(고정 식별자는 한국어 그대로 유지)
 *     (생산 artifact ↔ 현재 KO 정합성)
 *  3) textNodes(enHtml) == 노드별로 배정한 EN 텍스트  (직렬화 무결성)
 */
import { segment } from './extract-units.mjs';
import { BADGE } from './en-frame.mjs';

const FIXED_TAGS = new Set(['제품명', '제조·수입사', '품목기준코드', '제형', '성상', '함량', '포장단위']);
const TOKEN_RE = () => /<([a-z0-9]+)([^>]*)>|<\/([a-z0-9]+)>|([^<]+)/gi;

/** raw 텍스트 노드가 만들어내는 세그먼트 수와 종류를 segment() 와 동일한 규칙으로 판정한다. */
function classifyTextNode(raw, cur, pendingTag) {
  if (cur.tag === 'h2') return { n: 1, kind: 'HEADING', clearPending: false };
  if (cur.tag === 'h1') return { n: 1, kind: 'FIXED_IDENTITY', clearPending: false };
  if (cur.tag === 'span' && cur.cls.includes('sd-tag')) return { n: 1, kind: 'HEADING', setPending: raw, clearPending: false };
  if (cur.cls.includes('sd-badge') || cur.cls.includes('sd-meta')) return { n: 1, kind: 'FIXED_IDENTITY', clearPending: false };
  if (pendingTag && FIXED_TAGS.has(pendingTag)) return { n: 1, kind: 'FIXED_IDENTITY', clearPending: true };
  const parts = raw.split(/(?<=[.。])\s+/).map((x) => x.trim()).filter(Boolean);
  return { n: parts.length, kind: 'BODY', clearPending: true };
}

/** 마크업을 무시하고 비어있지 않은 텍스트 노드의 정규화 텍스트만 순서대로 뽑는다. */
export function textNodes(html) {
  const out = [];
  const re = TOKEN_RE();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!m[4]) continue;
    const t = m[4].replace(/&nbsp;/g, ' ').trim();
    if (t) out.push(t);
  }
  return out;
}

/**
 * KO HTML + EN 세그먼트 원장 → EN HTML.
 * 정렬이 조금이라도 어긋나면 throw 한다(호출측에서 BLOCK_PRODUCTION_ARTIFACT_MISMATCH 로 처리).
 * @returns {{ html: string, consumed: number, nodeTexts: string[] }}
 */
export function renderEnHtml(koHtml, enSegments) {
  // 1) 정본 파서로 KO 를 파싱해 기준 시퀀스를 만든다.
  const koSegs = segment(koHtml);
  if (koSegs.length !== enSegments.length) {
    throw new Error(`KO 세그먼트 ${koSegs.length} != EN 원장 ${enSegments.length}`);
  }
  for (let i = 0; i < koSegs.length; i++) {
    if (koSegs[i].kind !== enSegments[i].kind) throw new Error(`#${i} kind ${koSegs[i].kind} != ${enSegments[i].kind}`);
    if ((koSegs[i].field ?? null) !== (enSegments[i].field ?? null)) throw new Error(`#${i} field 불일치`);
    // FIXED_IDENTITY 는 원칙적으로 한국어 원문 유지지만, 구분 배지(일반/전문의약품)만은
    // en-frame 의 고정 어휘로 번역된다. 그 둘 외의 값이 오면 정렬이 깨진 것이다.
    if (koSegs[i].kind === 'FIXED_IDENTITY') {
      const koText = koSegs[i].text;
      const enText = enSegments[i].text;
      if (enText !== koText && enText !== BADGE[koText]) {
        throw new Error(`#${i} FIXED_IDENTITY 텍스트 불일치: KO="${koText.slice(0, 40)}" EN="${enText.slice(0, 40)}"`);
      }
    }
  }

  // 2) 같은 상태기계를 다시 돌며 텍스트 노드만 치환한다.
  let out = '';
  let cursor = 0;
  let lastOpen = { tag: '?', cls: '' };
  let pendingTag = null;
  const kindSeq = [];
  const nodeTexts = [];
  const re = TOKEN_RE();
  let m;
  while ((m = re.exec(koHtml)) !== null) {
    const [whole, openTag, attrs, closeTag, text] = m;
    if (openTag) {
      lastOpen = { tag: openTag.toLowerCase(), cls: /class="([^"]*)"/.exec(attrs || '')?.[1] ?? '' };
      out += whole;
      continue;
    }
    if (closeTag || !text) { out += whole; continue; }

    const norm = text.replace(/&nbsp;/g, ' ');
    const raw = norm.trim();
    if (!raw) { out += norm; continue; }

    const c = classifyTextNode(raw, lastOpen, pendingTag);
    const taken = enSegments.slice(cursor, cursor + c.n);
    if (taken.length !== c.n) throw new Error(`EN 세그먼트 부족: need ${c.n} at cursor ${cursor}`);
    cursor += c.n;
    for (let i = 0; i < c.n; i++) kindSeq.push(c.kind);
    if (c.setPending !== undefined) pendingTag = c.setPending;
    else if (c.clearPending) pendingTag = null;

    const joined = taken.map((s) => s.text).join(' ').trim();
    if (!joined) throw new Error(`빈 EN 텍스트 at cursor ${cursor - c.n}`);
    // `<` 만 파싱을 깬다. `>` 는 수식 표기(`pH > 7.44`)로 실제 등장하며 HTML 텍스트에서 유효하다.
    if (joined.includes('<')) throw new Error(`EN 텍스트에 '<' 포함 at cursor ${cursor - c.n}`);
    nodeTexts.push(joined);

    // 마크업 사이 들여쓰기(앞뒤 공백)는 원문 그대로 두고 가운데만 교체한다.
    const lead = norm.slice(0, norm.length - norm.trimStart().length);
    const tail = norm.slice(norm.trimEnd().length);
    out += lead + joined + tail;
  }

  if (cursor !== enSegments.length) throw new Error(`consumed ${cursor} != ${enSegments.length}`);
  // 내 분류기가 정본 파서와 같은 kind 시퀀스를 냈는지 확인한다.
  for (let i = 0; i < kindSeq.length; i++) {
    if (kindSeq[i] !== koSegs[i].kind) throw new Error(`분류기 등가성 위반 #${i}: ${kindSeq[i]} != ${koSegs[i].kind}`);
  }
  return { html: out, consumed: cursor, nodeTexts };
}

/** 직렬화 결과를 텍스트 노드 단위로 되읽어 의도한 값과 같은지 확인한다. 다르면 적용 금지. */
export function verifyRoundTrip(enHtml, nodeTexts) {
  const back = textNodes(enHtml);
  if (back.length !== nodeTexts.length) return { ok: false, reason: `text node ${back.length} != ${nodeTexts.length}` };
  for (let i = 0; i < back.length; i++) {
    if (back[i] !== nodeTexts[i]) return { ok: false, reason: `text node #${i} 불일치` };
  }
  return { ok: true };
}
