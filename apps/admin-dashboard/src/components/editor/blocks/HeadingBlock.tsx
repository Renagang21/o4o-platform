/**
 * HeadingBlock Component (Slate.js-based)
 *
 * New Slate.js-based heading block implementation following ParagraphBlock pattern.
 * Replaces the old EnhancedHeadingBlock.
 *
 * Features:
 * - Slate.js editor with Bold, Italic, Strikethrough, Code formatting
 * - Link support (Ctrl+K)
 * - Heading level selection (H1-H6)
 * - Text alignment
 * - HTML serialization for Gutenberg compatibility
 * - Undo/Redo support
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Descendant, Editor, Transforms, Element as SlateElement, Text, Range } from 'slate';
import { Slate, Editable, RenderElementProps, ReactEditor } from 'slate-react';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { unwrapLink, wrapLink, getActiveLinkElement } from '../slate/plugins/withLinks';
import { serialize, deserialize } from '../slate/utils/serialize';
import LinkInlineEditor from '../slate/components/LinkInlineEditor';
import { createBlockEnterHandler } from '../utils/handleBlockEnter';
import { createBlockBackspaceHandler } from '../utils/handleBlockBackspace';
import { createTextEditor } from '../utils/slate-editor-factory';
import { isMarkActive, toggleMark } from '../utils/slate-helpers';
import { DefaultLeafRenderer } from '../slate/renderers/DefaultLeafRenderer';
import { useSlateKeyboard } from '../hooks/useSlateKeyboard';
import type { CustomText, HeadingElement, LinkElement } from '../slate/types/slate-types';

interface HeadingBlockProps {
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
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    align?: 'left' | 'center' | 'right' | 'justify';
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
  };
}

const HeadingBlock: React.FC<HeadingBlockProps> = ({
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
    level = 2,
    align = 'left',
    fontSize,
    textColor = '#1e293b',
    backgroundColor = '',
  } = attributes;

  // Create Slate editor with plugins (withParagraphs removed - handled by handleBlockEnter)
  const editor = useMemo(() => createTextEditor(), []);

  // Convert HTML content to Slate value
  const initialValue = useMemo(() => {
    // Prioritize content (HTML from AI) over attributes.content (plain text)
    const textContent = (typeof content === 'string' && content ? content : '') || attributes.content || '';

    if (!textContent || textContent === '') {
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
      // Ensure we have at least one heading
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

      // If deserialized content is just text nodes (plain text), wrap in heading
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

      // Apply level and alignment to deserialized headings
      return deserialized.map(node => {
        if (SlateElement.isElement(node) && node.type === 'heading') {
          return { ...node, level, align } as HeadingElement;
        }
        // If content was a paragraph, convert to heading
        if (SlateElement.isElement(node) && node.type === 'paragraph') {
          return {
            type: 'heading',
            level,
            align,
            children: node.children,
          } as HeadingElement;
        }
        return node;
      });
    } catch (error) {
      console.error('Failed to deserialize heading content:', error);
      return [
        {
          type: 'heading',
          level,
          align,
          children: [{ text: textContent }],
        } as HeadingElement,
      ];
    }
  }, []); // Only run once on mount

  const [value, setValue] = useState<Descendant[]>(initialValue);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkEditorPosition, setLinkEditorPosition] = useState<{ top: number; left: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Update editor when level or alignment changes
  useEffect(() => {
    if (value.length > 0) {
      const firstNode = value[0];
      if (SlateElement.isElement(firstNode) && firstNode.type === 'heading') {
        const currentHeading = firstNode as HeadingElement;
        if (currentHeading.level !== level || currentHeading.align !== align) {
          // Update level and alignment without triggering onChange
          Transforms.setNodes(
            editor,
            { level, align } as Partial<HeadingElement>,
            { at: [0] }
          );
        }
      }
    }
  }, [level, align, editor, value]);

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

  // Render element (heading or link)
  const renderElement = useCallback((props: RenderElementProps) => {
    const element = props.element as HeadingElement | LinkElement;

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
      case 'heading':
      default: {
        const headingElement = element as HeadingElement;
        const HeadingTag = `h${headingElement.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

        return (
          <HeadingTag
            {...props.attributes}
            style={{
              textAlign: headingElement.align || 'left',
              margin: 0,
            }}
          >
            {props.children}
          </HeadingTag>
        );
      }
    }
  }, [editor]);


  // Size classes for different heading levels
  const sizeClasses = {
    1: 'text-4xl font-bold',
    2: 'text-3xl font-bold',
    3: 'text-2xl font-semibold',
    4: 'text-xl font-semibold',
    5: 'text-lg font-medium',
    6: 'text-base font-medium',
  };

  // Custom toolbar content for heading block (level selector)
  const customToolbarContent = isSelected ? (
    <div className="flex items-center gap-2 mr-2">
      <select
        value={level.toString()}
        onChange={(e) => updateAttribute('level', parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)}
        className="h-7 px-2 text-sm border border-gray-200 rounded hover:border-gray-300 focus:outline-none focus:border-blue-500"
      >
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
        <option value="4">H4</option>
        <option value="5">H5</option>
        <option value="6">H6</option>
      </select>
    </div>
  ) : null;

  return (
    <EnhancedBlockWrapper
      id={id}
      type="heading"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      className="wp-block-heading"
      customToolbarContent={customToolbarContent}
      onAlignChange={(newAlign) => updateAttribute('align', newAlign)}
      currentAlign={align}
      onToggleBold={() => toggleMark(editor, 'bold')}
      onToggleItalic={() => toggleMark(editor, 'italic')}
      onToggleLink={toggleLinkEditor}
      isBold={isMarkActive(editor, 'bold')}
      isItalic={isMarkActive(editor, 'italic')}
    >
      <div
        ref={editorRef}
        className={cn(
          'heading-content min-h-[1.5em] relative',
          sizeClasses[level]
        )}
        style={{
          fontSize: fontSize ? `${fontSize}px` : undefined,
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined,
        }}
        data-handles-enter="true"
      >
        <Slate editor={editor} initialValue={initialValue} onValueChange={handleChange}>
          <Editable
            renderElement={renderElement}
            renderLeaf={DefaultLeafRenderer}
            placeholder={`Heading ${level}`}
            onKeyDown={handleKeyDown}
            style={{
              outline: 'none',
              minHeight: '1.5em',
            }}
          />
        </Slate>

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

export default HeadingBlock;
