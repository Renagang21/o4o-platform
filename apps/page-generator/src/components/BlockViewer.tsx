/**
 * Block Viewer Component
 * Displays converted O4O blocks as formatted JSON
 */

import { FC } from 'react';
import type { Block } from '../core/types';

interface BlockViewerProps {
  blocks: Block[];
  stats?: {
    totalBlocks: number;
    placeholderCount: number;
    successfulConversions: number;
  };
}

export const BlockViewer: FC<BlockViewerProps> = ({ blocks, stats }) => {
  const jsonString = JSON.stringify(blocks, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    alert('Copied to clipboard!');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">O4O Blocks</h2>
          {stats && (
            <div className="mt-1 text-sm text-gray-600">
              Total: {stats.totalBlocks} | Converted: {stats.successfulConversions} |
              Placeholders: {stats.placeholderCount}
            </div>
          )}
        </div>
        <button
          onClick={handleCopy}
          disabled={blocks.length === 0}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Copy JSON
        </button>
      </div>

      <div className="flex-1 border border-gray-300 rounded-md overflow-hidden bg-gray-50">
        {blocks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No blocks converted yet. Enter JSX code and click "Convert to Blocks".
          </div>
        ) : (
          <pre className="p-4 text-sm overflow-auto h-full">
            <code className="text-gray-800">{jsonString}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
