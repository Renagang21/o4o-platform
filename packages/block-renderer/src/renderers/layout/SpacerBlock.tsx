/**
 * Spacer Block Renderer
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const SpacerBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const height = getBlockData(block, 'height', 100);
  const className = getBlockData(block, 'className', '');

  // Build class names
  const spacerClasses = clsx(
    'block-spacer',
    className
  );

  return (
    <div
      className={spacerClasses}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      aria-hidden="true"
    />
  );
};

export default SpacerBlock;
