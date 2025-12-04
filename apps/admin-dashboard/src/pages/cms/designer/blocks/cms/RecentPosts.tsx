/**
 * CMS Block - RecentPosts
 *
 * Recent Posts - Displays list of recent posts
 */

export interface RecentPostsProps {
  postType?: string;
  limit?: number;
  layout?: 'list' | 'compact';
  showImage?: boolean;
  showDate?: boolean;
  showExcerpt?: boolean;
}

export default function RecentPosts({
  postType = 'post',
  limit = 5,
  layout = 'list',
  showImage = true,
  showDate = true,
  showExcerpt = false,
}: RecentPostsProps) {
  const posts = [
    { title: 'Getting Started with React', date: 'Jan 15, 2024' },
    { title: 'Advanced TypeScript Patterns', date: 'Jan 12, 2024' },
    { title: 'Building REST APIs with Node.js', date: 'Jan 10, 2024' },
    { title: 'CSS Grid vs Flexbox', date: 'Jan 8, 2024' },
    { title: 'Modern Web Development', date: 'Jan 5, 2024' },
  ];

  if (layout === 'compact') {
    return (
      <div className="py-4">
        <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
          📰 Recent Posts: {postType} • {limit} items
        </div>
        <ul className="space-y-2">
          {posts.slice(0, limit).map((post, i) => (
            <li key={i} className="text-sm">
              <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                {post.title}
              </a>
              {showDate && <span className="text-gray-500 ml-2">• {post.date}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Default: list layout
  return (
    <div className="py-4">
      <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
        📰 Recent Posts: {postType} • {limit} items
      </div>
      <div className="space-y-4">
        {posts.slice(0, limit).map((post, i) => (
          <div key={i} className="flex gap-4">
            {showImage && (
              <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">
                IMG
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                <a href="#" className="hover:text-blue-600">
                  {post.title}
                </a>
              </h4>
              {showDate && <div className="text-sm text-gray-500 mb-1">{post.date}</div>}
              {showExcerpt && (
                <p className="text-sm text-gray-600">
                  Sample excerpt from the post...
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
