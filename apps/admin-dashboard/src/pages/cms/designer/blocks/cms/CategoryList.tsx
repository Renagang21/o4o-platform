/**
 * CMS Block - CategoryList
 *
 * Category List - Displays list of categories/taxonomies
 */

export interface CategoryListProps {
  taxonomy?: string;
  layout?: 'list' | 'grid' | 'pills';
  showCount?: boolean;
  orderBy?: 'name' | 'count';
  order?: 'asc' | 'desc';
  limit?: number;
}

export default function CategoryList({
  taxonomy = 'category',
  layout = 'list',
  showCount = true,
  orderBy = 'name',
  order = 'asc',
  limit = 20,
}: CategoryListProps) {
  const categories = [
    { name: 'Technology', count: 12 },
    { name: 'Business', count: 8 },
    { name: 'Design', count: 15 },
    { name: 'Marketing', count: 6 },
  ];

  // Designer preview
  if (layout === 'pills') {
    return (
      <div className="py-4">
        <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded text-sm text-purple-700">
          🏷️ Category List: {taxonomy} • {limit} items • Sort by {orderBy} ({order})
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, Math.min(categories.length, limit)).map((cat, i) => (
            <a
              key={i}
              href="#"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
            >
              {cat.name}
              {showCount && <span className="ml-2 text-gray-500">({cat.count})</span>}
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'grid') {
    return (
      <div className="py-4">
        <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded text-sm text-purple-700">
          🏷️ Category List: {taxonomy} • {limit} items • Sort by {orderBy} ({order})
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.slice(0, Math.min(categories.length, limit)).map((cat, i) => (
            <a
              key={i}
              href="#"
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-center"
            >
              <div className="font-semibold text-gray-900">{cat.name}</div>
              {showCount && <div className="text-sm text-gray-500 mt-1">{cat.count} posts</div>}
            </a>
          ))}
        </div>
      </div>
    );
  }

  // Default: list layout
  return (
    <div className="py-4">
      <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded text-sm text-purple-700">
        🏷️ Category List: {taxonomy} • {limit} items • Sort by {orderBy} ({order})
      </div>
      <ul className="space-y-2">
        {categories.slice(0, Math.min(categories.length, limit)).map((cat, i) => (
          <li key={i}>
            <a
              href="#"
              className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded transition-colors"
            >
              <span className="text-gray-900">{cat.name}</span>
              {showCount && <span className="text-sm text-gray-500">({cat.count})</span>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
