/**
 * CMS Block - CPTList
 *
 * Custom Post Type List - Displays list of posts from a CPT
 */

import { ReactNode } from 'react';

export interface CPTListProps {
  postType: string;
  limit?: number;
  columns?: 1 | 2 | 3 | 4;
  orderBy?: 'date' | 'title' | 'random';
  order?: 'asc' | 'desc';
  showExcerpt?: boolean;
  showImage?: boolean;
  showDate?: boolean;
  children?: ReactNode;
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

export default function CPTList({
  postType = 'post',
  limit = 10,
  columns = 3,
  orderBy = 'date',
  order = 'desc',
  showExcerpt = true,
  showImage = true,
  showDate = true,
  children,
}: CPTListProps) {
  // Designer preview - shows placeholder
  return (
    <div className="py-6">
      {/* Header Info */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-700">
          <span className="text-xl">📋</span>
          <div>
            <div className="font-semibold">CPT List: {postType || '(not set)'}</div>
            <div className="text-sm">
              {limit} items • {columns} columns • Sort by {orderBy} ({order})
            </div>
          </div>
        </div>
      </div>

      {/* Preview Grid */}
      <div className={`grid ${columnClasses[columns]} gap-6`}>
        {children || (
          <>
            {Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                {showImage && (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                    Image
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">Post Title {i + 1}</h3>
                  {showDate && (
                    <div className="text-sm text-gray-500 mb-2">January 1, 2024</div>
                  )}
                  {showExcerpt && (
                    <p className="text-gray-600 text-sm">
                      This is a preview excerpt from the post...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
