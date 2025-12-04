/**
 * CMS Block - RelatedPosts
 *
 * Related Posts - Displays posts related to current post
 */

export interface RelatedPostsProps {
  postType?: string;
  limit?: number;
  relatedBy?: 'category' | 'tag' | 'author';
  layout?: 'grid' | 'list';
  showImage?: boolean;
  showDate?: boolean;
}

const columnClasses = {
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  list: 'space-y-4',
};

export default function RelatedPosts({
  postType = 'post',
  limit = 3,
  relatedBy = 'category',
  layout = 'grid',
  showImage = true,
  showDate = false,
}: RelatedPostsProps) {
  const posts = [
    { title: 'Similar Article Title 1' },
    { title: 'Similar Article Title 2' },
    { title: 'Similar Article Title 3' },
  ];

  return (
    <div className="py-6">
      {/* Header Info */}
      <div className="mb-4 p-2 bg-indigo-50 border border-indigo-200 rounded text-sm text-indigo-700">
        🔗 Related Posts: {postType} • By {relatedBy} • {limit} items
      </div>

      <h3 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h3>

      <div className={columnClasses[layout]}>
        {posts.slice(0, limit).map((post, i) => (
          <div key={i} className={layout === 'list' ? 'flex gap-4' : ''}>
            {showImage && (
              <div
                className={`bg-gray-200 flex items-center justify-center text-gray-400 ${
                  layout === 'list' ? 'w-24 h-24 flex-shrink-0' : 'w-full h-48'
                } rounded`}
              >
                IMG
              </div>
            )}
            <div className={layout === 'grid' ? 'mt-3' : 'flex-1'}>
              <h4 className="font-semibold text-gray-900 hover:text-blue-600">
                <a href="#">{post.title}</a>
              </h4>
              {showDate && <div className="text-sm text-gray-500 mt-1">January 1, 2024</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
