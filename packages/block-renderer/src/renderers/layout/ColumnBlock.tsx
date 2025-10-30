/**
 * Column Block Renderer
 * Single column within a columns block
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import { BlockRenderer } from '../../BlockRenderer';
import clsx from 'clsx';

export const ColumnBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const innerBlocks = block.innerBlocks || [];

  // Get column settings
  const width = getBlockData(block, 'width');
  const verticalAlignment = getBlockData(block, 'verticalAlignment');
  const className = getBlockData(block, 'className', '');

  // Build class names
  const columnClasses = clsx(
    'block-column min-h-[50px] p-4 border border-gray-200 rounded-lg',
    verticalAlignment && `self-${verticalAlignment}`,
    className
  );

  return (
    <div
      className={columnClasses}
      style={{
        flexBasis: width,
        flexGrow: width ? 0 : 1,
      }}
    >
      <BlockRenderer blocks={innerBlocks} />
    </div>
  );
};

export default ColumnBlock;
