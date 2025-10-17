/**
 * Slate.js Custom Type Definitions
 *
 * Based on official Slate.js TypeScript documentation:
 * https://docs.slatejs.org/concepts/12-typescript
 */

import { BaseEditor, Descendant } from 'slate';
import { ReactEditor } from 'slate-react';
import { HistoryEditor } from 'slate-history';

/**
 * Custom Element Types
 *
 * These represent block-level elements in the editor
 */

export type ParagraphElement = {
  type: 'paragraph';
  align?: 'left' | 'center' | 'right' | 'justify';
  children: (CustomText | LinkElement)[];
};

/**
 * Link Element (inline element)
 */
export type LinkElement = {
  type: 'link';
  url: string;
  children: CustomText[];
};

// Union type for all element types (will expand as we add more blocks)
export type CustomElement = ParagraphElement | LinkElement;

/**
 * Custom Text Types
 *
 * These represent inline text with formatting marks
 */

export type FormattedText = {
  text: string;
  bold?: true;
  italic?: true;
  strikethrough?: true;
  code?: true;
  // Future marks:
  // underline?: true;
  // color?: string;
  // backgroundColor?: string;
};

export type CustomText = FormattedText;

/**
 * Extend Slate's CustomTypes interface
 *
 * This makes TypeScript aware of our custom types throughout the application
 */
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

/**
 * Helper Types
 */

// Initial editor value type
export type EditorValue = Descendant[];

// Empty paragraph helper
export const createEmptyParagraph = (): ParagraphElement => ({
  type: 'paragraph',
  children: [{ text: '' }],
});

// Check if element is a paragraph
export const isParagraphElement = (element: any): element is ParagraphElement => {
  return element && element.type === 'paragraph';
};

// Check if text has formatting
export const isFormattedText = (leaf: CustomText): boolean => {
  return Boolean(leaf.bold || leaf.italic || leaf.strikethrough || leaf.code);
};

// Check if element is a link
export const isLinkElement = (element: any): element is LinkElement => {
  return element && element.type === 'link';
};
