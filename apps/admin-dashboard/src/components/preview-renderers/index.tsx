/**
 * Block Renderers for Preview
 *
 * Modular rendering system for PostPreview and other admin preview contexts
 *
 * Architecture:
 * - Each module handles a specific category of blocks
 * - Consistent with Frontend's BlockRenderer approach
 * - Easy to maintain and extend
 *
 * Usage:
 * ```tsx
 * import { renderBlock } from '@/components/preview-renderers';
 *
 * const preview = blocks.map(block => renderBlock(block));
 * ```
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { renderParagraph, renderHeading, renderList, renderQuote, renderCode } from './renderTextBlocks';
import { renderImage, renderVideo, renderGallery, renderAudio } from './renderMediaBlocks';
import { renderColumns, renderColumn, renderGroup, renderButton, renderSeparator, renderSpacer, renderTable } from './renderLayoutBlocks';
import { renderMarkdown } from './renderMarkdown';
import { renderCover, renderSlide, renderYoutube, renderFile, renderSocialLinks, renderShortcode } from './renderSpecialBlocks';

/**
 * Main block renderer
 * Routes blocks to their specific render functions
 */
export const renderBlock = (block: Block): React.ReactNode => {
  if (!block || !block.type) {
    return null;
  }

  const { type } = block;

  // Text blocks
  if (type === 'o4o/paragraph' || type === 'paragraph') {
    return renderParagraph(block);
  }
  if (type === 'o4o/heading' || type === 'heading') {
    return renderHeading(block);
  }
  if (type === 'o4o/list' || type === 'list') {
    return renderList(block);
  }
  if (type === 'o4o/quote' || type === 'quote') {
    return renderQuote(block);
  }
  if (type === 'o4o/code' || type === 'code') {
    return renderCode(block);
  }

  // Media blocks
  if (type === 'o4o/image' || type === 'image') {
    return renderImage(block);
  }
  if (type === 'o4o/video' || type === 'video') {
    return renderVideo(block);
  }
  if (type === 'o4o/gallery' || type === 'gallery') {
    return renderGallery(block);
  }
  if (type === 'o4o/audio' || type === 'audio') {
    return renderAudio(block);
  }

  // Layout blocks (need recursive renderBlock for innerBlocks)
  if (type === 'o4o/columns' || type === 'columns') {
    return renderColumns(block, renderBlock);
  }
  if (type === 'o4o/column' || type === 'column') {
    return renderColumn(block, renderBlock);
  }
  if (type === 'o4o/group' || type === 'group') {
    return renderGroup(block, renderBlock);
  }
  if (type === 'o4o/button' || type === 'button') {
    return renderButton(block);
  }
  if (type === 'o4o/separator' || type === 'separator') {
    return renderSeparator(block);
  }
  if (type === 'o4o/spacer' || type === 'spacer') {
    return renderSpacer(block);
  }
  if (type === 'o4o/table' || type === 'table') {
    return renderTable(block);
  }

  // Markdown blocks
  if (type === 'o4o/markdown' || type === 'o4o/markdown-reader' || type === 'markdown') {
    return renderMarkdown(block);
  }

  // Special blocks
  if (type === 'o4o/cover') {
    return renderCover(block);
  }
  if (type === 'o4o/slide') {
    return renderSlide(block);
  }
  if (type === 'o4o/youtube') {
    return renderYoutube(block);
  }
  if (type === 'o4o/file') {
    return renderFile(block);
  }
  if (type === 'core/social-links') {
    return renderSocialLinks(block);
  }
  if (type === 'o4o/shortcode') {
    return renderShortcode(block);
  }

  // Unknown block fallback
  return (
    <div key={block.id} className="p-4 bg-gray-100 rounded border border-gray-300 mb-4">
      <p className="text-sm text-gray-600">
        Unknown block type: {type}
      </p>
      {block.content && (
        <div className="mt-2 text-xs text-gray-500">
          {typeof block.content === 'string' ? block.content : JSON.stringify(block.content)}
        </div>
      )}
    </div>
  );
};

// Export individual renderers for advanced use cases
export * from './renderTextBlocks';
export * from './renderMediaBlocks';
export * from './renderLayoutBlocks';
export * from './renderMarkdown';
export * from './renderSpecialBlocks';
