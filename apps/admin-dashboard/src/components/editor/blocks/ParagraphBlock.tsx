/**
 * ParagraphBlock Component (Slate.js-based) - REWRITTEN
 *
 * Completely rewritten based on working HeadingBlock structure.
 * Uses EnhancedBlockWrapper in enhanced mode (not simple mode).
 *
 * Features:
 * - Slate.js editor with Bold, Italic, Strikethrough, Code formatting
 * - Link support (Ctrl+K)
 * - Enter key for block split
 * - Backspace key for block merge
 * - HTML serialization for Gutenberg compatibility
 * - Undo/Redo support
 */

import React, { useCallback, useMemo, useState, useRef, memo } from 'react';
import { Descendant, Editor, Transforms, Element as SlateElement, Text, Range } from 'slate';
import { Slate, Editable, RenderElementProps, ReactEditor } from 'slate-react';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { BlockToolbar } from './gutenberg/BlockToolbar';
import { unwrapLink, wrapLink, getActiveLinkElement } from '../slate/plugins/withLinks';
import { serialize, deserialize } from '../slate/utils/serialize';
import LinkInlineEditor from '../slate/components/LinkInlineEditor';
import { createBlockEnterHandler } from '../utils/handleBlockEnter';
import { createBlockBackspaceHandler } from '../utils/handleBlockBackspace';
import { createTextEditor } from '../utils/slate-editor-factory';
import { isMarkActive, toggleMark } from '../utils/slate-helpers';
import { DefaultLeafRenderer } from '../slate/renderers/DefaultLeafRenderer';
import { useSlateKeyboard } from '../hooks/useSlateKeyboard';
import type { CustomText, ParagraphElement, LinkElement } from '../slate/types/slate-types';

interface ParagraphBlockProps {
  id: string;
  content?: string | object; // HTML string or empty object (AI-generated)
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    content?: string; // AI-generated blocks store text here
    align?: 'left' | 'center' | 'right' | 'justify';
    dropCap?: boolean;
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
  };
}

