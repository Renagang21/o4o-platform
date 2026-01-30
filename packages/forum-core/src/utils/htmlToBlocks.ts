/**
 * HTML to Blocks Converter
 *
 * Converts TipTap HTML output to Block[] format for ForumBlockRenderer
 * Phase 20-A: Forum Rich Editor Integration
 */

import type { Block } from '@o4o/types';

/**
 * Convert HTML string to Block[] array
 * Handles TipTap's HTML structure and converts to our Block format
 */
export function htmlToBlocks(html: string): Block[] {
  if (!html || html.trim() === '') {
    return [];
  }

  // Create a temporary DOM to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: Block[] = [];

  // Process each top-level element in the body
  doc.body.childNodes.forEach((node, index) => {
    const block = nodeToBlock(node, index);
    if (block) {
      blocks.push(block);
    }
  });

  return blocks;
}

/**
 * Convert Block[] array to HTML string
 * For loading content into TipTap editor
 */
export function blocksToHtml(blocks: Block[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return '';
  }

  return blocks.map(blockToHtml).join('');
}

/**
 * Convert a DOM node to a Block object
 */
function nodeToBlock(node: ChildNode, index: number): Block | null {
  // Skip text nodes that are just whitespace
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (!text) return null;
    return {
      id: `block-${index}`,
      type: 'paragraph',
      content: text,
    };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  const textContent = element.textContent?.trim() || '';

  switch (tagName) {
    case 'p':
      return {
        id: `block-${index}`,
        type: 'paragraph',
        content: element.innerHTML,
      };

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
        attributes: {
          level: parseInt(tagName[1]),
        },
      };

    case 'blockquote':
      return {
        id: `block-${index}`,
        type: 'quote',
        content: textContent,
      };

    case 'ul':
    case 'ol':
      const items = Array.from(element.querySelectorAll('li')).map(
        (li) => li.textContent?.trim() || ''
      );
      return {
        id: `block-${index}`,
        type: 'list',
        content: { items },
        attributes: {
          ordered: tagName === 'ol',
        },
      };

    case 'pre':
      const codeElement = element.querySelector('code');
      const code = codeElement ? codeElement.textContent || '' : textContent;
      return {
        id: `block-${index}`,
        type: 'code',
        content: code,
      };

    case 'img':
      return {
        id: `block-${index}`,
        type: 'image',
        content: {
          src: element.getAttribute('src') || '',
          alt: element.getAttribute('alt') || '',
        },
        attributes: {
          src: element.getAttribute('src') || '',
          alt: element.getAttribute('alt') || '',
        },
      };

    case 'hr':
      return {
        id: `block-${index}`,
        type: 'divider',
        content: null,
      };

    default:
      // For unknown tags, try to preserve content as paragraph
      if (textContent) {
        return {
          id: `block-${index}`,
          type: 'paragraph',
          content: element.innerHTML,
        };
      }
      return null;
  }
}

/**
 * Convert a Block object back to HTML
 */
function blockToHtml(block: Block): string {
  const content = typeof block.content === 'string'
    ? block.content
    : block.content?.text || '';

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
      const items = block.content?.items || [];
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
      // Fallback: render as paragraph if content exists
      return content ? `<p>${content}</p>` : '';
  }
}

/**
 * Normalize content - ensure it's in Block[] format
 * Handles legacy string content by wrapping in paragraph block
 */
export function normalizeContent(content: any): Block[] {
  // Already Block[] array
  if (Array.isArray(content)) {
    return content;
  }

  // String content (legacy or HTML from editor)
  if (typeof content === 'string') {
    // If it looks like HTML, convert it
    if (content.includes('<')) {
      return htmlToBlocks(content);
    }
    // Plain text - wrap in paragraph
    return [
      {
        id: 'block-0',
        type: 'paragraph',
        content: content,
      },
    ];
  }

  // Empty or invalid
  return [];
}
