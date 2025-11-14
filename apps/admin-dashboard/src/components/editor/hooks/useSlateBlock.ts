/**
 * useSlateBlock Hook
 *
 * Unified hook for Slate.js-based text blocks.
 * Eliminates code duplication across text blocks (ParagraphBlock, HeadingBlock, etc.)
 *
 * Features:
 * - Editor initialization with plugins
 * - Content state management (hasContent check)
 * - Change handlers with serialization
 * - Attribute update helpers
 * - Keyboard shortcuts (Enter, Backspace)
 * - Auto content state updates
 *
 * Usage:
 * ```typescript
 * const {
 *   editor,
 *   initialValue,
 *   hasContent,
 *   handleChange,
 *   handleKeyDown,
 *   updateAttribute,
 * } = useSlateBlock({
 *   content,
 *   attributes,
 *   onChange,
 *   onDelete,
 *   onAddBlock,
 *   blockType: 'paragraph',
 * });
 * ```
 */

import { useState, useMemo, useCallback } from 'react';
import { Descendant, Editor, Element as SlateElement, Text } from 'slate';
import { serialize, deserialize } from '../slate/utils/serialize';
import { createTextEditor } from '../utils/slate-editor-factory';
import { createBlockEnterHandler } from '../utils/handleBlockEnter';
import { createBlockBackspaceHandler } from '../utils/handleBlockBackspace';
import { useSlateKeyboard } from './useSlateKeyboard';
import type { ParagraphElement, HeadingElement, CustomText } from '../slate/types/slate-types';

export interface SlateBlockOptions {
  /** Block content (HTML string or plain text) */
  content?: string | object;
  /** Block attributes */
  attributes: {
    content?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    level?: 1 | 2 | 3 | 4 | 5 | 6; // For headings
    [key: string]: any;
  };
  /** Content change handler */
  onChange: (content: string, attributes?: any) => void;
  /** Delete block handler */
  onDelete: () => void;
  /** Add block handler */
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  /** Block type for default value creation */
  blockType?: 'paragraph' | 'heading' | 'quote' | 'list' | 'code';
  /** Custom link toggle handler (optional) */
  onToggleLink?: () => void;
}

export interface SlateBlockReturn {
  /** Slate editor instance */
  editor: Editor;
  /** Initial editor value */
  initialValue: Descendant[];
  /** Whether block has content (for toolbar visibility) */
  hasContent: boolean;
  /** Change handler for Slate */
  handleChange: (newValue: Descendant[]) => void;
  /** Keyboard event handler */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Helper to update block attributes */
  updateAttribute: (key: string, value: any) => void;
}

/**
 * Create default empty value for block type
 */
const createDefaultValue = (
  blockType: string,
  attributes: any
): Descendant[] => {
  const { align = 'left', level = 2 } = attributes;

  switch (blockType) {
    case 'heading':
      return [
        {
          type: 'heading',
          level,
          align,
          children: [{ text: '' }],
        } as HeadingElement,
      ];
    case 'paragraph':
    default:
      return [
        {
          type: 'paragraph',
          align,
          children: [{ text: '' }],
        } as ParagraphElement,
      ];
  }
};

/**
 * Check if editor has text content
 */
const checkHasContent = (editor: Editor): boolean => {
  return editor.children.some(node => {
    if (Text.isText(node)) {
      return node.text.trim() !== '';
    }
    if (SlateElement.isElement(node) && node.children) {
      return node.children.some((child: any) => {
        if (Text.isText(child)) {
          return child.text.trim() !== '';
        }
        return false;
      });
    }
    return false;
  });
};

/**
 * useSlateBlock Hook
 */
export const useSlateBlock = (options: SlateBlockOptions): SlateBlockReturn => {
  const {
    content,
    attributes,
    onChange,
    onDelete,
    onAddBlock,
    blockType = 'paragraph',
    onToggleLink,
  } = options;

  // Create Slate editor with plugins
  const editor = useMemo(() => createTextEditor(), []);

  // Convert HTML content to Slate value - ONLY used on initial mount
  const initialValue = useMemo(() => {
    // Prioritize content (HTML) over attributes.content (plain text)
    const textContent = (typeof content === 'string' && content ? content : '') || attributes.content || '';

    if (!textContent || textContent === '') {
      return createDefaultValue(blockType, attributes);
    }

    try {
      const deserialized = deserialize(textContent);

      // Ensure we have at least one node
      if (deserialized.length === 0) {
        return createDefaultValue(blockType, attributes);
      }

      // If deserialized content is just text nodes (plain text), wrap in block
      const hasOnlyTextNodes = deserialized.every(node => Text.isText(node));
      if (hasOnlyTextNodes) {
        const defaultValue = createDefaultValue(blockType, attributes);
        const firstBlock = defaultValue[0] as any;
        return [
          {
            ...firstBlock,
            children: deserialized as CustomText[],
          },
        ];
      }

      // Apply attributes to deserialized blocks
      return deserialized.map(node => {
        if (SlateElement.isElement(node)) {
          if (blockType === 'heading' && node.type === 'heading') {
            return {
              ...node,
              level: attributes.level || 2,
              align: attributes.align || 'left',
            } as HeadingElement;
          }
          if (blockType === 'paragraph' && node.type === 'paragraph') {
            return {
              ...node,
              align: attributes.align || 'left',
            } as ParagraphElement;
          }
        }
        return node;
      });
    } catch (error) {
      console.error('Failed to deserialize content:', error);
      const defaultValue = createDefaultValue(blockType, attributes);
      const firstBlock = defaultValue[0] as any;
      return [
        {
          ...firstBlock,
          children: [{ text: textContent }],
        },
      ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - truly initial value only

  // Track if editor has content (for toolbar visibility)
  const [hasContent, setHasContent] = useState(() => checkHasContent(editor));

  // Update content state
  const updateContentState = useCallback(() => {
    setHasContent(checkHasContent(editor));
  }, [editor]);

  // Handle value changes
  const handleChange = useCallback(
    (newValue: Descendant[]) => {
      // Update content state for toolbar visibility
      updateContentState();

      // Check if content actually changed (not just selection)
      const isAstChange = editor.operations.some(
        (op) => op.type !== 'set_selection'
      );

      if (isAstChange) {
        // Serialize to HTML and notify parent
        const html = serialize(newValue);
        onChange(html, attributes);
      }
    },
    [editor, onChange, attributes, updateContentState]
  );

  // Update attribute helper
  const updateAttribute = useCallback(
    (key: string, value: any) => {
      const html = serialize(editor.children);
      onChange(html, { ...attributes, [key]: value });
    },
    [onChange, attributes, editor]
  );

  // Common Enter key handler
  const handleEnterKey = useMemo(
    () => createBlockEnterHandler({
      editor,
      onChange,
      onAddBlock,
      attributes,
    }),
    [editor, onChange, onAddBlock, attributes]
  );

  // Common Backspace key handler
  const handleBackspaceKey = useMemo(
    () => createBlockBackspaceHandler({
      editor,
      onDelete,
    }),
    [editor, onDelete]
  );

  // Handle keyboard shortcuts and special keys
  const handleKeyDown = useSlateKeyboard({
    editor,
    handleEnterKey,
    handleBackspaceKey,
    onToggleLink,
  });

  return {
    editor,
    initialValue,
    hasContent,
    handleChange,
    handleKeyDown,
    updateAttribute,
  };
};
