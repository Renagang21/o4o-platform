/**
 * CPTList (Custom Post Type List) Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

export const CPTListBlock = ({ node }: BlockRendererProps) => {
  const {
    postType = 'post',
    limit = 10,
    columns = 3,
    orderBy: _orderBy = 'date',
    order: _order = 'desc',
    showExcerpt = true,
    showImage = true,
    showDate = true,
  } = node.props;

  // TODO: Fetch actual posts from CMS API
  // For now, return a placeholder
  return (
    <div className="py-6">
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-blue-700">
          📋 CPT List: {postType} • {limit} items • {columns} columns
        </div>
      </div>
      <div
        className={`grid grid-cols-1 ${
          columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
        } gap-6`}
      >
        {/* Placeholder cards */}
        {[...Array(Math.min(3, limit))].map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
            {showImage && <div className="bg-gray-200 h-48"></div>}
            <div className="p-4">
              <h3 className="font-semibold mb-2">Post Title {i + 1}</h3>
              {showDate && <div className="text-sm text-gray-600 mb-2">Date</div>}
              {showExcerpt && <p className="text-sm text-gray-600">Post excerpt...</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
