/**
 * Clipboard Utilities
 * Handle block copy/paste operations with HTML + JSON support
 *
 * Extracted from GutenbergBlockEditor to reduce file complexity
 */

import { Block } from '@/types/post.types';

/**
 * Convert a block to HTML representation
 */
export function blockToHTML(block: Block): string {
  const { type, content } = block;

  // Handle different block types
  if (type === 'o4o/paragraph') {
    return `<p class="block-paragraph">${content?.text || ''}</p>`;
  } else if (type === 'o4o/heading') {
    const level = content?.level || 2;
    return `<h${level} class="block-heading">${content?.text || ''}</h${level}>`;
  } else if (type === 'o4o/image') {
    return `<figure class="block-image"><img src="${content?.url || ''}" alt="${content?.alt || ''}" /></figure>`;
  } else if (type === 'o4o/list') {
    const tag = content?.ordered ? 'ol' : 'ul';
    const items = (content?.items || []).map((item: string) => `<li>${item}</li>`).join('');
    return `<${tag} class="block-list">${items}</${tag}>`;
  } else if (type === 'o4o/quote') {
    return `<blockquote class="block-quote"><p>${content?.text || ''}</p><cite>${content?.citation || ''}</cite></blockquote>`;
  } else if (type === 'o4o/code') {
    return `<pre class="block-code"><code>${content?.code || ''}</code></pre>`;
  } else if (type === 'o4o/button') {
    return `<a href="${content?.url || '#'}" class="block-button">${content?.text || 'Button'}</a>`;
  }

  // Default fallback
  return `<div class="block-${type.replace('/', '-')}" data-block-type="${type}">${JSON.stringify(content)}</div>`;
}

/**
 * Parse HTML to block
 */
export function htmlToBlock(html: string): Block | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const element = doc.body.firstChild as HTMLElement;

  if (!element) return null;

  const tagName = element.tagName.toLowerCase();
  const className = element.className;

  // Try to parse based on tag name and class
  if (tagName === 'p' || className.includes('block-paragraph')) {
    return {
      id: `block-${Date.now()}`,
      type: 'o4o/paragraph',
      content: { text: element.textContent || '' },
      attributes: {}
    };
  } else if (tagName.match(/^h[1-6]$/) || className.includes('block-heading')) {
    const level = parseInt(tagName.charAt(1)) || 2;
    return {
      id: `block-${Date.now()}`,
      type: 'o4o/heading',
      content: { text: element.textContent || '', level },
      attributes: {}
    };
  } else if ((tagName === 'ul' || tagName === 'ol') || className.includes('block-list')) {
    const items = Array.from(element.querySelectorAll('li')).map(li => li.textContent || '');
    return {
      id: `block-${Date.now()}`,
      type: 'o4o/list',
      content: { items, ordered: tagName === 'ol' },
      attributes: {}
    };
  } else if (tagName === 'blockquote' || className.includes('block-quote')) {
    const text = element.querySelector('p')?.textContent || '';
    const citation = element.querySelector('cite')?.textContent || '';
    return {
      id: `block-${Date.now()}`,
      type: 'o4o/quote',
      content: { text, citation },
      attributes: {}
    };
  } else if (tagName === 'pre' || className.includes('block-code')) {
    const code = element.querySelector('code')?.textContent || element.textContent || '';
    return {
      id: `block-${Date.now()}`,
      type: 'o4o/code',
      content: { code },
      attributes: {}
    };
  } else if (tagName === 'figure' && element.querySelector('img')) {
    const img = element.querySelector('img')!;
    return {
      id: `block-${Date.now()}`,
      type: 'o4o/image',
      content: { url: img.src, alt: img.alt },
      attributes: {}
    };
  }

  // Fallback to paragraph
  return {
    id: `block-${Date.now()}`,
    type: 'o4o/paragraph',
    content: { text: element.textContent || '' },
    attributes: {}
  };
}

/**
 * Copy block to clipboard with HTML + JSON support
 */
export async function copyBlockToClipboard(
  block: Block,
  setCopiedBlock: (block: Block) => void
): Promise<void> {
  setCopiedBlock({ ...block });

  try {
    // Prepare both HTML and JSON representations
    const jsonContent = JSON.stringify(block);
    const htmlContent = blockToHTML(block);

    // Use ClipboardItem API for multi-format clipboard
    if (typeof ClipboardItem !== 'undefined') {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([jsonContent], { type: 'text/plain' }),
        'application/json': new Blob([jsonContent], { type: 'application/json' })
      });
      await navigator.clipboard.write([clipboardItem]);
    } else {
      // Fallback for browsers without ClipboardItem
      await navigator.clipboard.writeText(jsonContent);
    }
  } catch (error) {
    // 클립보드 접근 실패 시 내부 상태만 사용
    console.warn('Clipboard write failed, using internal state only:', error);
  }
}

/**
 * Paste block from clipboard with multi-format support
 */
export async function pasteBlockFromClipboard(
  copiedBlock: Block | null
): Promise<Block | null> {
  let newBlock: Block | null = null;

  // Try to read from system clipboard first
  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        // Try JSON first (most accurate)
        if (item.types.includes('application/json')) {
          const blob = await item.getType('application/json');
          const text = await blob.text();
          const parsedBlock = JSON.parse(text) as Block;
          newBlock = { ...parsedBlock, id: `block-${Date.now()}` };
          break;
        }
        // Try plain text JSON
        else if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          try {
            const parsedBlock = JSON.parse(text) as Block;
            if (parsedBlock.type && parsedBlock.content) {
              newBlock = { ...parsedBlock, id: `block-${Date.now()}` };
              break;
            }
          } catch {
            // Not JSON, will try HTML next
          }
        }
        // Try HTML
        if (!newBlock && item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const html = await blob.text();
          newBlock = htmlToBlock(html);
          break;
        }
      }
    } else {
      // Fallback: try readText
      const text = await navigator.clipboard.readText();
      try {
        const parsedBlock = JSON.parse(text) as Block;
        if (parsedBlock.type && parsedBlock.content) {
          newBlock = { ...parsedBlock, id: `block-${Date.now()}` };
        }
      } catch {
        // Not JSON, create as paragraph
        newBlock = {
          id: `block-${Date.now()}`,
          type: 'o4o/paragraph',
          content: { text },
          attributes: {}
        };
      }
    }
  } catch (error) {
    console.warn('Clipboard read failed, using internal state:', error);
  }

  // Fallback to internal copiedBlock state
  if (!newBlock && copiedBlock) {
    newBlock = {
      ...copiedBlock,
      id: `block-${Date.now()}`,
    };
  }

  return newBlock;
}
