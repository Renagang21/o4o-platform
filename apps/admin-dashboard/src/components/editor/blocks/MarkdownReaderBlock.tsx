/**
 * Markdown Reader Block - Temporary Implementation
 * TODO: Migrate full implementation from packages/blocks/dynamic
 */

import React, { useState } from 'react';
import { FileCode } from 'lucide-react';

interface MarkdownReaderBlockProps {
  id: string;
  content?: {
    url?: string;
    markdownContent?: string;
  };
  attributes?: {
    fontSize?: number;
    theme?: string;
  };
  onChange?: (content: any, attributes?: any) => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

const MarkdownReaderBlock: React.FC<MarkdownReaderBlockProps> = ({
  id,
  content = {},
  attributes = {},
  onChange,
  isSelected,
  onSelect,
}) => {
  const { url = '', markdownContent = '' } = content;
  const { fontSize = 16, theme = 'github' } = attributes;

  const handleUrlChange = (newUrl: string) => {
    if (onChange) {
      onChange({ ...content, url: newUrl }, attributes);
    }
  };

  return (
    <div
      className={`markdown-reader-block p-6 border-2 rounded-lg transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-4">
        <FileCode className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-700">Markdown Reader</h3>
      </div>

      {!url && !markdownContent ? (
        <div className="text-center py-8 bg-gray-50 rounded border-2 border-dashed border-gray-300">
          <FileCode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Add a Markdown file URL</p>
          <input
            type="url"
            placeholder="https://example.com/document.md"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => handleUrlChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">URL:</span>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div
            className={`markdown-content p-4 bg-white rounded border theme-${theme}`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {markdownContent ? (
              <div dangerouslySetInnerHTML={{ __html: markdownContent }} />
            ) : (
              <p className="text-gray-400 italic">Loading markdown content...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownReaderBlock;
