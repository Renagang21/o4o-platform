/**
 * RelatedPosts Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import type { CMSPost } from '@/lib/cms/client';

export const RelatedPostsBlock = ({ node }: BlockRendererProps) => {
  const {
    limit = 3,
    layout = 'grid',
    showExcerpt = true,
    showImage = true,
    data,
  } = node.props;

  // Get posts from injected data
  const posts: CMSPost[] = data?.posts || [];

  if (posts.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Related Posts</h3>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-600">No related posts found</div>
        </div>
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">Related Posts</h3>
        {posts.slice(0, limit).map((post) => (
          <a
            key={post.id}
            href={`/${post.postType}/${post.slug}`}
            className="flex gap-4 hover:bg-gray-50 p-3 rounded transition-colors"
          >
            {showImage && post.featuredImage && (
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-24 h-24 rounded flex-shrink-0 object-cover"
              />
            )}
            {showImage && !post.featuredImage && (
              <div className="w-24 h-24 bg-gray-200 rounded flex-shrink-0"></div>
            )}
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{post.title}</h4>
              {showExcerpt && post.excerpt && (
                <p className="text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
              )}
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
        {posts.slice(0, limit).map((post) => (
          <a
            key={post.id}
            href={`/${post.postType}/${post.slug}`}
            className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 transition-colors"
          >
            {showImage && post.featuredImage && (
              <img src={post.featuredImage} alt={post.title} className="w-full h-40 object-cover" />
            )}
            {showImage && !post.featuredImage && <div className="bg-gray-200 h-40"></div>}
            <div className="p-4">
              <h4 className="font-semibold mb-2">{post.title}</h4>
              {showExcerpt && post.excerpt && (
                <p className="text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
