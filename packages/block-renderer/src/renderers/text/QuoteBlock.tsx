/**
 * Quote Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { extractTextContent, getBlockData } from '../../utils/block-parser';
import { getAlignmentClass } from '../../utils/typography';
import clsx from 'clsx';

export const QuoteBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const text = extractTextContent(block);

  if (!text) return null;

  // Get quote data
  const citation = getBlockData(block, 'citation');
  const alignment = getBlockData(block, 'align', 'left');
  const className = getBlockData(block, 'className', '');

  // Build class names
  const classNames = clsx(
    'block-quote border-l-4 border-gray-300 pl-4 py-2 mb-4 italic text-gray-600',
    getAlignmentClass(alignment),
    className
  );

  return (
    <blockquote className={classNames}>
      <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text) }} />
      {citation && (
        <cite className="block mt-2 text-sm text-gray-500 not-italic">
          — {citation}
        </cite>
      )}
    </blockquote>
  );
};

export default QuoteBlock;
