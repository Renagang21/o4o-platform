/**
 * Breadcrumb Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

export const BreadcrumbBlock = ({ node }: BlockRendererProps) => {
  const { separator = '/', showHome = true, data } = node.props;

  // Get breadcrumbs from injected data
  const breadcrumbs: Array<{ label: string; url: string }> = data?.breadcrumbs || [];

  if (breadcrumbs.length === 0) {
    return null;
  }

  const filteredBreadcrumbs = showHome ? breadcrumbs : breadcrumbs.slice(1);

  return (
    <nav className="flex items-center space-x-2 text-sm py-4">
      {filteredBreadcrumbs.map((item, i) => (
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
