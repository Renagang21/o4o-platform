/** Internal AiContentModal format conversion; not a package public API. */
export interface UrlBlock {
  id?: string;
  type: string;
  content?: string;
  attributes?: Record<string, any>;
  innerBlocks?: UrlBlock[];
}

/**
 * HTML → Forum Block[] 변환 (프론트엔드 전용, DOMParser 사용)
 * WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1:
 *   forum post API는 Block[] JSON을 기대하지만 백엔드 normalizeContent가
 *   Node.js에서 DOMParser를 호출하므로 실패함 → 프론트에서 미리 변환해서 전달
 */
export function htmlToForumBlocks(html: string): object[] {
  if (!html || !html.trim()) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: object[] = [];
  doc.body.childNodes.forEach((node, index) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      blocks.push({ id: `b${index}`, type: 'heading', content: el.textContent || '', attributes: { level: parseInt(tag[1]) } });
    } else if (tag === 'p') {
      const text = el.textContent?.trim();
      if (text) blocks.push({ id: `b${index}`, type: 'paragraph', content: el.innerHTML });
    } else if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(el.querySelectorAll('li')).map((li) => li.textContent?.trim() || '').filter(Boolean);
      if (items.length) blocks.push({ id: `b${index}`, type: 'list', content: { items }, attributes: { ordered: tag === 'ol' } });
    } else if (tag === 'blockquote') {
      const text = el.textContent?.trim();
      if (text) blocks.push({ id: `b${index}`, type: 'quote', content: text });
    } else if (tag === 'div' && el.getAttribute('data-youtube-video')) {
      const iframe = el.querySelector('iframe');
      const src = iframe?.getAttribute('src') || '';
      if (src) blocks.push({ id: `b${index}`, type: 'paragraph', content: `[YouTube: ${src}]` });
    } else {
      const text = el.textContent?.trim();
      if (text) blocks.push({ id: `b${index}`, type: 'paragraph', content: el.innerHTML });
    }
  });
  return blocks;
}

/** Block[] → HTML 변환 (RichTextEditor TipTap 기반) */
export function blocksToHtml(blocks: UrlBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'o4o/heading': {
          const level = block.attributes?.level || 2;
          return `<h${level}>${block.content || ''}</h${level}>`;
        }
        case 'o4o/paragraph':
          return `<p>${block.content || ''}</p>`;
        case 'o4o/list': {
          const ordered = block.attributes?.ordered;
          const tag = ordered ? 'ol' : 'ul';
          return `<${tag}>${block.content || ''}</${tag}>`;
        }
        case 'o4o/youtube': {
          const url = block.attributes?.url || block.attributes?.src || '';
          if (!url) return '';
          const embedUrl = url.includes('watch?v=')
            ? url.replace('watch?v=', 'embed/')
            : url;
          // WO-O4O-AI-CONTENT-EDITOR-YOUTUBE-RENDER-V1:
          //   TipTap @tiptap/extension-youtube 의 parseHTML 규칙은
          //     { tag: 'div[data-youtube-video] iframe' }
          //   raw <iframe> 단독은 setContent 시 drop 되므로 wrapper 필수.
          return `<div data-youtube-video><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
        }
        case 'o4o/image': {
          const src = block.attributes?.url || block.attributes?.src || '';
          const alt = block.attributes?.alt || '';
          return src ? `<img src="${src}" alt="${alt}" style="max-width:100%;" />` : '';
        }
        case 'o4o/columns':
        case 'o4o/group': {
          if (block.innerBlocks && block.innerBlocks.length > 0) {
            return `<div>${blocksToHtml(block.innerBlocks)}</div>`;
          }
          return block.content ? `<div>${block.content}</div>` : '';
        }
        default:
          return block.content ? `<p>${block.content}</p>` : '';
      }
    })
    .filter(Boolean)
    .join('\n');
}
