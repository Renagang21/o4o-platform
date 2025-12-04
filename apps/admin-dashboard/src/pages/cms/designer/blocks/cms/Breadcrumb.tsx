/**
 * CMS Block - Breadcrumb
 *
 * Breadcrumb Navigation - Shows current page hierarchy
 */

export interface BreadcrumbProps {
  separator?: string;
  showHome?: boolean;
  homeLabel?: string;
  textColor?: string;
  linkColor?: string;
}

export default function Breadcrumb({
  separator = '/',
  showHome = true,
  homeLabel = 'Home',
  textColor = '#6b7280',
  linkColor = '#3b82f6',
}: BreadcrumbProps) {
  // Sample breadcrumb path for preview
  const breadcrumbs = [
    { label: homeLabel, href: '/', isHome: true },
    { label: 'Blog', href: '/blog' },
    { label: 'Technology', href: '/blog/technology' },
    { label: 'Current Page', href: '#', isCurrent: true },
  ];

  const displayedBreadcrumbs = showHome ? breadcrumbs : breadcrumbs.slice(1);

  return (
    <nav className="py-4" aria-label="Breadcrumb">
      <div className="mb-2 p-2 bg-gray-100 border border-gray-300 rounded text-xs text-gray-600">
        🧭 Breadcrumb: Dynamic path based on current page
      </div>
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {displayedBreadcrumbs.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && (
              <span style={{ color: textColor }} className="select-none">
                {separator}
              </span>
            )}
            {item.isCurrent ? (
              <span style={{ color: textColor }} className="font-medium" aria-current="page">
                {item.label}
              </span>
            ) : (
              <a
                href={item.href}
                style={{ color: linkColor }}
                className="hover:underline"
              >
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
