/**
 * Server-side Forum content normalization
 *
 * WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C
 *
 * `@o4o/forum-core` 의 `normalizeContent()` 는 브라우저 전용 `DOMParser` 를 쓴다.
 * 공통 write 계약(`POST/PUT /forum/posts`)은 HTML string 을 허용하므로, Node 런타임에서는
 * 같은 Block 매핑을 `node-html-parser`(api-server 기존 의존성) 로 수행한다.
 *
 * Block 매핑 규칙은 `packages/forum-core/src/utils/htmlToBlocks.ts` 와 동일하다.
 */
import { parse as parseHtml, type HTMLElement, type Node as HtmlNode } from 'node-html-parser';

type Block = {
  id: string;
  type: string;
  content: any;
  attributes?: Record<string, any>;
};

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

function elementToBlock(element: HTMLElement, index: number): Block | null {
  const tagName = (element.rawTagName || '').toLowerCase();
  const textContent = (element.textContent || '').trim();

  switch (tagName) {
    case 'p':
      return { id: `block-${index}`, type: 'paragraph', content: element.innerHTML };

    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return {
        id: `block-${index}`,
        type: 'heading',
        content: textContent,
        attributes: { level: parseInt(tagName[1], 10) },
      };

    case 'blockquote':
      return { id: `block-${index}`, type: 'quote', content: textContent };

    case 'ul':
    case 'ol': {
      const items = element
        .querySelectorAll('li')
        .map((li) => (li.textContent || '').trim());
      return {
        id: `block-${index}`,
        type: 'list',
        content: { items },
        attributes: { ordered: tagName === 'ol' },
      };
    }

    case 'pre': {
      // node-html-parser 는 <pre> 내부를 raw text 로 보존한다 (block text element).
      // 브라우저 구현과 동일하게 <code> 안쪽 텍스트만 남긴다.
      const codeElement = element.querySelector('code');
      let code = codeElement ? codeElement.textContent || '' : textContent;
      if (!codeElement && code.includes('<')) {
        code = (parseHtml(code).textContent || '').trim();
      }
      return { id: `block-${index}`, type: 'code', content: code };
    }

    case 'img': {
      const src = element.getAttribute('src') || '';
      const alt = element.getAttribute('alt') || '';
      return {
        id: `block-${index}`,
        type: 'image',
        content: { src, alt },
        attributes: { src, alt },
      };
    }

    case 'hr':
      return { id: `block-${index}`, type: 'divider', content: null };

    default:
      if (textContent) {
        return { id: `block-${index}`, type: 'paragraph', content: element.innerHTML };
      }
      return null;
  }
}

/** HTML string → Block[] (Node 런타임 전용) */
export function htmlToBlocksServer(html: string): Block[] {
  if (!html || html.trim() === '') return [];

  const root = parseHtml(html);
  const blocks: Block[] = [];

  root.childNodes.forEach((node: HtmlNode, index: number) => {
    if (node.nodeType === TEXT_NODE) {
      const text = (node.textContent || '').trim();
      if (text) blocks.push({ id: `block-${index}`, type: 'paragraph', content: text });
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) return;
    const block = elementToBlock(node as HTMLElement, index);
    if (block) blocks.push(block);
  });

  return blocks;
}

/**
 * Block[] · HTML string · plain text 를 모두 Block[] 로 정규화한다.
 * `@o4o/forum-core` 의 `normalizeContent()` 와 동작이 같고, DOMParser 를 쓰지 않는다.
 */
export function normalizeForumContentServer(content: any): Block[] {
  if (Array.isArray(content)) return content;

  if (typeof content === 'string') {
    if (content.includes('<')) return htmlToBlocksServer(content);
    return [{ id: 'block-0', type: 'paragraph', content }];
  }

  return [];
}
