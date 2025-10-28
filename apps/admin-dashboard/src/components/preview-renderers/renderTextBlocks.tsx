/**
 * Text Block Renderers
 * Handles paragraph, heading, list, quote, and code blocks
 */

import React from 'react';
import { Block } from '@/types/post.types';

export const renderParagraph = (block: Block) => {
  const { content, attributes } = block;

  // Priority: content (HTML string from Slate serializer) > attributes.content > content.text
  const paragraphHTML = (typeof content === 'string' && content) || attributes?.content || content?.text || '';

  return (
    <p
      key={block.id}
      className="mb-4 text-gray-700 leading-relaxed"
      style={{
        textAlign: attributes?.align || 'left',
        fontSize: attributes?.fontSize || '16px',
        color: attributes?.textColor || '#374151',
      }}
      dangerouslySetInnerHTML={{ __html: paragraphHTML }}
    />
  );
};

export const renderHeading = (block: Block) => {
  const { content, attributes } = block;

  // Priority: content (HTML string from Slate serializer) > attributes.content > content.text
  const headingHTML = (typeof content === 'string' && content) || attributes?.content || content?.text || '';
  const headingLevel = attributes?.level || content?.level || 2;
  const HeadingTag = `h${headingLevel}` as 'h1'|'h2'|'h3'|'h4'|'h5'|'h6';

  const headingClasses = {
    h1: 'text-4xl font-bold mb-6 text-gray-900',
    h2: 'text-3xl font-semibold mb-5 text-gray-800',
    h3: 'text-2xl font-semibold mb-4 text-gray-800',
    h4: 'text-xl font-medium mb-3 text-gray-700',
    h5: 'text-lg font-medium mb-2 text-gray-700',
    h6: 'text-base font-medium mb-2 text-gray-600',
  };

  return (
    <HeadingTag
      key={block.id}
      className={headingClasses[HeadingTag]}
      style={{
        textAlign: attributes?.align || 'left',
        color: attributes?.textColor,
      }}
      dangerouslySetInnerHTML={{ __html: headingHTML }}
    />
  );
};

export const renderList = (block: Block) => {
  const { content, attributes } = block;

  // Priority: attributes.items > content.items > legacy
  const listItems = attributes?.items || content?.items || [];
  const isOrdered = attributes?.ordered || content?.ordered || false;
  const ListTag = isOrdered ? 'ol' : 'ul';

  return (
    <ListTag
      key={block.id}
      className={`mb-4 ${isOrdered ? 'list-decimal' : 'list-disc'} list-inside text-gray-700`}
    >
      {listItems.map((item: string, index: number) => (
        <li key={index} className="mb-1">{item}</li>
      ))}
    </ListTag>
  );
};

export const renderQuote = (block: Block) => {
  const { content, attributes } = block;

  // Extract text from content (handles legacy HTML strings)
  const extractText = (content: any, fallback: string = ''): string => {
    if (typeof content === 'string') {
      return content.replace(/<[^>]*>/g, '').trim() || fallback;
    }
    if (content?.text) return content.text;
    return fallback;
  };

  const blockContent = extractText(content, '');

  return (
    <blockquote
      key={block.id}
      className="border-l-4 border-gray-300 pl-4 py-2 mb-4 italic text-gray-600"
    >
      <p>{blockContent}</p>
      {content?.citation && (
        <cite className="block mt-2 text-sm text-gray-500 not-italic">
          — {content.citation}
        </cite>
      )}
    </blockquote>
  );
};

export const renderCode = (block: Block) => {
  const { content } = block;

  // Extract text from content
  const extractText = (content: any, fallback: string = ''): string => {
    if (typeof content === 'string') {
      return content.replace(/<[^>]*>/g, '').trim() || fallback;
    }
    if (content?.text) return content.text;
    return fallback;
  };

  const blockContent = extractText(content, '');

  return (
    <pre
      key={block.id}
      className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto"
    >
      <code className="text-sm font-mono">{blockContent}</code>
    </pre>
  );
};
