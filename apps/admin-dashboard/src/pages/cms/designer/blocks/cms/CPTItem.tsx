/**
 * CMS Block - CPTItem
 *
 * Single Custom Post Type Item - Displays a single post
 */

export interface CPTItemProps {
  postType: string;
  postId?: string;
  layout?: 'card' | 'full' | 'minimal';
  showImage?: boolean;
  showDate?: boolean;
  showAuthor?: boolean;
  showExcerpt?: boolean;
  showCategories?: boolean;
}

export default function CPTItem({
  postType = 'post',
  postId,
  layout = 'card',
  showImage = true,
  showDate = true,
  showAuthor = false,
  showExcerpt = true,
  showCategories = false,
}: CPTItemProps) {
  // Designer preview
  if (layout === 'minimal') {
    return (
      <div className="py-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Sample Post Title
        </h3>
        {showDate && <div className="text-sm text-gray-500">January 1, 2024</div>}
      </div>
    );
  }

  if (layout === 'full') {
    return (
      <article className="py-6">
        {showImage && (
          <div className="w-full h-64 bg-gray-200 rounded-lg mb-6 flex items-center justify-center text-gray-400">
            Featured Image
          </div>
        )}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          📄 CPT Item: {postType} {postId ? `(ID: ${postId})` : '(Current Post)'}
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Sample Post Title</h1>
        {(showDate || showAuthor || showCategories) && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
            {showDate && <span>January 1, 2024</span>}
            {showAuthor && <span>By John Doe</span>}
            {showCategories && <span>Category 1, Category 2</span>}
          </div>
        )}
        {showExcerpt && (
          <div className="text-lg text-gray-700 mb-6">
            This is a sample excerpt from the post. The actual content will be loaded dynamically.
          </div>
        )}
        <div className="prose max-w-none">
          <p>Post content will appear here...</p>
        </div>
      </article>
    );
  }

  // Default: card layout
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {showImage && (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
          Featured Image
        </div>
      )}
      <div className="p-6">
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          📄 CPT Item: {postType} {postId ? `(ID: ${postId})` : '(Current)'}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sample Post Title</h2>
        {(showDate || showAuthor) && (
          <div className="flex gap-4 text-sm text-gray-600 mb-4">
            {showDate && <span>January 1, 2024</span>}
            {showAuthor && <span>By John Doe</span>}
          </div>
        )}
        {showCategories && (
          <div className="flex gap-2 mb-4">
            <span className="px-2 py-1 bg-gray-100 text-xs rounded">Category 1</span>
            <span className="px-2 py-1 bg-gray-100 text-xs rounded">Category 2</span>
          </div>
        )}
        {showExcerpt && (
          <p className="text-gray-700">
            This is a sample excerpt from the post...
          </p>
        )}
      </div>
    </div>
  );
}
