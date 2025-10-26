/**
 * GutenbergParagraphBlock
 *
 * Complete rewrite based on WordPress Gutenberg architecture.
 * Clean structure: CleanBlockWrapper + BlockToolbar + Slate editor
 *
 * NO event conflicts, NO focus issues, NO wrapper onClick problems.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Descendant, Element as SlateElement, Text } from 'slate';
import { Slate, Editable, RenderElementProps } from 'slate-react';
import { cn } from '@/lib/utils';
import { CleanBlockWrapper } from './CleanBlockWrapper';
import { BlockToolbar } from './BlockToolbar';
import { serialize, deserialize } from '../../slate/utils/serialize';
import { createTextEditor } from '../../utils/slate-editor-factory';
import { isMarkActive, toggleMark } from '../../utils/slate-helpers';
import { DefaultLeafRenderer } from '../../slate/renderers/DefaultLeafRenderer';
import { useSlateKeyboard } from '../../hooks/useSlateKeyboard';
import { createBlockEnterHandler } from '../../utils/handleBlockEnter';
import { createBlockBackspaceHandler } from '../../utils/handleBlockBackspace';
import type { ParagraphElement, CustomText } from '../../slate/types/slate-types';

interface GutenbergParagraphBlockProps {
  id: string;
  content?: string | object;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    content?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
  };
}

export const GutenbergParagraphBlock: React.FC<GutenbergParagraphBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
}) => {
  const {
    align = 'left',
    fontSize = 16,
    textColor = '#1e293b',
    backgroundColor = '',
  } = attributes;

  // Create Slate editor
  const editor = useMemo(() => createTextEditor(), []);

  // Convert HTML content to Slate value
  const initialValue = useMemo(() => {
    const textContent = (typeof content === 'string' && content ? content : '') || attributes.content || '';

    if (!textContent) {
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
      if (deserialized.length === 0) {
        return [
          {
            type: 'paragraph',
            align,
            children: [{ text: '' }],
          } as ParagraphElement,
        ];
      }

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
  }, []); // Only run once on mount

  const [value, setValue] = useState<Descendant[]>(initialValue);

  // Handle value changes
  const handleChange = useCallback(
    (newValue: Descendant[]) => {
      setValue(newValue);

      // Check if content actually changed (not just selection)
      const isAstChange = editor.operations.some(
        (op) => op.type !== 'set_selection'
      );

      if (isAstChange) {
        const html = serialize(newValue);
        onChange(html, attributes);
      }
    },
    [editor, onChange, attributes]
  );

  // Update attribute
  const updateAttribute = useCallback(
    (key: string, newValue: any) => {
      const html = serialize(editor.children);
      onChange(html, { ...attributes, [key]: newValue });
    },
    [onChange, attributes, editor]
  );

  // Enter key handler
  const handleEnterKey = useMemo(
    () => createBlockEnterHandler({
      editor,
      onChange,
      onAddBlock,
      attributes,
    }),
    [editor, onChange, onAddBlock, attributes]
  );

  // Backspace key handler
  const handleBackspaceKey = useMemo(
    () => createBlockBackspaceHandler({
      editor,
      onDelete,
    }),
    [editor, onDelete]
  );

  // Keyboard shortcuts
  const handleKeyDown = useSlateKeyboard({
    editor,
    handleEnterKey,
    handleBackspaceKey,
    onToggleLink: () => {}, // TODO: Link editor
  });

  // Render element (paragraph)
  const renderElement = useCallback((props: RenderElementProps) => {
    const element = props.element as ParagraphElement;
    return (
      <p
        {...props.attributes}
        style={{
          textAlign: element.align || 'left',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
      >
        {props.children}
      </p>
    );
  }, []);

  return (
    <CleanBlockWrapper
      id={id}
      type="paragraph"
      isSelected={isSelected}
      className="gutenberg-paragraph-block"
    >
      {/* Gutenberg-style Block Toolbar */}
      {isSelected && (
        <BlockToolbar
          align={align}
          onAlignChange={(newAlign) => updateAttribute('align', newAlign)}
          isBold={isMarkActive(editor, 'bold')}
          isItalic={isMarkActive(editor, 'italic')}
          onToggleBold={() => toggleMark(editor, 'bold')}
          onToggleItalic={() => toggleMark(editor, 'italic')}
          onToggleLink={() => {}} // TODO: Link editor
          // Three-dot menu actions
          onCopy={onCopy}
          onDuplicate={onDuplicate}
          onInsertBefore={() => onAddBlock?.('before')}
          onInsertAfter={() => onAddBlock?.('after')}
          onRemove={onDelete}
        />
      )}

      {/* Slate Editor */}
      <div
        className={cn('paragraph-content min-h-[1.5em] relative')}
        style={{
          fontSize: `${fontSize}px`,
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined,
        }}
      >
        <Slate
          editor={editor}
          initialValue={initialValue}
          onValueChange={handleChange}
        >
          <Editable
            renderElement={renderElement}
            renderLeaf={DefaultLeafRenderer}
            placeholder="Type / to choose a block"
            onKeyDown={handleKeyDown}
            onClick={onSelect} // Simple: just select on click
            style={{
              outline: 'none',
              minHeight: '1.5em',
            }}
          />
        </Slate>
      </div>
    </CleanBlockWrapper>
  );
};

export default GutenbergParagraphBlock;
