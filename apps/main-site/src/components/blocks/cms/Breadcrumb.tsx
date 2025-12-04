/**
 * Breadcrumb Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

export const BreadcrumbBlock = ({ node }: BlockRendererProps) => {
  const { separator = '/', showHome = true } = node.props;

  // TODO: Generate breadcrumb from current page path
  // For now, return mock breadcrumb
  const mockBreadcrumbs = [
    { label: 'Home', url: '/' },
    { label: 'Category', url: '/category' },
    { label: 'Current Page', url: '' },
  ];

  const breadcrumbs = showHome ? mockBreadcrumbs : mockBreadcrumbs.slice(1);

  return (
    <nav className="flex items-center space-x-2 text-sm">
      {breadcrumbs.map((item, i) => (
        <div key={i} className="flex items-center">
          {i > 0 && <span className="mx-2 text-gray-400">{separator}</span>}
          {item.url ? (
            <a href={item.url} className="text-blue-600 hover:underline">
              {item.label}
            </a>
          ) : (
            <span className="text-gray-600">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};
