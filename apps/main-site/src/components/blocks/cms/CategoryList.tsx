/**
 * CategoryList Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

export const CategoryListBlock = ({ node }: BlockRendererProps) => {
  const {
    taxonomy: _taxonomy = 'category',
    layout = 'list',
    showCount = true,
    limit: _limit,
  } = node.props;

  // TODO: Fetch actual categories from CMS API using _taxonomy and _limit
  // For now, return a placeholder
  const mockCategories = ['Category 1', 'Category 2', 'Category 3'];

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mockCategories.map((cat, i) => (
          <a
            key={i}
            href="#"
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
          >
            <div className="font-semibold">{cat}</div>
            {showCount && <div className="text-sm text-gray-600">12 posts</div>}
          </a>
        ))}
      </div>
    );
  }

  if (layout === 'pills') {
    return (
      <div className="flex flex-wrap gap-2">
        {mockCategories.map((cat, i) => (
          <a
            key={i}
            href="#"
            className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 hover:bg-blue-100 text-sm font-medium transition-colors"
          >
            {cat}
            {showCount && <span className="ml-2 text-gray-600">(12)</span>}
          </a>
        ))}
      </div>
    );
  }

  // Default list layout
  return (
    <ul className="space-y-2">
      {mockCategories.map((cat, i) => (
        <li key={i}>
          <a href="#" className="flex items-center justify-between hover:text-blue-600 transition-colors">
            <span className="font-medium">{cat}</span>
            {showCount && <span className="text-gray-600">12</span>}
          </a>
        </li>
      ))}
    </ul>
  );
};
