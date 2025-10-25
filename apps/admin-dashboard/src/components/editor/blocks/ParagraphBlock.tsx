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

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Descendant, Editor, Transforms, Element as SlateElement, Text, Range } from 'slate';
import { Slate, Editable, RenderElementProps, ReactEditor } from 'slate-react';
import { cn } from '@/lib/utils';
import SimpleBlockWrapper from './SimpleBlockWrapper';
import SlateBlockWrapper from './shared/SlateBlockWrapper';
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

  // Create Slate editor with plugins (withParagraphs removed - handled by handleBlockEnter)
  const editor = useMemo(() => createTextEditor(), []);

  // Convert HTML content to Slate value
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
  }, []); // Only run once on mount

  const [value, setValue] = useState<Descendant[]>(initialValue);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkEditorPosition, setLinkEditorPosition] = useState<{ top: number; left: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

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
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {props.children}
          </p>
        );
    }
  }, [editor]);


  return (
    <SimpleBlockWrapper
      id={id}
      isSelected={isSelected}
      onSelect={onSelect}
      className="wp-block-paragraph"
    >
      <div
        ref={editorRef}
        className={cn(
          'paragraph-content min-h-[1.5em] relative',
          dropCap && 'first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none'
        )}
        style={{
          fontSize: `${fontSize}px`,
          color: textColor || undefined,
          backgroundColor: backgroundColor || undefined,
        }}
        data-handles-enter="true"
      >
        <SlateBlockWrapper
          isSelected={isSelected}
          value={value}
          serialize={serialize}
          viewModeStyle={{
            textAlign: align,
          }}
          emptyPlaceholder="<p><br></p>"
        >
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
        </SlateBlockWrapper>
      </div>
    </SimpleBlockWrapper>
  );
};

export default ParagraphBlock;
