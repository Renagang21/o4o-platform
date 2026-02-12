/**
 * HeadingBlock
 *
 * Complete rewrite based on WordPress Gutenberg architecture.
 * Clean structure: CleanBlockWrapper + BlockToolbar + Slate editor
 *
 * NO event conflicts, NO focus issues, NO wrapper onClick problems.
 */

import React, { useCallback, useMemo, memo } from 'react';
import { Descendant, Element as SlateElement, Text } from 'slate';
import { Slate, Editable, RenderElementProps } from 'slate-react';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from '../EnhancedBlockWrapper';
import { BlockToolbar } from './BlockToolbar';
import { serialize, deserialize } from '../../slate/utils/serialize';
import { createTextEditor } from '../../utils/slate-editor-factory';
import { isMarkActive, toggleMark } from '../../utils/slate-helpers';
import { DefaultLeafRenderer } from '../../slate/renderers/DefaultLeafRenderer';
import { useSlateKeyboard } from '../../hooks/useSlateKeyboard';
import { createBlockEnterHandler } from '../../utils/handleBlockEnter';
import { createBlockBackspaceHandler } from '../../utils/handleBlockBackspace';
import type { HeadingElement, CustomText } from '../../slate/types/slate-types';

interface HeadingBlockProps {
  id: string;
  content?: string | object;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    content?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    align?: 'left' | 'center' | 'right' | 'justify';
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
  };
}

export const HeadingBlock: React.FC<HeadingBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onCopy,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
}) => {
  const {
    level = 2,
    align = 'left',
    fontSize,
    textColor = '#1e293b',
    backgroundColor = '',
  } = attributes;

  // Create Slate editor
  const editor = useMemo(() => createTextEditor(), []);

  // Convert HTML content to Slate value - ONLY used on initial mount
  // Note: Dependency array is empty - this truly represents "initialValue"
  const initialValue = useMemo(() => {
    const textContent = (typeof content === 'string' && content ? content : '') || attributes.content || '';

    if (!textContent) {
      return [
        {
          type: 'heading',
          level,
          align,
          children: [{ text: '' }],
        } as HeadingElement,
      ];
    }

    try {
      const deserialized = deserialize(textContent);
      if (deserialized.length === 0) {
        return [
          {
            type: 'heading',
            level,
            align,
            children: [{ text: '' }],
          } as HeadingElement,
        ];
      }

      const hasOnlyTextNodes = deserialized.every(node => Text.isText(node));
      if (hasOnlyTextNodes) {
        return [
          {
            type: 'heading',
            level,
            align,
            children: deserialized as CustomText[],
          } as HeadingElement,
        ];
      }

      return deserialized.map(node => {
        if (SlateElement.isElement(node) && node.type === 'heading') {
          return { ...node, level, align } as HeadingElement;
        }
        return node;
      });
    } catch (error) {
      console.error('Failed to deserialize content:', error);
      return [
        {
          type: 'heading',
          level,
          align,
          children: [{ text: textContent }],
        } as HeadingElement,
      ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - truly initial value only

  // Check if block has content (for conditional toolbar visibility)
  // Note: Not using useMemo because editor.children is mutable
  const getHasContent = useCallback(() => {
    const currentValue = editor.children;
    if (!currentValue || currentValue.length === 0) return false;

    // Check all nodes for any text content
    return currentValue.some(node => {
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
  }, [editor]);

  const hasContent = getHasContent();

  // Handle value changes
  const handleChange = useCallback(
    (newValue: Descendant[]) => {
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

  // Render element (heading)
  const renderElement = useCallback((props: RenderElementProps) => {
    const element = props.element as HeadingElement;
    const HeadingTag = `h${element.level || level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

    return (
      <HeadingTag
        {...props.attributes}
        style={{
          textAlign: element.align || align,
          margin: 0,
        }}
      >
        {props.children}
      </HeadingTag>
    );
  }, [level, align]);

  // Size classes for different heading levels
  const sizeClasses = {
    1: 'text-4xl font-bold',
    2: 'text-3xl font-bold',
    3: 'text-2xl font-semibold',
    4: 'text-xl font-semibold',
    5: 'text-lg font-medium',
    6: 'text-base font-medium',
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="heading"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onCopy={onCopy}
      onAddBlock={onAddBlock}
      className="gutenberg-heading-block"
      slateEditor={editor}
      disableAutoFocus={true}
      showToolbar={false}
    >
      {/* Gutenberg-style Block Toolbar (only when selected and has content) */}
      {isSelected && hasContent && (
        <BlockToolbar
          headingLevel={level}
          onHeadingLevelChange={(newLevel) => updateAttribute('level', newLevel)}
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
        className={cn('heading-content min-h-[1.5em] relative', sizeClasses[level])}
        style={{
          fontSize: fontSize ? `${fontSize}px` : undefined,
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined,
        }}
      >
        <MemoizedSlateEditor
          editor={editor}
          initialValue={initialValue}
          handleChange={handleChange}
          renderElement={renderElement}
          handleKeyDown={handleKeyDown}
          placeholder={`Heading ${level}`}
        />
      </div>
    </EnhancedBlockWrapper>
  );
};

// Memoized Slate Editor to prevent re-renders from affecting focus
interface MemoizedSlateEditorProps {
  editor: any;
  initialValue: Descendant[];
  handleChange: (newValue: Descendant[]) => void;
  renderElement: (props: RenderElementProps) => React.JSX.Element;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  placeholder: string;
}

const MemoizedSlateEditor = memo<MemoizedSlateEditorProps>(({
  editor,
  initialValue,
  handleChange,
  renderElement,
  handleKeyDown,
  placeholder
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
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        style={{
          outline: 'none',
          minHeight: '1.5em',
        }}
      />
    </Slate>
  );
}, (prevProps, nextProps) => {
  // Only re-render if editor instance changes (which should never happen)
  return prevProps.editor === nextProps.editor;
});

MemoizedSlateEditor.displayName = 'MemoizedSlateEditor';

export default HeadingBlock;
