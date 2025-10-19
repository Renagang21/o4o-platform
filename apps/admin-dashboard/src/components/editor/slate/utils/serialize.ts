/**
 * HTML Serialization Utilities
 *
 * Converts between Slate.js JSON and HTML for Gutenberg compatibility:
 * - serialize: Slate JSON → HTML
 * - deserialize: HTML → Slate JSON
 *
 * Based on Slate.js serialization pattern:
 * https://docs.slatejs.org/concepts/10-serializing
 */

import { Descendant, Text, Element as SlateElement } from 'slate';
import type { CustomElement, CustomText, ParagraphElement, HeadingElement, LinkElement } from '../types/slate-types';

/**
 * Serialize Slate value to HTML
 *
 * Converts Slate JSON to HTML string for saving to Gutenberg
 */
export const serialize = (nodes: Descendant[]): string => {
  return nodes.map((node) => serializeNode(node)).join('');
};

/**
 * Serialize a single node to HTML
 */
const serializeNode = (node: Descendant): string => {
  if (Text.isText(node)) {
    return serializeText(node as CustomText);
  }

  const element = node as CustomElement;
  const children = element.children.map((n) => serializeNode(n)).join('');

  switch (element.type) {
    case 'paragraph':
      return serializeParagraph(element as ParagraphElement, children);
    case 'heading':
      return serializeHeading(element as HeadingElement, children);
    case 'link':
      return serializeLink(element as LinkElement, children);
    default:
      return children;
  }
};

/**
 * Serialize text with formatting
 */
const serializeText = (text: CustomText): string => {
  let string = escapeHtml(text.text);

  if (text.code) {
    string = `<code>${string}</code>`;
  }

  if (text.bold) {
    string = `<strong>${string}</strong>`;
  }

  if (text.italic) {
    string = `<em>${string}</em>`;
  }

  if (text.underline) {
    string = `<u>${string}</u>`;
  }

  if (text.strikethrough) {
    string = `<s>${string}</s>`;
  }

  return string;
};

/**
 * Serialize paragraph element
 */
const serializeParagraph = (element: ParagraphElement, children: string): string => {
  const style = element.align && element.align !== 'left'
    ? ` style="text-align: ${element.align}"`
    : '';

  return `<p${style}>${children || '<br>'}</p>`;
};

/**
 * Serialize heading element
 */
const serializeHeading = (element: HeadingElement, children: string): string => {
  const style = element.align && element.align !== 'left'
    ? ` style="text-align: ${element.align}"`
    : '';

  return `<h${element.level}${style}>${children || '<br>'}</h${element.level}>`;
};

/**
 * Serialize link element
 */
const serializeLink = (element: LinkElement, children: string): string => {
  return `<a href="${escapeHtml(element.url)}">${children}</a>`;
};

/**
 * Deserialize HTML to Slate value
 *
 * Converts HTML string from Gutenberg to Slate JSON
 */
export const deserialize = (html: string): Descendant[] => {
  const document = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(document.body.childNodes)
    .map((node) => deserializeNode(node))
    .filter((node): node is Descendant => node !== null);
};

/**
 * Deserialize a single DOM node to Slate node
 */
const deserializeNode = (domNode: ChildNode): Descendant | null => {
  // Text node
  if (domNode.nodeType === Node.TEXT_NODE) {
    const text = domNode.textContent || '';
    if (!text.trim()) return null;
    return { text };
  }

  // Element node
  if (domNode.nodeType === Node.ELEMENT_NODE) {
    const element = domNode as HTMLElement;
    return deserializeElement(element);
  }

  return null;
};

/**
 * Deserialize HTML element to Slate element
 */
const deserializeElement = (el: HTMLElement): Descendant | null => {
  const tagName = el.tagName.toLowerCase();

  // Get text content with formatting
  const children = Array.from(el.childNodes)
    .map((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return deserializeTextWithFormat(node, el);
      }
      return deserializeNode(node);
    })
    .filter((node): node is Descendant => node !== null);

  // Ensure at least one child
  if (children.length === 0) {
    children.push({ text: '' });
  }

  // Handle different HTML tags
  switch (tagName) {
    case 'p': {
      const align = getAlignment(el);
      const paragraph: ParagraphElement = {
        type: 'paragraph',
        ...(align && { align }),
        children: children as (CustomText | LinkElement)[],
      };
      return paragraph;
    }
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = parseInt(tagName.charAt(1)) as 1 | 2 | 3 | 4 | 5 | 6;
      const align = getAlignment(el);
      const heading: HeadingElement = {
        type: 'heading',
        level,
        ...(align && { align }),
        children: children as (CustomText | LinkElement)[],
      };
      return heading;
    }
    case 'a': {
      const link: LinkElement = {
        type: 'link',
        url: el.getAttribute('href') || '',
        children: children as CustomText[],
      };
      return link;
    }
    case 'br':
      return { text: '\n' };
    case 'strong':
    case 'b':
      return {
        text: el.textContent || '',
        bold: true,
      };
    case 'em':
    case 'i':
      return {
        text: el.textContent || '',
        italic: true,
      };
    case 'u':
      return {
        text: el.textContent || '',
        underline: true,
      };
    case 's':
    case 'del':
    case 'strike':
      return {
        text: el.textContent || '',
        strikethrough: true,
      };
    case 'code':
      return {
        text: el.textContent || '',
        code: true,
      };
    default:
      // For unknown tags, just return the text content
      if (children.length > 0) {
        return {
          type: 'paragraph',
          children: children as (CustomText | LinkElement)[],
        } as ParagraphElement;
      }
      return null;
  }
};

/**
 * Deserialize text node with formatting from parent element
 */
const deserializeTextWithFormat = (textNode: ChildNode, parent: HTMLElement): CustomText => {
  const text = textNode.textContent || '';
  const parentTag = parent.tagName.toLowerCase();

  const formattedText: CustomText = { text };

  if (parentTag === 'strong' || parentTag === 'b') {
    formattedText.bold = true;
  }

  if (parentTag === 'em' || parentTag === 'i') {
    formattedText.italic = true;
  }

  if (parentTag === 'u') {
    formattedText.underline = true;
  }

  if (parentTag === 's' || parentTag === 'del' || parentTag === 'strike') {
    formattedText.strikethrough = true;
  }

  if (parentTag === 'code') {
    formattedText.code = true;
  }

  return formattedText;
};

/**
 * Get text alignment from element style
 */
const getAlignment = (el: HTMLElement): ParagraphElement['align'] | undefined => {
  const align = el.style.textAlign;
  if (align === 'center' || align === 'right' || align === 'justify') {
    return align;
  }
  return undefined;
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
};

/**
 * Create empty paragraph
 */
export const createEmptyParagraph = (): ParagraphElement => ({
  type: 'paragraph',
  children: [{ text: '' }],
});
