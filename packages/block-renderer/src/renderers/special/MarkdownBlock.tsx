/**
 * Markdown Block Renderer
 */

import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

export const MarkdownBlock: React.FC<BlockRendererProps> = ({ block }) => {
  // Get markdown content from various possible locations
  const markdown =
    getBlockData(block, 'markdown') ||
    getBlockData(block, 'markdownContent') ||
    getBlockData(block, 'content') ||
    '';

  if (!markdown) return null;

  const fontSize = getBlockData(block, 'fontSize', 16);
  const theme = getBlockData(block, 'theme', 'github');
  const className = getBlockData(block, 'className', '');

  // Build class names
  const markdownClasses = clsx(
    'block-markdown prose prose-sm max-w-none mb-4',
    `theme-${theme}`,
    className
  );

  // Parse markdown to HTML
  let html = '';
  try {
    html = marked.parse(markdown) as string;
  } catch (error) {
    console.error('[MarkdownBlock] Failed to parse markdown:', error);
    return (
      <div className="block-markdown-error text-red-600 p-4 border border-red-300 rounded">
        Failed to parse markdown content
      </div>
    );
  }

  return (
    <div
      className={markdownClasses}
      style={{ fontSize: `${fontSize}px` }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
};

export default MarkdownBlock;
