/**
 * ListBlock Component (Slate.js-based)
 *
 * New Slate.js-based list block implementation.
 *
 * Features:
 * - Slate.js editor with Bold, Italic, Underline, Strikethrough, Code formatting
 * - Link support (Ctrl+K)
 * - Ordered and Unordered lists
 * - Nested lists support
 * - Tab/Shift+Tab for indent/outdent
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
import { withLists, indentListItem, outdentListItem } from '../slate/plugins/withLists';
import { serialize, deserialize } from '../slate/utils/serialize';
import type { CustomText, ListElement, ListItemElement, LinkElement } from '../slate/types/slate-types';
import { List, ListOrdered } from 'lucide-react';

interface ListBlockProps {
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
    type?: 'ordered' | 'unordered';
    align?: 'left' | 'center' | 'right' | 'justify';
  };
}

const ListBlock: React.FC<ListBlockProps> = ({
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
    type = 'unordered',
    align = 'left',
  } = attributes;

  // Create Slate editor with plugins
  const editor = useMemo(
    () => withLists(withLinks(withDeleteKey(withParagraphs(withHistory(withReact(createEditor())))))),
    []
  );

  // Convert HTML content to Slate value
  const initialValue = useMemo(() => {
    if (!content || content === '') {
      return [
        {
          type: type === 'ordered' ? 'ordered-list' : 'unordered-list',
          children: [
            {
              type: 'list-item',
              children: [{ text: '' }],
            },
          ],
        } as ListElement,
      ];
    }

    try {
      const deserialized = deserialize(content);
      // Ensure we have at least one list
      if (deserialized.length === 0) {
        return [
          {
            type: type === 'ordered' ? 'ordered-list' : 'unordered-list',
            children: [
              {
                type: 'list-item',
                children: [{ text: '' }],
              },
            ],
          } as ListElement,
        ];
      }
      // Apply type to deserialized lists
      return deserialized.map(node => {
        if (SlateElement.isElement(node) && (node.type === 'ordered-list' || node.type === 'unordered-list')) {
          return { ...node, type: type === 'ordered' ? 'ordered-list' : 'unordered-list' } as ListElement;
        }
        // If content was not a list, wrap it in a list
        return {
          type: type === 'ordered' ? 'ordered-list' : 'unordered-list',
          children: [
            {
              type: 'list-item',
              children: SlateElement.isElement(node) ? node.children : [{ text: String(node) }],
            },
          ],
        } as ListElement;
      });
    } catch (error) {
      console.error('Failed to deserialize list content:', error);
      return [
        {
          type: type === 'ordered' ? 'ordered-list' : 'unordered-list',
          children: [
            {
              type: 'list-item',
              children: [{ text: content }],
            },
          ],
        } as ListElement,
      ];
    }
  }, []); // Only run once on mount

  const [value, setValue] = useState<Descendant[]>(initialValue);

  // Update editor when type changes
  useEffect(() => {
    if (value.length > 0) {
      const firstNode = value[0];
      if (SlateElement.isElement(firstNode) && (firstNode.type === 'ordered-list' || firstNode.type === 'unordered-list')) {
        const currentList = firstNode as ListElement;
        const expectedType = type === 'ordered' ? 'ordered-list' : 'unordered-list';
        if (currentList.type !== expectedType) {
          // Update list type without triggering onChange
          Transforms.setNodes(
            editor,
            { type: expectedType } as Partial<ListElement>,
            { at: [0] }
          );
        }
      }
    }
  }, [type, editor, value]);

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

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isModKey = event.ctrlKey || event.metaKey;

      // Tab for indent
      if (event.key === 'Tab') {
        event.preventDefault();
        if (event.shiftKey) {
          // Shift+Tab: outdent
          outdentListItem(editor);
        } else {
          // Tab: indent
          indentListItem(editor);
        }
        return;
      }

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
    },
    [editor]
  );

  // Render element (list, list-item, or link)
  const renderElement = useCallback((props: RenderElementProps) => {
    const element = props.element as ListElement | ListItemElement | LinkElement;

    switch (element.type) {
      case 'ordered-list':
        return (
          <ol {...props.attributes} className="list-decimal list-outside ml-6 space-y-1">
            {props.children}
          </ol>
        );
      case 'unordered-list':
        return (
          <ul {...props.attributes} className="list-disc list-outside ml-6 space-y-1">
            {props.children}
          </ul>
        );
      case 'list-item':
        return (
          <li {...props.attributes} className="pl-2">
            {props.children}
          </li>
        );
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
      default:
        return <div {...props.attributes}>{props.children}</div>;
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

  // Custom toolbar content for list block (type selector)
  const customToolbarContent = isSelected ? (
    <div className="flex items-center gap-2 mr-2">
      <button
        onClick={() => updateAttribute('type', 'unordered')}
        className={cn(
          'h-7 px-2 text-sm border rounded hover:border-gray-300 focus:outline-none focus:border-blue-500 flex items-center gap-1',
          type === 'unordered' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        )}
        title="Unordered List"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => updateAttribute('type', 'ordered')}
        className={cn(
          'h-7 px-2 text-sm border rounded hover:border-gray-300 focus:outline-none focus:border-blue-500 flex items-center gap-1',
          type === 'ordered' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        )}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  return (
    <EnhancedBlockWrapper
      id={id}
      type="list"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      className="wp-block-list"
      customToolbarContent={customToolbarContent}
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
      <div className="list-content min-h-[1.5em]">
        <Slate editor={editor} initialValue={initialValue} onValueChange={handleChange}>
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="List"
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

export default ListBlock;
