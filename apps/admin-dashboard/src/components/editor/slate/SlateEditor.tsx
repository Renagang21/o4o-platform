/**
 * Basic Slate.js Editor Component
 *
 * This is a foundational editor component that provides:
 * - Text input and editing
 * - Bold and Italic formatting
 * - Paragraph blocks
 * - Undo/Redo support
 *
 * Based on Slate.js official documentation:
 * - https://docs.slatejs.org/walkthroughs/01-installing-slate
 * - https://docs.slatejs.org/concepts/09-rendering
 */

import React, { useCallback, useMemo } from 'react';
import { createEditor, Descendant, Editor, Element as SlateElement, Transforms } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
import type { CustomElement, CustomText, ParagraphElement } from './types/slate-types';
import { Toolbar } from './components/Toolbar';
import { withParagraphs } from './plugins/withParagraphs';
import { withDeleteKey } from './plugins/withDeleteKey';

/**
 * Props for the SlateEditor component
 */
export interface SlateEditorProps {
  /** Initial value for the editor */
  initialValue?: Descendant[];
  /** Callback when editor value changes */
  onChange?: (value: Descendant[]) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Custom className for the editor container */
  className?: string;
  /** Read-only mode */
  readOnly?: boolean;
}

/**
 * Default initial value - empty paragraph
 */
const DEFAULT_INITIAL_VALUE: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  } as ParagraphElement,
];

/**
 * Main Slate Editor Component
 */
export const SlateEditor: React.FC<SlateEditorProps> = ({
  initialValue = DEFAULT_INITIAL_VALUE,
  onChange,
  placeholder = 'Start typing...',
  className = '',
  readOnly = false,
}) => {
  /**
   * Create editor instance with plugins
   *
   * Important: Editor must be stable across renders
   * Plugin chain order:
   * - withReact: Adds React and DOM behaviors
   * - withHistory: Adds undo/redo support
   * - withParagraphs: Adds paragraph-specific behaviors (Enter key)
   * - withDeleteKey: Adds delete/backspace behaviors (block merge)
   */
  const editor = useMemo(
    () => withDeleteKey(withParagraphs(withHistory(withReact(createEditor())))),
    []
  );

  /**
   * Handle editor value changes
   */
  const handleChange = useCallback(
    (value: Descendant[]) => {
      // Check if the document changed (not just selection)
      const isAstChange = editor.operations.some(
        (op) => op.type !== 'set_selection'
      );

      if (isAstChange && onChange) {
        onChange(value);
      }
    },
    [editor, onChange]
  );

  /**
   * Render Element (Block-level)
   *
   * This function determines how each block type is rendered
   */
  const renderElement = useCallback((props: RenderElementProps) => {
    switch (props.element.type) {
      case 'paragraph':
        return <ParagraphElement {...props} />;
      default:
        return <DefaultElement {...props} />;
    }
  }, []);

  /**
   * Render Leaf (Text-level formatting)
   *
   * This function applies text formatting like bold and italic
   */
  const renderLeaf = useCallback((props: RenderLeafProps) => {
    return <Leaf {...props} />;
  }, []);

  /**
   * Handle keyboard shortcuts
   *
   * Supports:
   * - Ctrl/Cmd + B: Bold
   * - Ctrl/Cmd + I: Italic
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isModKey = event.ctrlKey || event.metaKey;

      if (isModKey) {
        switch (event.key) {
          case 'b': {
            event.preventDefault();
            toggleMark(editor, 'bold');
            break;
          }
          case 'i': {
            event.preventDefault();
            toggleMark(editor, 'italic');
            break;
          }
        }
      }
    },
    [editor]
  );

  return (
    <div className={`slate-editor ${className}`}>
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={handleChange}
      >
        <Toolbar />
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={placeholder}
          readOnly={readOnly}
          spellCheck
          autoFocus
          onKeyDown={handleKeyDown}
          style={{
            minHeight: '200px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '16px',
            lineHeight: '1.6',
            outline: 'none',
          }}
        />
      </Slate>
    </div>
  );
};

/**
 * Paragraph Element Component
 *
 * Renders a paragraph block with optional alignment
 */
const ParagraphElement: React.FC<RenderElementProps> = ({ attributes, children, element }) => {
  const align = (element as ParagraphElement).align || 'left';

  return (
    <p
      {...attributes}
      style={{
        textAlign: align,
        margin: '0 0 16px 0',
      }}
    >
      {children}
    </p>
  );
};

/**
 * Default Element Component
 *
 * Fallback for unknown element types
 */
const DefaultElement: React.FC<RenderElementProps> = ({ attributes, children }) => {
  return <p {...attributes}>{children}</p>;
};

/**
 * Leaf Component
 *
 * Renders text with formatting (bold, italic, etc.)
 */
const Leaf: React.FC<RenderLeafProps> = ({ attributes, children, leaf }) => {
  let formattedChildren = children;

  // Apply bold formatting
  if ((leaf as CustomText).bold) {
    formattedChildren = <strong>{formattedChildren}</strong>;
  }

  // Apply italic formatting
  if ((leaf as CustomText).italic) {
    formattedChildren = <em>{formattedChildren}</em>;
  }

  return <span {...attributes}>{formattedChildren}</span>;
};

/**
 * Export helper functions for external use
 */

/**
 * Check if a mark is active in the current selection
 */
export const isMarkActive = (editor: Editor, format: keyof CustomText): boolean => {
  const marks = Editor.marks(editor) as CustomText | null;
  return marks ? marks[format] === true : false;
};

/**
 * Toggle a mark on the current selection
 */
export const toggleMark = (editor: Editor, format: keyof CustomText): void => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

/**
 * Check if a block type is active
 */
export const isBlockActive = (
  editor: Editor,
  format: CustomElement['type']
): boolean => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as CustomElement).type === format,
    })
  );

  return !!match;
};

/**
 * Toggle a block type
 */
export const toggleBlock = (
  editor: Editor,
  format: CustomElement['type']
): void => {
  const isActive = isBlockActive(editor, format);

  Transforms.setNodes(
    editor,
    { type: isActive ? 'paragraph' : format } as Partial<CustomElement>,
    { match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && Editor.isBlock(editor, n) }
  );
};
