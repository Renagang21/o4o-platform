/**
 * BlockAppenderBlock Component (Slate.js-based)
 *
 * Simplified block appender following Gutenberg's DefaultBlockAppender pattern.
 * This is NOT a full block - it's a simple one-line input without toolbar.
 *
 * Key Differences from Regular Blocks:
 * - NO EnhancedBlockWrapper (no toolbar)
 * - NO move/delete/duplicate buttons (use Block List sidebar instead)
 * - Minimal styling - just a simple input line
 * - Matches Gutenberg's minimal placeholder pattern
 *
 * Features:
 * - Simple Slate.js input
 * - Enter key converts to Paragraph block
 * - Slash command support (future)
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import { createEditor, Descendant, Editor, Transforms, Text } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
import { cn } from '@/lib/utils';
import { withParagraphs } from '../slate/plugins/withParagraphs';
import { serialize, deserialize } from '../slate/utils/serialize';
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

  // Handle Enter key - save and render only
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
          // Shift+Enter or Ctrl+Enter: line break within block
          // Let Slate's withParagraphs plugin handle it
        } else {
          // Plain Enter: save and render only (no new BlockAppender)
          event.preventDefault();

          // Get current content
          const currentHtml = serialize(editor.children);

          // If there's content, convert this BlockAppender to Paragraph
          if (currentHtml.trim()) {
            // Convert this BlockAppender to Paragraph and render
            onChangeType?.('o4o/paragraph');
          }

          // Just render the content, no new block creation

          return;
        }
      }

      // Backspace key - prevent deletion of BlockAppender
      // (This is a UI control block, not a content block)
      if (event.key === 'Backspace') {
        const text = Editor.string(editor, []);
        if (!text || text.trim() === '') {
          event.preventDefault(); // Don't delete BlockAppender when empty
          return;
        }
      }
    },
    [editor, onAddBlock, onChangeType]
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
    <div
      ref={editorRef}
      className={cn(
        'block-appender',
        'min-h-[2.5em]',
        'px-2 py-1',
        'rounded',
        'hover:bg-gray-50/50',
        'transition-colors duration-150',
        isSelected && 'bg-gray-50/50'
      )}
      data-block-id={id}
      data-block-appender="true"
      data-default-block-appender="true"
      onClick={onSelect}
    >
      <Slate editor={editor} initialValue={initialValue} onValueChange={handleChange}>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Type / to choose a block"
          onKeyDown={handleKeyDown}
          style={{
            outline: 'none',
            minHeight: '1.5em',
          }}
          className={cn(
            'text-gray-700 placeholder:text-gray-400',
            'text-base leading-relaxed'
          )}
        />
      </Slate>
    </div>
  );
};

export default BlockAppenderBlock;
