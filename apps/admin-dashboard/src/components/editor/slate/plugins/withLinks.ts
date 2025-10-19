/**
 * withLinks Plugin
 *
 * Enables Link support in Slate.js editor:
 * - Treats links as inline elements
 * - Prevents links inside links
 * - Handles link unwrapping on edge cases
 */

import { Editor, Element as SlateElement, Transforms, Range } from 'slate';
import type { LinkElement } from '../types/slate-types';

/**
 * withLinks Plugin
 *
 * Extends the editor with link functionality
 */
export const withLinks = (editor: Editor): Editor => {
  const { isInline, insertData, insertText } = editor;

  // Mark link elements as inline
  editor.isInline = (element) => {
    return (element as any).type === 'link' ? true : isInline(element);
  };

  // Handle paste - detect URLs and auto-link them
  editor.insertText = (text) => {
    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertText(text);
    }
  };

  return editor;
};

/**
 * Check if text is a URL
 */
const isUrl = (text: string): boolean => {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Check if there's an active link at the current selection
 */
export const isLinkActive = (editor: Editor): boolean => {
  const [link] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
  });
  return !!link;
};

/**
 * Get active link element at current selection
 */
export const getActiveLinkElement = (editor: Editor): LinkElement | null => {
  const [link] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
  });
  return link ? (link[0] as LinkElement) : null;
};

/**
 * Unwrap (remove) link at current selection
 */
export const unwrapLink = (editor: Editor): void => {
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
  });
};

/**
 * Wrap selected text in a link
 */
export const wrapLink = (editor: Editor, url: string, target?: '_blank' | '_self'): void => {
  if (isLinkActive(editor)) {
    unwrapLink(editor);
  }

  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);

  const link: LinkElement = {
    type: 'link',
    url,
    ...(target && { target }),
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: 'end' });
  }
};

/**
 * Insert or update link at current selection
 */
export const insertLink = (editor: Editor, url: string): void => {
  if (editor.selection) {
    wrapLink(editor, url);
  }
};
