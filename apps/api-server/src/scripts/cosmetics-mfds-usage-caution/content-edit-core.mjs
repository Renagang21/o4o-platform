/**
 * 운영 본문 **부분 편집** core (SSOT).
 *
 * 전면 재렌더를 하지 않는다(WO §4). 기존 블록은 그대로 두고 해당 절만 교체·삽입한다.
 * 본문 계약: 블록을 `\n` 으로 이어 붙인다 → **새 블록 안에 개행을 넣지 않는다.**
 */
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SECTION_ORDER = ['주요 특징', '제품 포인트', '주요 성분', '사용감', '사용 방법', '사용 상황', '주의사항', '구성'];

const sectionTitle = (block) => block.match(/^<h3>([^<]+)<\/h3>/)?.[1] ?? null;
const isTail = (block) => /^<p><small>/.test(block);

function insertIndex(blocks, title) {
  const rank = SECTION_ORDER.indexOf(title);
  for (let i = 0; i < blocks.length; i += 1) {
    const t = sectionTitle(blocks[i]);
    if (t) {
      const r = SECTION_ORDER.indexOf(t);
      if (r > rank) return i;
    } else if (isTail(blocks[i])) {
      return i;
    }
  }
  return blocks.length;
}

/** 주의사항 절 — 원문 줄을 **한 줄도 바꾸지 않고** 항목으로 옮긴다. */
export const cautionBlock = (lines) => `<h3>주의사항</h3><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;

export const usageBlock = (text) => `<h3>사용 방법</h3><p>${esc(text)}</p>`;

/**
 * @param {string} content 운영 DB 본문
 * @param {{usage?: string|null, cautionLines?: string[]|null}} add
 */
export function editContent(content, add) {
  const blocks = String(content ?? '').split('\n');
  const applied = [];

  if (add.usage) {
    const i = blocks.findIndex((b) => b.startsWith('<h3>사용 방법</h3>'));
    if (i >= 0) {
      blocks[i] = usageBlock(add.usage);
      applied.push('usageReplaced');
    } else {
      blocks.splice(insertIndex(blocks, '사용 방법'), 0, usageBlock(add.usage));
      applied.push('usageInserted');
    }
  }

  if (add.cautionLines?.length && !blocks.some((b) => b.startsWith('<h3>주의사항</h3>'))) {
    blocks.splice(insertIndex(blocks, '주의사항'), 0, cautionBlock(add.cautionLines));
    applied.push('cautionInserted');
  }

  return { content: blocks.join('\n'), applied };
}
