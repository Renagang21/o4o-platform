/**
 * 운영 본문 **부분 편집** core (SSOT).
 *
 * 전체 재렌더를 하지 않는다. 선행 산출물(설명서 객체)은 이후 이름 정비 WO 로 337건이 이미 어긋나 있어
 * 재렌더는 운영본을 되돌릴 위험이 있다. 여기서는 **기존 블록을 그대로 두고** 결손 절만 끼워 넣는다.
 *
 * 본문 계약(`cosmetics-productmaster-apply-pilot/render.mjs`): 블록을 `\n` 으로 이어 붙인다.
 */
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 렌더러가 쓰는 절 순서. 새 절은 이 순서를 지켜 들어간다. */
const SECTION_ORDER = ['주요 특징', '제품 포인트', '주요 성분', '사용감', '사용 방법', '사용 상황', '주의사항', '구성'];

const sectionTitle = (block) => block.match(/^<h3>([^<]+)<\/h3>/)?.[1] ?? null;
const isTail = (block) => /^<p><small>/.test(block);

/** 새 절이 들어갈 블록 인덱스. */
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

/**
 * 본문에 결손 절을 끼워 넣는다.
 *
 * @param {string} content 운영 DB 본문
 * @param {{features?: string[], usage?: string|null, replaceOneLineType?: {from: string, to: string}|null,
 *          replaceUsage?: {from: string, to: string}|null}} add
 * @returns {{content: string, applied: string[]}}
 */
export function editContent(content, add) {
  const blocks = String(content ?? '').split('\n');
  const applied = [];

  // 1) 유형 정정 — 한 줄 설명의 유형 표기와 유형별 일반 사용 안내를 함께 맞춘다.
  if (add.replaceOneLineType) {
    const { from, to } = add.replaceOneLineType;
    const i = blocks.findIndex((b) => b.includes(`— ${esc(from)} 제품입니다.`));
    if (i >= 0) {
      blocks[i] = blocks[i].replace(`— ${esc(from)} 제품입니다.`, `— ${esc(to)} 제품입니다.`);
      applied.push('oneLineType');
    }
  }
  if (add.replaceUsage) {
    const { from, to } = add.replaceUsage;
    const i = blocks.findIndex((b) => b === `<h3>사용 방법</h3><p>${esc(from)}</p>`);
    if (i >= 0) {
      blocks[i] = `<h3>사용 방법</h3><p>${esc(to)}</p>`;
      applied.push('usageText');
    }
  }

  // 2) 주요 특징 — 있으면 항목 추가, 없으면 절을 새로 만든다.
  if (add.features?.length) {
    const i = blocks.findIndex((b) => b.startsWith('<h3>주요 특징</h3>'));
    const items = add.features.map((f) => `<li>${esc(f)}</li>`).join('');
    if (i >= 0) {
      blocks[i] = blocks[i].replace('</ul>', `${items}</ul>`);
      applied.push('featuresAppended');
    } else {
      blocks.splice(insertIndex(blocks, '주요 특징'), 0, `<h3>주요 특징</h3><ul>${items}</ul>`);
      applied.push('featuresSection');
    }
  }

  // 3) 사용 방법 — **없을 때만** 넣는다. 있는 안내를 갈아끼우지 않는다(WO §7).
  if (add.usage && !blocks.some((b) => b.startsWith('<h3>사용 방법</h3>'))) {
    blocks.splice(insertIndex(blocks, '사용 방법'), 0, `<h3>사용 방법</h3><p>${esc(add.usage)}</p>`);
    applied.push('usageSection');
  }

  return { content: blocks.join('\n'), applied };
}
