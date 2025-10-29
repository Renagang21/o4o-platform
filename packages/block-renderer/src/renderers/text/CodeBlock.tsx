/**
 * Code Block Renderer
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { extractTextContent, getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const CodeBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const text = extractTextContent(block);

  if (!text) return null;

  const className = getBlockData(block, 'className', '');
  const language = getBlockData(block, 'language');

  // Build class names
  const classNames = clsx(
    'block-code bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto',
    className,
    language && `language-${language}`
  );

  // Remove HTML tags from code
  const cleanText = text.replace(/<[^>]*>/g, '');

  return (
    <pre className={classNames}>
      <code className="text-sm font-mono">{cleanText}</code>
    </pre>
  );
};

export default CodeBlock;
