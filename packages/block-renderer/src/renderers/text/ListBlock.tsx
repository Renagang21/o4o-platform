/**
 * List Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const ListBlock: React.FC<BlockRendererProps> = ({ block }) => {
  // Get list items from various possible locations
  const items = getBlockData(block, 'items', []);
  const isOrdered = getBlockData(block, 'ordered', false);
  const reversed = getBlockData(block, 'reversed', false);
  const start = getBlockData(block, 'start');
  const className = getBlockData(block, 'className', '');

  if (!items || items.length === 0) return null;

  const ListTag = isOrdered ? 'ol' : 'ul';

  // Build class names
  const classNames = clsx(
    'block-list mb-4 text-gray-700',
    isOrdered ? 'list-decimal' : 'list-disc',
    'list-inside',
    className
  );

  return (
    <ListTag
      className={classNames}
      reversed={isOrdered && reversed ? true : undefined}
      start={isOrdered && start ? start : undefined}
    >
      {items.map((item: string, index: number) => (
        <li
          key={index}
          className="mb-1"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item) }}
        />
      ))}
    </ListTag>
  );
};

export default ListBlock;
