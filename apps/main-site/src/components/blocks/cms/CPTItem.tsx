/**
 * CPTItem (Single Post Display) Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

export const CPTItemBlock = ({ node }: BlockRendererProps) => {
  const {
    postId: _postId,
    layout = 'card',
    showImage = true,
    showDate = true,
    showAuthor = true,
    showExcerpt = true,
  } = node.props;

  // TODO: Fetch actual post from CMS API using _postId
  // For now, return a placeholder
  if (layout === 'full') {
    return (
      <article className="max-w-4xl mx-auto">
        {showImage && <div className="bg-gray-200 h-96 rounded-lg mb-6"></div>}
        <h1 className="text-4xl font-bold mb-4">Post Title</h1>
        <div className="flex gap-4 text-sm text-gray-600 mb-6">
          {showDate && <span>Date</span>}
          {showAuthor && <span>Author</span>}
        </div>
        <div className="prose prose-lg">Post content...</div>
      </article>
    );
  }

  if (layout === 'minimal') {
    return (
      <div className="py-4 border-b border-gray-200">
        <h3 className="font-semibold mb-2">Post Title</h3>
        {showExcerpt && <p className="text-sm text-gray-600">Excerpt...</p>}
      </div>
    );
  }

  // Default card layout
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {showImage && <div className="bg-gray-200 h-48"></div>}
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">Post Title</h2>
        <div className="flex gap-4 text-sm text-gray-600 mb-4">
          {showDate && <span>Date</span>}
          {showAuthor && <span>Author</span>}
        </div>
        {showExcerpt && <p className="text-gray-600">Post excerpt...</p>}
      </div>
    </div>
  );
};
