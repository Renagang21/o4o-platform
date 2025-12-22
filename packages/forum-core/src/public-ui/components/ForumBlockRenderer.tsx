/**
 * Forum Block Renderer
 *
 * Wrapper around @o4o/block-renderer for forum-specific content rendering.
 * Handles Block[] content from ForumPost and renders it using the platform's
 * unified block rendering engine.
 */

import React from 'react';
import type { Block } from '@o4o/types';

export interface ForumBlockRendererProps {
  /** Block content to render */
  content: Block[];
  /** Additional CSS class names */
  className?: string;
  /** Maximum blocks to render (for excerpts) */
  maxBlocks?: number;
  /** Whether to show a "read more" indicator when truncated */
  showReadMore?: boolean;
}

/**
 * Simple paragraph block renderer
 */
const ParagraphBlock: React.FC<{ block: Block }> = ({ block }) => {
  const content = typeof block.content === 'string'
    ? block.content
    : block.content?.text || '';

  return (
    <p className="forum-block-paragraph mb-4 text-gray-700 leading-relaxed">
      {content}
    </p>
  );
};

/**
 * Heading block renderer
 */
const HeadingBlock: React.FC<{ block: Block }> = ({ block }) => {
  const content = typeof block.content === 'string'
    ? block.content
    : block.content?.text || '';
  const level = (typeof block.attributes?.level === 'number'
    ? block.attributes.level
    : 2) as 1 | 2 | 3 | 4 | 5 | 6;

  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const sizeClasses: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-semibold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-medium',
    5: 'text-base font-medium',
    6: 'text-sm font-medium',
  };

  return (
    <Tag className={`forum-block-heading mb-3 ${sizeClasses[level] || sizeClasses[2]}`}>
      {content}
    </Tag>
  );
};

/**
 * Image block renderer
 */
const ImageBlock: React.FC<{ block: Block }> = ({ block }) => {
  const src = block.attributes?.src || block.content?.src || '';
  const alt = block.attributes?.alt || block.content?.alt || '';
  const caption = block.attributes?.caption || block.content?.caption;

  if (!src) return null;

  return (
    <figure className="forum-block-image mb-4">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg"
        loading="lazy"
      />
      {caption && (
        <figcaption className="text-sm text-gray-500 mt-2 text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

/**
 * Quote block renderer
 */
const QuoteBlock: React.FC<{ block: Block }> = ({ block }) => {
  const content = typeof block.content === 'string'
    ? block.content
    : block.content?.text || '';
  const citation = block.attributes?.citation || block.content?.citation;

  return (
    <blockquote className="forum-block-quote border-l-4 border-blue-500 pl-4 py-2 mb-4 italic text-gray-600">
      <p>{content}</p>
      {citation && (
        <cite className="block mt-2 text-sm text-gray-500 not-italic">
          — {citation}
        </cite>
      )}
    </blockquote>
  );
};

/**
 * List block renderer
 */
const ListBlock: React.FC<{ block: Block }> = ({ block }) => {
  const items = block.content?.items || block.attributes?.values || [];
  const ordered = block.attributes?.ordered || block.content?.ordered || false;

  const Tag = ordered ? 'ol' : 'ul';
  const listClass = ordered
    ? 'list-decimal list-inside'
    : 'list-disc list-inside';

  return (
    <Tag className={`forum-block-list mb-4 ${listClass} space-y-1 text-gray-700`}>
      {items.map((item: string, index: number) => (
        <li key={index}>{item}</li>
      ))}
    </Tag>
  );
};

/**
 * Code block renderer
 */
const CodeBlock: React.FC<{ block: Block }> = ({ block }) => {
  const content = typeof block.content === 'string'
    ? block.content
    : block.content?.code || '';
  const language = block.attributes?.language || 'text';

  return (
    <pre className="forum-block-code mb-4 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
      <code className={`language-${language}`}>
        {content}
      </code>
    </pre>
  );
};

/**
 * Divider block renderer
 */
const DividerBlock: React.FC = () => (
  <hr className="forum-block-divider my-6 border-t border-gray-300" />
);

/**
 * Unknown block fallback renderer
 */
const UnknownBlock: React.FC<{ block: Block }> = ({ block }) => {
  // In production, render content if available, otherwise skip
  const content = typeof block.content === 'string'
    ? block.content
    : block.content?.text || null;

  if (content) {
    return (
      <div className="forum-block-unknown mb-4 text-gray-700">
        {content}
      </div>
    );
  }

  return null;
};

/**
 * Block type to component mapping
 */
const blockComponents: Record<string, React.FC<{ block: Block }>> = {
  paragraph: ParagraphBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  quote: QuoteBlock,
  blockquote: QuoteBlock,
  list: ListBlock,
  code: CodeBlock,
  'code-block': CodeBlock,
  divider: DividerBlock,
  separator: DividerBlock,
};

/**
 * Render a single block
 */
const renderBlock = (block: Block, index: number): React.ReactNode => {
  const blockType = block.type || 'unknown';
  const Component = blockComponents[blockType] || UnknownBlock;
  const key = block.id || block.clientId || `block-${index}`;

  return <Component key={key} block={block} />;
};

/**
 * Forum Block Renderer Component
 *
 * Renders an array of Block[] content with forum-specific styling.
 * Supports truncation for excerpts and integrates with the platform's
 * block rendering system.
 */
export const ForumBlockRenderer: React.FC<ForumBlockRendererProps> = ({
  content,
  className = '',
  maxBlocks,
  showReadMore = false,
}) => {
  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }

  // Filter out empty/invalid blocks
  const validBlocks = content.filter((block): block is Block =>
    block != null && typeof block === 'object' && !!block.type
  );

  if (validBlocks.length === 0) {
    return null;
  }

  // Apply truncation if maxBlocks is specified
  const displayBlocks = maxBlocks
    ? validBlocks.slice(0, maxBlocks)
    : validBlocks;
  const isTruncated = maxBlocks && validBlocks.length > maxBlocks;

  return (
    <div className={`forum-content ${className}`}>
      {displayBlocks.map((block, index) => renderBlock(block, index))}
      {isTruncated && showReadMore && (
        <p className="text-blue-600 text-sm mt-2">더 보기...</p>
      )}
    </div>
  );
};

export default ForumBlockRenderer;
