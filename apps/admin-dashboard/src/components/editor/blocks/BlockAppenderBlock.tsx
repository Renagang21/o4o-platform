/**
 * BlockAppenderBlock Component (Slate.js-based)
 *
 * Special block for adding new blocks to the editor.
 * Always present and allows users to create new blocks seamlessly.
 *
 * Features:
 * - Slate.js editor for rich text input
 * - Enter key creates new Paragraph block and clears itself
 * - Slash command support
 * - Minimal toolbar (hidden by default)
 * - Focus retention after block creation
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { createEditor, Descendant, Editor, Transforms, Element as SlateElement, Range, Text } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { withParagraphs } from '../slate/plugins/withParagraphs';
import { serialize, deserialize } from '../slate/utils/serialize';
import { createBlockBackspaceHandler } from '../utils/handleBlockBackspace';
import type { CustomText, ParagraphElement } from '../slate/types/slate-types';

interface BlockAppenderBlockProps {
  id: string;
  content: string; // HTML string
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  onChangeType?: (newType: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: Record<string, any>;
}

const BlockAppenderBlock: React.FC<BlockAppenderBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  onChangeType,
  isSelected,
  onSelect,
  attributes = {}
}) => {
  // Create Slate editor with minimal plugins
  const editor = useMemo(
    () => withParagraphs(withHistory(withReact(createEditor()))),
    []
  );

  // Convert HTML content to Slate value
  const initialValue = useMemo(() => {
    if (!content || content === '') {
      return [
        {
          type: 'paragraph',
          children: [{ text: '' }],
        } as ParagraphElement,
      ];
    }

    try {
      const deserialized = deserialize(content);
      if (deserialized.length === 0) {
        return [
          {
            type: 'paragraph',
            children: [{ text: '' }],
          } as ParagraphElement,
        ];
      }

      // If deserialized content is just text nodes, wrap in paragraph
      const hasOnlyTextNodes = deserialized.every(node => Text.isText(node));
      if (hasOnlyTextNodes) {
        return [
          {
            type: 'paragraph',
            children: deserialized as CustomText[],
          } as ParagraphElement,
        ];
      }

      return deserialized;
    } catch (error) {
      console.error('Failed to deserialize block-appender content:', error);
      return [
        {
          type: 'paragraph',
          children: [{ text: content }],
        } as ParagraphElement,
      ];
    }
  }, []); // Only run once on mount

  const [value, setValue] = useState<Descendant[]>(initialValue);
  const editorRef = useRef<HTMLDivElement>(null);

  // Handle value changes
  const handleChange = useCallback(
    (newValue: Descendant[]) => {
      setValue(newValue);

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
    [editor, onChange, attributes]
  );

  // Clear content and reset editor
  const clearContent = useCallback(() => {
    const emptyValue = [
      {
        type: 'paragraph',
        children: [{ text: '' }],
      } as ParagraphElement,
    ];
    setValue(emptyValue);
    onChange('', attributes);

    // Reset Slate editor state
    Transforms.delete(editor, {
      at: {
        anchor: Editor.start(editor, []),
        focus: Editor.end(editor, []),
      },
    });
  }, [editor, onChange, attributes]);

  // Common Backspace key handler (prevent deletion for BlockAppender)
  const handleBackspaceKey = useMemo(
    () => createBlockBackspaceHandler({
      editor,
      preventDefaultOnly: true, // Don't delete BlockAppender, just prevent default
    }),
    [editor]
  );

  // Handle Enter key - create new BlockAppender
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
          // Shift+Enter or Ctrl+Enter: line break within block
          // Let Slate's withParagraphs plugin handle it
        } else {
          // Plain Enter: Always create new BlockAppender
          event.preventDefault();

          // Get current content
          const currentHtml = serialize(editor.children);

          // If there's content, convert this BlockAppender to Paragraph
          if (currentHtml.trim()) {
            // Convert this BlockAppender to Paragraph
            onChangeType?.('o4o/paragraph');

            // Add new BlockAppender after
            onAddBlock?.('after', 'o4o/block-appender');
          } else {
            // No content, just add new BlockAppender after
            onAddBlock?.('after', 'o4o/block-appender');
          }

          return;
        }
      }

      // Backspace key handling - use common handler (prevents deletion)
      if (event.key === 'Backspace') {
        handleBackspaceKey(event);
        return;
      }
    },
    [editor, onAddBlock, onChangeType, handleBackspaceKey]
  );

  // Render element (paragraph only)
  const renderElement = useCallback((props: RenderElementProps) => {
    return (
      <p
        {...props.attributes}
        style={{
          margin: 0,
        }}
      >
        {props.children}
      </p>
    );
  }, []);

  // Render leaf (text with minimal formatting)
  const renderLeaf = useCallback((props: RenderLeafProps) => {
    let children = props.children;
    const leaf = props.leaf as CustomText;

    if (leaf.bold) {
      children = <strong>{children}</strong>;
    }

    if (leaf.italic) {
      children = <em>{children}</em>;
    }

    return <span {...props.attributes}>{children}</span>;
  }, []);

  return (
    <EnhancedBlockWrapper
      id={id}
      type="block-appender"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete} // Enable delete
      onDuplicate={() => {}} // Disable duplicate
      onMoveUp={() => {}} // Disable move up
      onMoveDown={() => {}} // Disable move down
      onAddBlock={onAddBlock}
      className="wp-block-appender"
    >
      <div
        ref={editorRef}
        className={cn(
          'block-appender-content',
          'min-h-[2em]',
          'px-4 py-2',
          'border-2 border-dashed border-gray-300 rounded-md',
          'hover:border-gray-400 focus-within:border-blue-400',
          'transition-colors duration-200',
          'bg-gray-50/50 hover:bg-white focus-within:bg-white'
        )}
        data-block-appender="true"
        data-default-block-appender="true"
      >
        <Slate editor={editor} initialValue={initialValue} onValueChange={handleChange}>
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="Start writing or press '/' for commands..."
            onKeyDown={handleKeyDown}
            style={{
              outline: 'none',
              minHeight: '1.5em',
            }}
            className="text-gray-600 placeholder:text-gray-400"
          />
        </Slate>
      </div>
    </EnhancedBlockWrapper>
  );
};

export default BlockAppenderBlock;
