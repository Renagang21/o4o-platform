/**
 * StandardTextBlock Template
 *
 * Reusable template for Slate.js-based text blocks.
 * Provides standard structure: EnhancedBlockWrapper + BlockToolbar + Slate editor
 *
 * Eliminates code duplication and ensures consistency across text blocks.
 *
 * Features:
 * - Standard Gutenberg toolbar
 * - Conditional toolbar visibility (only when selected and has content)
 * - Slate.js editor with custom rendering
 * - Keyboard shortcuts
 * - Alignment controls
 * - Text formatting (Bold, Italic, Link)
 *
 * Usage:
 * ```typescript
 * <StandardTextBlock
 *   {...props}
 *   blockType="paragraph"
 *   renderElement={renderElement}
 *   placeholder="Type something..."
 * />
 * ```
 */

import React, { memo } from 'react';
import { Slate, Editable, RenderElementProps, RenderLeafProps } from 'slate-react';
import { Descendant } from 'slate';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from '../EnhancedBlockWrapper';
import { BlockToolbar } from '../gutenberg/BlockToolbar';
import { useSlateBlock } from '../../hooks/useSlateBlock';
import { isMarkActive, toggleMark } from '../../utils/slate-helpers';
import { DefaultLeafRenderer } from '../../slate/renderers/DefaultLeafRenderer';

export interface StandardTextBlockProps {
  id: string;
  content?: string | object;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    content?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    level?: 1 | 2 | 3 | 4 | 5 | 6; // For headings
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
    [key: string]: any;
  };
  /** Block type */
  blockType: 'paragraph' | 'heading' | 'quote' | 'list' | 'code';
  /** Custom element renderer */
  renderElement: (props: RenderElementProps) => React.JSX.Element;
  /** Custom leaf renderer (optional, defaults to DefaultLeafRenderer) */
  renderLeaf?: (props: RenderLeafProps) => React.JSX.Element;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS class */
  className?: string;
  /** Custom toolbar content (optional) */
  customToolbarContent?: React.ReactNode;
  /** Show heading level selector (for heading blocks) */
  showHeadingLevel?: boolean;
  /** Link toggle handler (optional) */
  onToggleLink?: () => void;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

export const StandardTextBlock: React.FC<StandardTextBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  blockType,
  renderElement,
  renderLeaf = DefaultLeafRenderer,
  placeholder,
  className,
  customToolbarContent,
  showHeadingLevel = false,
  onToggleLink,
  style,
}) => {
  const {
    align = 'left',
    level = 2,
    fontSize,
    textColor,
    backgroundColor,
  } = attributes;

  // Use unified Slate block hook
  const {
    editor,
    initialValue,
    hasContent,
    handleChange,
    handleKeyDown,
    updateAttribute,
  } = useSlateBlock({
    content,
    attributes,
    onChange,
    onDelete,
    onAddBlock,
    blockType,
    onToggleLink,
  });

  return (
    <EnhancedBlockWrapper
      id={id}
      type={blockType}
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onAddBlock={onAddBlock}
      className={cn('standard-text-block', className)}
      slateEditor={editor}
      disableAutoFocus={true}
      showToolbar={false}
    >
      {/* Gutenberg-style Block Toolbar (only when selected and has content) */}
      {isSelected && hasContent && (
        <BlockToolbar
          // Heading level (for heading blocks)
          {...(showHeadingLevel && {
            headingLevel: level as 1 | 2 | 3 | 4 | 5 | 6,
            onHeadingLevelChange: (newLevel) => updateAttribute('level', newLevel),
          })}
          // Alignment
          align={align}
          onAlignChange={(newAlign) => updateAttribute('align', newAlign)}
          // Text formatting
          isBold={isMarkActive(editor, 'bold')}
          isItalic={isMarkActive(editor, 'italic')}
          onToggleBold={() => toggleMark(editor, 'bold')}
          onToggleItalic={() => toggleMark(editor, 'italic')}
          onToggleLink={onToggleLink}
          // More menu actions
          onDuplicate={onDuplicate}
          onInsertBefore={() => onAddBlock?.('before')}
          onInsertAfter={() => onAddBlock?.('after')}
          onRemove={onDelete}
        >
          {/* Custom toolbar content */}
          {customToolbarContent}
        </BlockToolbar>
      )}

      {/* Slate Editor */}
      <div
        className={cn('slate-content min-h-[1em] relative')}
        style={{
          fontSize: fontSize ? `${fontSize}px` : undefined,
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined,
          ...style,
        }}
      >
        <MemoizedSlateEditor
          editor={editor}
          initialValue={initialValue}
          handleChange={handleChange}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          handleKeyDown={handleKeyDown}
          placeholder={placeholder}
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
  renderLeaf: (props: RenderLeafProps) => React.JSX.Element;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  placeholder?: string;
}

const MemoizedSlateEditor = memo<MemoizedSlateEditorProps>(
  ({
    editor,
    initialValue,
    handleChange,
    renderElement,
    renderLeaf,
    handleKeyDown,
    placeholder,
  }) => {
    return (
      <Slate
        editor={editor}
        initialValue={initialValue}
        onValueChange={handleChange}
      >
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          style={{
            outline: 'none',
            minHeight: '1.5em',
          }}
        />
      </Slate>
    );
  },
  (prevProps, nextProps) => {
    // Re-render if editor or renderElement changes
    return prevProps.editor === nextProps.editor && prevProps.renderElement === nextProps.renderElement;
  }
);

MemoizedSlateEditor.displayName = 'MemoizedSlateEditor';

export default StandardTextBlock;
