/**
 * Layout Block Renderers
 * Handles columns, group, spacer, separator, and button blocks
 */

import React from 'react';
import { Block } from '@/types/post.types';

// renderBlock type - will be passed from PostPreview
type RenderBlockFn = (block: Block) => React.ReactNode;

export const renderColumns = (block: Block, renderBlock: RenderBlockFn) => {
  const { innerBlocks = [] } = block;

  // Columns block has innerBlocks that are individual column blocks
  return (
    <div key={block.id} className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${innerBlocks.length}, 1fr)` }}>
      {innerBlocks.map((column) => (
        <div key={column.id} className="min-h-[50px]">
          {column.innerBlocks?.map((innerBlock) => renderBlock(innerBlock))}
        </div>
      ))}
    </div>
  );
};

export const renderColumn = (block: Block, renderBlock: RenderBlockFn) => {
  const { innerBlocks = [] } = block;

  // Column is a single column within a columns block
  return (
    <div key={block.id} className="min-h-[50px]">
      {innerBlocks.map((innerBlock) => renderBlock(innerBlock))}
    </div>
  );
};

export const renderGroup = (block: Block, renderBlock: RenderBlockFn) => {
  const { innerBlocks = [], attributes } = block;

  return (
    <div
      key={block.id}
      className="mb-4 p-4 rounded-lg"
      style={{
        backgroundColor: attributes?.backgroundColor,
      }}
    >
      {innerBlocks.map((innerBlock) => renderBlock(innerBlock))}
    </div>
  );
};

export const renderButton = (block: Block) => {
  const { content, attributes } = block;

  // Extract text from content
  const extractText = (content: any, fallback: string = ''): string => {
    if (typeof content === 'string') {
      return content.replace(/<[^>]*>/g, '').trim() || fallback;
    }
    if (content?.text) return content.text;
    return fallback;
  };

  const blockContent = extractText(content, 'Click here');

  return (
    <div key={block.id} className="mb-4">
      <button
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        style={{
          backgroundColor: attributes?.backgroundColor || '#2563eb',
          color: attributes?.textColor || '#ffffff',
          borderRadius: attributes?.borderRadius || '8px',
        }}
      >
        {blockContent}
      </button>
    </div>
  );
};

export const renderSeparator = (block: Block) => {
  return <hr key={block.id} className="my-8 border-t border-gray-300" />;
};

export const renderSpacer = (block: Block) => {
  const { attributes } = block;

  return (
    <div
      key={block.id}
      style={{ height: attributes?.height || '50px' }}
    />
  );
};

export const renderTable = (block: Block) => {
  const { content, attributes } = block;
  const tableContent = content?.tableData || attributes?.tableData || [];

  return (
    <div key={block.id} className="mb-6 overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <tbody>
          {tableContent.map((row: any[], rowIndex: number) => (
            <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-100 font-semibold' : ''}>
              {row.map((cell: any, cellIndex: number) => {
                const CellTag = rowIndex === 0 ? 'th' : 'td';
                return (
                  <CellTag
                    key={cellIndex}
                    className="border border-gray-300 px-4 py-2 text-left"
                  >
                    {cell}
                  </CellTag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
