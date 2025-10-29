/**
 * Block Renderer
 * Main component for rendering blocks using the registry
 */

import React from 'react';
import { Block } from './types/block.types';
import { blockRegistry } from './registry/BlockRegistry';

export interface BlockRendererProps {
  blocks: Block | Block[];
  className?: string;
}

/**
 * Render a single block or array of blocks
 */
export const BlockRenderer: React.FC<BlockRendererProps> = ({ blocks, className }) => {
  // Normalize to array
  const blockArray = Array.isArray(blocks) ? blocks : [blocks];

  // Filter out null/undefined blocks
  const validBlocks = blockArray.filter((block): block is Block =>
    block != null && typeof block === 'object' && !!(block.type || block.name)
  );

  if (validBlocks.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {validBlocks.map((block, index) => {
        const blockType = block.type || block.name || 'unknown';
        const blockId = block.id || block.clientId || `block-${index}`;

        const Component = blockRegistry.get(blockType);

        if (!Component) {
          if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
            console.warn(`[BlockRenderer] Unknown block type: ${blockType}`, block);
          }
          return (
            <div key={blockId} className="block-unknown" data-block-type={blockType}>
              <p className="text-sm text-gray-500">Unknown block type: {blockType}</p>
            </div>
          );
        }

        return <Component key={blockId} block={block} />;
      })}
    </div>
  );
};

export default BlockRenderer;
