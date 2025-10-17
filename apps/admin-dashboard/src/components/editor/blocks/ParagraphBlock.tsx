/**
 * ParagraphBlock Component (Slate.js-based)
 *
 * New implementation using Slate.js for rich text editing.
 * Replaces the old contentEditable-based implementation.
 *
 * Features:
 * - Slate.js editor with Bold, Italic, Strikethrough, Code formatting
 * - Link support (Ctrl+K)
 * - Enter key for block split
 * - Backspace key for block merge
 * - HTML serialization for Gutenberg compatibility
 * - Undo/Redo support
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createEditor, Descendant, Editor, Transforms, Element as SlateElement, Range } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { withParagraphs } from '../slate/plugins/withParagraphs';
import { withDeleteKey } from '../slate/plugins/withDeleteKey';
import { withLinks, isLinkActive, unwrapLink, wrapLink } from '../slate/plugins/withLinks';
import { serialize, deserialize } from '../slate/utils/serialize';
import type { CustomText, ParagraphElement, LinkElement } from '../slate/types/slate-types';

interface ParagraphBlockProps {
  id: string;
  content: string; // HTML string
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
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
  const editor = useMemo(
    () => withLinks(withDeleteKey(withParagraphs(withHistory(withReact(createEditor()))))),
    []
  );

  // Convert HTML content to Slate value
  const initialValue = useMemo(() => {
    if (!content || content === '') {
      return [
        {
          type: 'paragraph',
          align,
          children: [{ text: '' }],
        } as ParagraphElement,
      ];
    }

    try {
      const deserialized = deserialize(content);
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
          children: [{ text: content }],
        } as ParagraphElement,
      ];
    }
  }, []); // Only run once on mount

  const [value, setValue] = useState<Descendant[]>(initialValue);

  // Update editor when alignment changes
  useEffect(() => {
    if (value.length > 0) {
      const firstNode = value[0];
      if (SlateElement.isElement(firstNode) && firstNode.type === 'paragraph') {
        if ((firstNode as ParagraphElement).align !== align) {
          // Update alignment without triggering onChange
          Transforms.setNodes(
            editor,
            { align } as Partial<ParagraphElement>,
            { at: [0] }
          );
        }
      }
    }
  }, [align, editor, value]);

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

  // Update attribute
  const updateAttribute = useCallback((key: string, value: any) => {
    const html = serialize(editor.children);
    onChange(html, { ...attributes, [key]: value });
  }, [onChange, attributes, editor]);

  // Handle Enter key - create new block after current
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isModKey = event.ctrlKey || event.metaKey;

      // Format shortcuts
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
          case 'u': {
            event.preventDefault();
            toggleMark(editor, 'underline');
            break;
          }
          case 'k': {
            event.preventDefault();
            // Toggle link
            if (isLinkActive(editor)) {
              unwrapLink(editor);
            } else {
              const url = window.prompt('Enter URL:');
              if (url) {
                wrapLink(editor, url);
              }
            }
            break;
          }
        }
      }

      // Enter key - create new block after current (Gutenberg standard)
      if (event.key === 'Enter' && !event.shiftKey && !isModKey) {
        event.preventDefault();

        // CRITICAL: Save current content before creating new block
        const currentHtml = serialize(editor.children);
        onChange(currentHtml, attributes);

        onAddBlock?.('after', 'o4o/paragraph');
        return;
      }

      // Shift+Enter - line break within same block
      // Allow Slate's withParagraphs plugin to handle insertBreak

      // Backspace at start of empty block
      if (event.key === 'Backspace') {
        const { selection } = editor;
        if (selection) {
          const text = Editor.string(editor, [0]);
          const [start] = Range.edges(selection);

          if (text === '' || (start.offset === 0 && text.trim() === '')) {
            event.preventDefault();
            onDelete();
          }
        }
      }
    },
    [editor, onAddBlock, onDelete]
  );

  // Render element (paragraph or link)
  const renderElement = useCallback((props: RenderElementProps) => {
    const element = props.element as ParagraphElement | LinkElement;

    switch (element.type) {
      case 'link':
        return (
          <a
            {...props.attributes}
            href={(element as LinkElement).url}
            className="text-blue-600 hover:text-blue-800 underline"
            onClick={(e) => {
              e.preventDefault();
              // In edit mode, allow editing the link
              const url = window.prompt('Edit URL:', (element as LinkElement).url);
              if (url !== null && url !== (element as LinkElement).url) {
                const path = ReactEditor.findPath(editor, element);
                Transforms.setNodes(
                  editor,
                  { url } as Partial<LinkElement>,
                  { at: path }
                );
              }
            }}
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
              textAlign: (element as ParagraphElement).align || 'left',
              margin: 0,
            }}
          >
            {props.children}
          </p>
        );
    }
  }, [editor]);

  // Render leaf (text with formatting)
  const renderLeaf = useCallback((props: RenderLeafProps) => {
    let children = props.children;
    const leaf = props.leaf as CustomText;

    if (leaf.code) {
      children = (
        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    }

    if (leaf.bold) {
      children = <strong>{children}</strong>;
    }

    if (leaf.italic) {
      children = <em>{children}</em>;
    }

    if (leaf.underline) {
      children = <u>{children}</u>;
    }

    if (leaf.strikethrough) {
      children = <s>{children}</s>;
    }

    return <span {...props.attributes}>{children}</span>;
  }, []);

  return (
    <EnhancedBlockWrapper
      id={id}
      type="paragraph"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      className="wp-block-paragraph"
      onAlignChange={(newAlign) => updateAttribute('align', newAlign)}
      currentAlign={align}
      onToggleBold={() => toggleMark(editor, 'bold')}
      onToggleItalic={() => toggleMark(editor, 'italic')}
      onToggleLink={() => {
        if (isLinkActive(editor)) {
          unwrapLink(editor);
        } else {
          const url = window.prompt('Enter URL:');
          if (url) {
            wrapLink(editor, url);
          }
        }
      }}
      isBold={isMarkActive(editor, 'bold')}
      isItalic={isMarkActive(editor, 'italic')}
    >
      <div
        className={cn(
          'paragraph-content min-h-[1.5em]',
          dropCap && 'first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none'
        )}
        style={{
          fontSize: `${fontSize}px`,
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined,
        }}
      >
        <Slate editor={editor} initialValue={initialValue} onValueChange={handleChange}>
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="Start writing or type / to choose a block"
            onKeyDown={handleKeyDown}
            style={{
              outline: 'none',
              minHeight: '1.5em',
            }}
          />
        </Slate>
      </div>
    </EnhancedBlockWrapper>
  );
};

// Helper functions
const isMarkActive = (editor: Editor, format: keyof CustomText): boolean => {
  const marks = Editor.marks(editor) as CustomText | null;
  return marks ? marks[format] === true : false;
};

const toggleMark = (editor: Editor, format: keyof CustomText): void => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

export default ParagraphBlock;
