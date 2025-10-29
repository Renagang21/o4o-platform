/**
 * Separator Block Renderer
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const SeparatorBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const className = getBlockData(block, 'className', '');
  const opacity = getBlockData(block, 'opacity', 'alpha-channel');

  // Build class names
  const separatorClasses = clsx(
    'block-separator my-8 border-t border-gray-300',
    opacity === 'css' && 'opacity-25',
    className
  );

  return <hr className={separatorClasses} />;
};

export default SeparatorBlock;