const ParagraphBlock: React.FC<ParagraphBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {}
}) => {
  const {
    align = 'left',
    dropCap = false,
    fontSize = 16,
    textColor = '#1e293b',
    backgroundColor = '',
  } = attributes;

  // Create Slate editor with plugins
  const editor = useMemo(() => createTextEditor(), []);

  // Convert HTML content to Slate value - ONLY used on initial mount
  // Note: Dependency array is empty - this truly represents "initialValue"
  // If external content changes (e.g., AI generation), parent should remount this component
  const initialValue = useMemo(() => {
    // Prioritize content (HTML from AI) over attributes.content (plain text)
    const textContent = (typeof content === 'string' && content ? content : '') || attributes.content || '';

    if (!textContent || textContent === '') {
      return [
        {
          type: 'paragraph',
          align,
          children: [{ text: '' }],
        } as ParagraphElement,
      ];
    }

    try {
      const deserialized = deserialize(textContent);
      // Ensure we have at least one paragraph
      if (deserialized.length === 0) {
        return [
          {
            type: 'paragraph',
            align,
            children: [{ text: '' }],
          } as ParagraphElement,
        ];
      }

      // If deserialized content is just text nodes (plain text), wrap in paragraph
      const hasOnlyTextNodes = deserialized.every(node => Text.isText(node));
      if (hasOnlyTextNodes) {
        return [
          {
            type: 'paragraph',
            align,
            children: deserialized as CustomText[],
          } as ParagraphElement,
        ];
      }

      // Apply alignment to deserialized paragraphs
      return deserialized.map(node => {
        if (SlateElement.isElement(node) && node.type === 'paragraph') {
          return { ...node, align } as ParagraphElement;
        }
        return node;
      });
    } catch (error) {
      console.error('Failed to deserialize content:', error);
      return [
        {
          type: 'paragraph',
          align,
          children: [{ text: textContent }],
        } as ParagraphElement,
      ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - truly initial value only

  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkEditorPosition, setLinkEditorPosition] = useState<{ top: number; left: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Track if editor has content or active selection (for toolbar visibility)
  const [hasContentOrSelection, setHasContentOrSelection] = useState(false);

  // Check if editor has content or active selection
  const updateContentState = useCallback(() => {
    const { selection } = editor;
    const hasActiveSelection = selection && !Range.isCollapsed(selection);

    // Check if editor has any text content
    const hasText = editor.children.some(node => {
      if (SlateElement.isElement(node)) {
        return node.children.some(child => Text.isText(child) && child.text.trim().length > 0);
      }
      return false;
    });

    setHasContentOrSelection(hasActiveSelection || hasText);
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

  // Update attribute
  const updateAttribute = useCallback((key: string, value: any) => {
    // Special handling for alignment - update editor nodes
    if (key === 'align') {
      // Update all paragraph nodes with new alignment
      Transforms.setNodes(
        editor,
        { align: value } as Partial<ParagraphElement>,
        {
          match: n => SlateElement.isElement(n) && n.type === 'paragraph',
        }
      );
    }

    const html = serialize(editor.children);
    onChange(html, { ...attributes, [key]: value });
  }, [onChange, attributes, editor]);

  // Toggle link editor
  const toggleLinkEditor = useCallback(() => {
    const { selection } = editor;
    if (!selection || Range.isCollapsed(selection)) {
      setLinkEditorOpen(false);
      return;
    }

    // Calculate position near selection
    try {
      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current?.getBoundingClientRect();

        if (editorRect) {
          setLinkEditorPosition({
            top: rect.bottom - editorRect.top + 5,
            left: rect.left - editorRect.left,
          });
          setLinkEditorOpen(true);
        }
      }
    } catch (error) {
      console.error('Failed to position link editor:', error);
    }
  }, [editor]);

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
    onToggleLink: toggleLinkEditor,
  });

  // Render element (paragraph or link)
  // Include 'align' in dependencies to re-render when alignment changes
  const renderElement = useCallback((props: RenderElementProps) => {
    const element = props.element as ParagraphElement | LinkElement;

    switch (element.type) {
      case 'link':
        return (
          <a
            {...props.attributes}
            href={(element as LinkElement).url}
            className="text-blue-600 hover:text-blue-800 underline cursor-text"
          >
            {props.children}
          </a>
        );
      case 'paragraph':
      default:
        return (
          <p
            {...props.attributes}
            style={{
              textAlign: align,
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {props.children}
          </p>
        );
    }
  }, [align]);

  return (
    <EnhancedBlockWrapper
      id={id}
      type="paragraph"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onAddBlock={onAddBlock}
      className="wp-block-paragraph"
      slateEditor={editor}
      disableAutoFocus={true}
      showToolbar={false}
    >
      {/* Gutenberg-style Block Toolbar (only when selected and has content or selection) */}
      {isSelected && hasContentOrSelection && (
        <BlockToolbar
          align={align}
          onAlignChange={(newAlign) => updateAttribute('align', newAlign)}
          isBold={isMarkActive(editor, 'bold')}
          isItalic={isMarkActive(editor, 'italic')}
          onToggleBold={() => toggleMark(editor, 'bold')}
          onToggleItalic={() => toggleMark(editor, 'italic')}
          onToggleLink={toggleLinkEditor}
          onDuplicate={onDuplicate}
          onInsertBefore={() => onAddBlock?.('before')}
          onInsertAfter={() => onAddBlock?.('after')}
          onRemove={onDelete}
        />
      )}

      <div
        ref={editorRef}
        className={cn(
          'paragraph-content min-h-[1em] relative',
          dropCap && 'first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none'
        )}
        style={{
          fontSize: `${fontSize}px`,
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined,
        }}
        data-handles-enter="true"
      >
        <MemoizedSlateEditor
          editor={editor}
          initialValue={initialValue}
          handleChange={handleChange}
          renderElement={renderElement}
          handleKeyDown={handleKeyDown}
        />

        {linkEditorOpen && (
          <LinkInlineEditor
            onApply={(url, target) => {
              wrapLink(editor, url, target);
            }}
            onRemove={() => {
              unwrapLink(editor);
            }}
            onClose={() => {
              setLinkEditorOpen(false);
            }}
            initialUrl={getActiveLinkElement(editor)?.url || ''}
            initialTarget={getActiveLinkElement(editor)?.target}
            position={linkEditorPosition}
          />
        )}
      </div>
    </EnhancedBlockWrapper>
  );
};

// Memoized Slate Editor to prevent re-renders from affecting focus
interface MemoizedSlateEditorProps {
  editor: Editor;
  initialValue: Descendant[];
  handleChange: (newValue: Descendant[]) => void;
  renderElement: (props: RenderElementProps) => React.JSX.Element;
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

const MemoizedSlateEditor = memo<MemoizedSlateEditorProps>(({
  editor,
  initialValue,
  handleChange,
  renderElement,
  handleKeyDown
}) => {
  return (
    <Slate
      editor={editor}
      initialValue={initialValue}
      onValueChange={handleChange}
    >
      <Editable
        renderElement={renderElement}
        renderLeaf={DefaultLeafRenderer}
        placeholder=""
        onKeyDown={handleKeyDown}
        style={{
          outline: 'none',
          minHeight: '1.5em',
        }}
      />
    </Slate>
  );
}, (prevProps, nextProps) => {
  // Re-render if editor or renderElement changes
  // renderElement changes when alignment changes, so we need to re-render
  return prevProps.editor === nextProps.editor && prevProps.renderElement === nextProps.renderElement;
});

MemoizedSlateEditor.displayName = 'MemoizedSlateEditor';

export default ParagraphBlock;
