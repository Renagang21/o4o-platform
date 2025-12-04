/**
 * RelatedPosts Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

export const RelatedPostsBlock = ({ node }: BlockRendererProps) => {
  const {
    limit = 3,
    relationType: _relationType = 'category',
    layout = 'grid',
    showExcerpt = true,
    showImage = true,
  } = node.props;

  // TODO: Fetch actual related posts based on _relationType (category/tag/author)
  // For now, return mock data
  const mockPosts = [
    { title: 'Related Post 1', excerpt: 'Excerpt 1...', image: '' },
    { title: 'Related Post 2', excerpt: 'Excerpt 2...', image: '' },
    { title: 'Related Post 3', excerpt: 'Excerpt 3...', image: '' },
  ];

  if (layout === 'list') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">Related Posts</h3>
        {mockPosts.slice(0, limit).map((post, i) => (
          <a key={i} href="#" className="flex gap-4 hover:bg-gray-50 p-3 rounded transition-colors">
            {showImage && <div className="w-24 h-24 bg-gray-200 rounded flex-shrink-0"></div>}
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{post.title}</h4>
              {showExcerpt && <p className="text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>}
            </div>
          </a>
        ))}
      </div>
    );
  }

  // Default grid layout
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Related Posts</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockPosts.slice(0, limit).map((post, i) => (
          <a key={i} href="#" className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 transition-colors">
            {showImage && <div className="bg-gray-200 h-40"></div>}
            <div className="p-4">
              <h4 className="font-semibold mb-2">{post.title}</h4>
              {showExcerpt && <p className="text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
