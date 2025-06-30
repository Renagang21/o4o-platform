/**
 * TipTap Shortcode Extension
 * 숏코드를 TipTap 에디터에서 실시간 렌더링하는 확장
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';
import { ShortcodeRenderer, ShortcodeRendererProps } from '../../../lib/shortcode/renderer';
import { ShortcodeParser, ParsedShortcode } from '../../../lib/shortcode/parser';

interface ShortcodeAttributes {
  shortcode: string;
  editable?: boolean;
}

// Shortcode Node View Component
const ShortcodeNodeView: React.FC<{
  node: { attrs: ShortcodeAttributes };
  updateAttributes: (attrs: Partial<ShortcodeAttributes>) => void;
  deleteNode: () => void;
  editor: any;
}> = ({ node, updateAttributes, deleteNode, editor }) => {
  const { shortcode, editable = true } = node.attrs;
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(shortcode);
  const [parsedShortcode, setParsedShortcode] = React.useState<ParsedShortcode | null>(null);

  React.useEffect(() => {
    if (shortcode) {
      const parsed = ShortcodeParser.parseSingleShortcode(shortcode);
      setParsedShortcode(parsed);
    }
  }, [shortcode]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(shortcode);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      updateAttributes({ shortcode: trimmed });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(shortcode);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Get API client from editor if available
  const apiClient = (editor as any)?.options?.shortcodeApiClient;

  if (isEditing) {
    return (
      <NodeViewWrapper className="shortcode-node-view editing">
        <div className="shortcode-editor bg-gray-50 border-2 border-blue-300 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Edit Shortcode</span>
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 text-sm border border-gray-300 rounded resize-none"
            rows={2}
            placeholder="Enter shortcode (e.g., [image id=&quot;123&quot;])"
            autoFocus
          />
          <div className="text-xs text-gray-500 mt-1">
            Press Enter to save, Escape to cancel
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  if (!parsedShortcode) {
    return (
      <NodeViewWrapper className="shortcode-node-view invalid">
        <div className="shortcode-invalid bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-red-700">Invalid shortcode: {shortcode}</span>
            </div>
            <div className="flex space-x-2">
              {editable && (
                <button
                  onClick={handleEdit}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Edit
                </button>
              )}
              <button
                onClick={deleteNode}
                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  const shortcodeInfo = ShortcodeRenderer.getShortcode(parsedShortcode.name);

  if (!shortcodeInfo) {
    return (
      <NodeViewWrapper className="shortcode-node-view unknown">
        <div className="shortcode-unknown bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-yellow-700">Unknown shortcode: {parsedShortcode.name}</span>
            </div>
            <div className="flex space-x-2">
              {editable && (
                <button
                  onClick={handleEdit}
                  className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                >
                  Edit
                </button>
              )}
              <button
                onClick={deleteNode}
                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  const ShortcodeComponent = shortcodeInfo.component;

  return (
    <NodeViewWrapper className="shortcode-node-view rendered">
      <div className="shortcode-wrapper relative group">
        {/* Shortcode Component */}
        <ShortcodeComponent
          shortcode={parsedShortcode}
          apiClient={apiClient}
          editorMode={true}
        />

        {/* Editor Controls Overlay */}
        {editable && (
          <div className="shortcode-controls absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              <button
                onClick={handleEdit}
                className="bg-blue-500 text-white p-1 rounded text-xs hover:bg-blue-600"
                title="Edit shortcode"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={deleteNode}
                className="bg-red-500 text-white p-1 rounded text-xs hover:bg-red-600"
                title="Delete shortcode"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// TipTap Extension Definition
export const ShortcodeExtension = Node.create({
  name: 'shortcode',
  group: 'block',
  content: '',
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      shortcode: {
        default: '',
        parseHTML: element => element.getAttribute('data-shortcode'),
        renderHTML: attributes => {
          if (!attributes.shortcode) {
            return {};
          }
          return {
            'data-shortcode': attributes.shortcode,
          };
        },
      },
      editable: {
        default: true,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-shortcode]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'shortcode-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ShortcodeNodeView);
  },

  addCommands() {
    return {
      insertShortcode: (shortcode: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { shortcode },
        });
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => {
        // Open shortcode insertion dialog
        const shortcodeText = window.prompt('Enter shortcode:');
        if (shortcodeText) {
          this.editor.commands.insertShortcode(shortcodeText);
        }
        return true;
      },
    };
  },
});

export default ShortcodeExtension;