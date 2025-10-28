/**
 * Markdown Block Renderer
 * Handles markdown rendering using marked library (consistent with Editor and Frontend)
 */

import React from 'react';
import { marked } from 'marked';
import { Block } from '@/types/post.types';

// Configure marked options (consistent with MarkdownBlock and MarkdownReaderBlock)
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
});

export const renderMarkdown = (block: Block) => {
  const { content, attributes } = block;

  // Use marked library for proper markdown rendering (same as editor and frontend)
  const markdownContent = attributes?.markdown || content || '';
  if (!markdownContent) return null;

  let markdownHTML = '';
  try {
    markdownHTML = marked.parse(markdownContent) as string;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    markdownHTML = `<pre>${markdownContent}</pre>`;
  }

  return (
    <div
      key={block.id}
      className="prose prose-sm max-w-none mb-4 border border-gray-200 rounded-lg p-4"
      dangerouslySetInnerHTML={{ __html: markdownHTML }}
    />
  );
};
