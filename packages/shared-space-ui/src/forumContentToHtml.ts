/**
 * forumContentToHtml — forum 게시글 content(Block[] | string) → HTML 문자열 변환
 *
 * WO-O4O-FORUM-DETAIL-PRIMITIVES-EXTRACTION-V1
 *
 * 4서비스 forum detail 의 content 변환 분기를 수렴하기 위한 canonical 변환기.
 * `@o4o/forum-core` 의 blocksToHtml 과 **동일한 출력**을 내도록 로컬에 복제한다.
 * (GP/K-Cosmetics Dockerfile 은 packages/forum-core 를 COPY 하지 않으므로 shared-space-ui 가
 *  forum-core 에 transitive 의존하면 빌드 실패 — forum-core import 없이 로컬 safe converter 로 둔다.)
 *
 * 최종 렌더는 각 서비스가 기존처럼 `ContentRenderer`(@o4o/content-editor) 로 수행한다.
 */

type ForumContentBlock = {
  type?: string;
  content?: string | { text?: string; items?: string[] } | null;
  attributes?: { level?: number; ordered?: boolean; src?: string; alt?: string } | null;
};

function blockToHtml(block: ForumContentBlock): string {
  const content =
    (typeof block.content === 'string'
      ? block.content
      : block.content && 'text' in block.content
        ? block.content.text
        : '') || '';

  switch (block.type) {
    case 'paragraph':
      return `<p>${content}</p>`;
    case 'heading': {
      const level = block.attributes?.level || 2;
      return `<h${level}>${content}</h${level}>`;
    }
    case 'quote':
    case 'blockquote':
      return `<blockquote><p>${content}</p></blockquote>`;
    case 'list': {
      const items =
        (block.content && typeof block.content !== 'string' ? block.content.items : undefined) || [];
      const ordered = block.attributes?.ordered || false;
      const tag = ordered ? 'ol' : 'ul';
      const listItems = items.map((item: string) => `<li>${item}</li>`).join('');
      return `<${tag}>${listItems}</${tag}>`;
    }
    case 'code':
    case 'code-block':
      return `<pre><code>${content}</code></pre>`;
    case 'image': {
      const src = block.attributes?.src || '';
      const alt = block.attributes?.alt || '';
      return `<img src="${src}" alt="${alt}" />`;
    }
    case 'divider':
    case 'separator':
      return '<hr />';
    default:
      return content ? `<p>${content}</p>` : '';
  }
}

/**
 * content 가 Block[] 이면 blocksToHtml 동일 변환, string 이면 그대로 통과(이미 HTML/문자열),
 * 그 외(null/undefined)면 빈 문자열.
 * 서비스별 고유 변환(예: Neture legacy escape, GP plain-text)을 유지하려면 호출측이
 * 직접 변환해 ForumPostContent 의 `html` prop 으로 넘긴다.
 */
export function forumContentToHtml(content: unknown): string {
  if (Array.isArray(content)) {
    return (content as ForumContentBlock[]).map(blockToHtml).join('');
  }
  if (typeof content === 'string') {
    return content;
  }
  return '';
}
