/**
 * HTML Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { extractTextContent, getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const HtmlBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const content = getBlockData(block, 'content') || extractTextContent(block);

  if (!content) return null;

  const className = getBlockData(block, 'className', '');

  // Build class names
  const htmlClasses = clsx(
    'block-html mb-4',
    className
  );

  return (
    <div
      className={htmlClasses}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
    />
  );
};

export default HtmlBlock;
