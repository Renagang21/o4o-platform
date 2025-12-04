/**
 * RecentPosts Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

export const RecentPostsBlock = ({ node }: BlockRendererProps) => {
  const {
    limit = 5,
    showThumbnail = true,
    showDate = true,
    postType: _postType = 'post',
  } = node.props;

  // TODO: Fetch actual recent posts from CMS API using _postType
  // For now, return mock data
  const mockPosts = [
    { title: 'Recent Post 1', date: '2025-12-01', thumbnail: '' },
    { title: 'Recent Post 2', date: '2025-12-02', thumbnail: '' },
    { title: 'Recent Post 3', date: '2025-12-03', thumbnail: '' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>
      {mockPosts.slice(0, limit).map((post, i) => (
        <a key={i} href="#" className="flex gap-3 hover:bg-gray-50 p-2 rounded transition-colors">
          {showThumbnail && <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0"></div>}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm line-clamp-2">{post.title}</div>
            {showDate && <div className="text-xs text-gray-600 mt-1">{post.date}</div>}
          </div>
        </a>
      ))}
    </div>
  );
};
