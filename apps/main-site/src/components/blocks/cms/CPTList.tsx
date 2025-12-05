/**
 * CPTList (Custom Post Type List) Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import type { CMSPost } from '@/lib/cms/client';

export const CPTListBlock = ({ node }: BlockRendererProps) => {
  const {
    limit = 10,
    columns = 3,
    showExcerpt = true,
    showImage = true,
    showDate = true,
    data,
  } = node.props;

  // Get posts from injected data
  const posts: CMSPost[] = data?.posts || [];

  if (posts.length === 0) {
    return (
      <div className="py-6">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-600">No posts found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div
        className={`grid grid-cols-1 ${
          columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
        } gap-6`}
      >
        {posts.slice(0, limit).map((post) => (
          <a
            key={post.id}
            href={`/${post.postType}/${post.slug}`}
            className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 transition-colors"
          >
            {showImage && post.featuredImage && (
              <img src={post.featuredImage} alt={post.title} className="w-full h-48 object-cover" />
            )}
            {showImage && !post.featuredImage && <div className="bg-gray-200 h-48"></div>}
            <div className="p-4">
              <h3 className="font-semibold mb-2 line-clamp-2">{post.title}</h3>
              {showDate && post.publishedAt && (
                <div className="text-sm text-gray-600 mb-2">
                  {new Date(post.publishedAt).toLocaleDateString()}
                </div>
              )}
              {showExcerpt && post.excerpt && (
                <p className="text-sm text-gray-600 line-clamp-3">{post.excerpt}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
