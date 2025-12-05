/**
 * RecentPosts Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import type { CMSPost } from '@/lib/cms/client';

export const RecentPostsBlock = ({ node }: BlockRendererProps) => {
  const {
    limit = 5,
    showThumbnail = true,
    showDate = true,
    data,
  } = node.props;

  // Get posts from injected data
  const posts: CMSPost[] = data?.posts || [];

  if (posts.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-600">No recent posts</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>
      {posts.slice(0, limit).map((post) => (
        <a
          key={post.id}
          href={`/${post.postType}/${post.slug}`}
          className="flex gap-3 hover:bg-gray-50 p-2 rounded transition-colors"
        >
          {showThumbnail && post.featuredImage && (
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-16 h-16 rounded flex-shrink-0 object-cover"
            />
          )}
          {showThumbnail && !post.featuredImage && (
            <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0"></div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm line-clamp-2">{post.title}</div>
            {showDate && post.publishedAt && (
              <div className="text-xs text-gray-600 mt-1">
                {new Date(post.publishedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </a>
      ))}
    </div>
  );
};
