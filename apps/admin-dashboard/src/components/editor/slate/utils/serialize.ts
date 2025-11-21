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
import type { CustomElement, CustomText, ParagraphElement, HeadingElement, LinkElement, ListElement, ListItemElement } from '../types/slate-types';
import { isListItemElement } from '../types/slate-types';

/**
 * Serialize Slate value to HTML
 *
 * Converts Slate JSON to HTML string for saving to Gutenberg
 */
export const serialize = (nodes: Descendant[] | undefined | null): string => {
  // Safely handle undefined/null nodes
  if (!nodes || !Array.isArray(nodes)) {
    return '';
  }

  const safeNodes = nodes.filter(Boolean);
  return safeNodes.map((node) => serializeNode(node)).join('');
};

/**
 * Serialize a single node to HTML
 */
const serializeNode = (node: Descendant): string => {
  if (Text.isText(node)) {
    return serializeText(node as CustomText);
  }

  const element = node as CustomElement;

  // Safely handle children - provide default empty array if undefined
  const safeChildren = (element.children ?? []).filter(Boolean);
  const children = safeChildren.map((n) => serializeNode(n)).join('');

  switch (element.type) {
    case 'paragraph':
      return serializeParagraph(element as ParagraphElement, children);
    case 'heading':
      return serializeHeading(element as HeadingElement, children);
    case 'link':
      return serializeLink(element as LinkElement, children);
    case 'ordered-list':
      return serializeOrderedList(element as ListElement, children);
    case 'unordered-list':
      return serializeUnorderedList(element as ListElement, children);
    case 'list-item':
      return serializeListItem(element as ListItemElement, children);
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
 *
 * Returns complete HTML with <p> wrapper for proper rendering.
 */
const serializeParagraph = (element: ParagraphElement, children: string): string => {
  // Return complete HTML with <p> tag
  return `<p>${children || '<br>'}</p>`;
};

/**
 * Serialize heading element
 *
 * Returns complete HTML with <h1>-<h6> wrapper for proper rendering.
 */
const serializeHeading = (element: HeadingElement, children: string): string => {
  // Return complete HTML with heading tag
  const level = element.level || 2;
  return `<h${level}>${children || '<br>'}</h${level}>`;
};

/**
 * Serialize link element
 */
const serializeLink = (element: LinkElement, children: string): string => {
  const target = element.target ? ` target="${element.target}"` : '';
  const rel = element.target === '_blank' ? ' rel="noopener noreferrer"' : '';
  return `<a href="${escapeHtml(element.url)}"${target}${rel}>${children}</a>`;
};

/**
 * Serialize ordered list element
 */
const serializeOrderedList = (element: ListElement, children: string): string => {
  return `<ol>${children}</ol>`;
};

/**
 * Serialize unordered list element
 */
const serializeUnorderedList = (element: ListElement, children: string): string => {
  return `<ul>${children}</ul>`;
};

/**
 * Serialize list item element
 */
const serializeListItem = (element: ListItemElement, children: string): string => {
  return `<li>${children || '<br>'}</li>`;
};

/**
 * Safely convert value to trimmed string
 * Handles cases where value might not be a string
 */
const safeTrim = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    // List/tag data came in as array - join and trim
    return value
      .filter((v) => v != null)
      .map((v) => String(v).trim())
      .join(', ');
  }

  if (value == null) {
    return '';
  }

  // Number/object - convert to string
  return String(value).trim();
};

/**
 * Deserialize HTML to Slate value
 *
 * Converts HTML string from Gutenberg to Slate JSON.
 * Also handles plain text content (for new Paragraph/Heading blocks).
 */
export const deserialize = (html: string): Descendant[] => {
  // Safely trim input
  const trimmedHtml = safeTrim(html);

  // If content doesn't contain HTML tags, treat as plain text
  if (!trimmedHtml.startsWith('<')) {
    // Plain text content - wrap in text node
    return [{ text: trimmedHtml }];
  }

  const document = new DOMParser().parseFromString(trimmedHtml, 'text/html');
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
      const target = el.getAttribute('target');
      const link: LinkElement = {
        type: 'link',
        url: el.getAttribute('href') || '',
        ...(target && { target: target as '_blank' | '_self' }),
        children: children as CustomText[],
      };
      return link;
    }
    case 'ul': {
      const list: ListElement = {
        type: 'unordered-list',
        children: children.filter(isListItemElement) as ListItemElement[],
      };
      // Ensure at least one list item
      if (list.children.length === 0) {
        list.children.push({
          type: 'list-item',
          children: [{ text: '' }],
        });
      }
      return list;
    }
    case 'ol': {
      const list: ListElement = {
        type: 'ordered-list',
        children: children.filter(isListItemElement) as ListItemElement[],
      };
      // Ensure at least one list item
      if (list.children.length === 0) {
        list.children.push({
          type: 'list-item',
          children: [{ text: '' }],
        });
      }
      return list;
    }
    case 'li': {
      const listItem: ListItemElement = {
        type: 'list-item',
        children: children as (CustomText | LinkElement | ListElement)[],
      };
      // Ensure at least one child
      if (listItem.children.length === 0) {
        listItem.children.push({ text: '' });
      }
      return listItem;
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
