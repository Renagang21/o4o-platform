/**
 * CategoryList Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import type { CMSCategory } from '@/lib/cms/client';

export const CategoryListBlock = ({ node }: BlockRendererProps) => {
  const {
    layout = 'list',
    showCount = true,
    data,
  } = node.props;

  // Get categories from injected data
  const categories: CMSCategory[] = data?.categories || [];

  if (categories.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-sm text-gray-600">No categories found</div>
      </div>
    );
  }

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <a
            key={cat.id}
            href={`/category/${cat.slug}`}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
          >
            <div className="font-semibold">{cat.name}</div>
            {showCount && <div className="text-sm text-gray-600">{cat.count} posts</div>}
          </a>
        ))}
      </div>
    );
  }

  if (layout === 'pills') {
    return (
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <a
            key={cat.id}
            href={`/category/${cat.slug}`}
            className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 hover:bg-blue-100 text-sm font-medium transition-colors"
          >
            {cat.name}
            {showCount && <span className="ml-2 text-gray-600">({cat.count})</span>}
          </a>
        ))}
      </div>
    );
  }

  // Default list layout
  return (
    <ul className="space-y-2">
      {categories.map((cat) => (
        <li key={cat.id}>
          <a
            href={`/category/${cat.slug}`}
            className="flex items-center justify-between hover:text-blue-600 transition-colors"
          >
            <span className="font-medium">{cat.name}</span>
            {showCount && <span className="text-gray-600">{cat.count}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
};
