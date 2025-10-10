/**
 * Breadcrumbs Component
 * Displays navigation breadcrumb trail
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BreadcrumbsSettings, BreadcrumbItem } from '@/types/customizer-types';
import { Home, ChevronRight } from 'lucide-react';

interface BreadcrumbsProps {
  settings?: BreadcrumbsSettings;
  items?: BreadcrumbItem[];
  className?: string;
}

// Default breadcrumbs settings
const defaultSettings: BreadcrumbsSettings = {
  enabled: true,
  position: 'above-content',
  homeText: 'Home',
  separator: '>',
  showCurrentPage: true,
  showOnHomepage: false,
  linkColor: '#0073e6',
  currentPageColor: '#333333',
  separatorColor: '#999999',
  hoverColor: '#005bb5',
  fontSize: { desktop: 14, tablet: 13, mobile: 12 },
  fontWeight: 400,
  textTransform: 'none',
  itemSpacing: 8,
  marginTop: 0,
  marginBottom: 16,
  maxLength: 30,
  showIcons: false,
  mobileHidden: false
};

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  settings: propSettings,
  items = [],
  className = ''
}) => {
  const location = useLocation();
  const settings = { ...defaultSettings, ...propSettings };

  // Don't render if disabled
  if (!settings.enabled) {
    return null;
  }

  // Don't render on homepage if disabled
  if (location.pathname === '/' && !settings.showOnHomepage) {
    return null;
  }

  // Generate breadcrumb items if not provided
  const breadcrumbItems = items.length > 0 ? items : generateBreadcrumbItems(location.pathname, settings);

  // Don't render if no items
  if (breadcrumbItems.length === 0) {
    return null;
  }

  // Truncate text if needed
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Render separator
  const renderSeparator = () => {
    if (settings.separator === '→') {
      return <ChevronRight size={14} style={{ color: settings.separatorColor }} />;
    }
    return (
      <span
        className="breadcrumb-separator"
        style={{ color: settings.separatorColor }}
      >
        {settings.separator}
      </span>
    );
  };

  return (
    <>
      <nav
        className={`breadcrumbs ${className}`}
        aria-label="Breadcrumb navigation"
        style={{
          marginTop: `${settings.marginTop}px`,
          marginBottom: `${settings.marginBottom}px`,
          fontSize: `${settings.fontSize.desktop}px`,
          fontWeight: settings.fontWeight,
          textTransform: settings.textTransform
        }}
      >
        <ol className="breadcrumb-list">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            const isActive = item.isActive || isLast;
            const showItem = !isLast || settings.showCurrentPage;

            if (!showItem) return null;

            return (
              <li key={index} className="breadcrumb-item">
                {/* Breadcrumb Link/Text */}
                {!isActive && item.url ? (
                  <Link
                    to={item.url}
                    className="breadcrumb-link"
                    style={{ color: settings.linkColor }}
                  >
                    {settings.showIcons && item.icon && (
                      <span className="breadcrumb-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
                    )}
                    {settings.showIcons && index === 0 && !item.icon && (
                      <Home size={14} className="breadcrumb-home-icon" />
                    )}
                    <span className="breadcrumb-text">
                      {settings.maxLength ? truncateText(item.label, settings.maxLength) : item.label}
                    </span>
                  </Link>
                ) : (
                  <span
                    className="breadcrumb-current"
                    style={{ color: settings.currentPageColor }}
                    aria-current="page"
                  >
                    {settings.showIcons && item.icon && (
                      <span className="breadcrumb-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
                    )}
                    {settings.showIcons && index === 0 && !item.icon && (
                      <Home size={14} className="breadcrumb-home-icon" />
                    )}
                    <span className="breadcrumb-text">
                      {settings.maxLength ? truncateText(item.label, settings.maxLength) : item.label}
                    </span>
                  </span>
                )}

                {/* Separator */}
                {!isLast && (
                  <span
                    className="breadcrumb-separator-wrapper"
                    style={{ margin: `0 ${settings.itemSpacing}px` }}
                  >
                    {renderSeparator()}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbItems
              .filter(item => item.url)
              .map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": item.label,
                "item": item.url ? `${window.location.origin}${item.url}` : undefined
              }))
          })
        }}
      />

      {/* Inline Styles */}
      <style>{`
        .breadcrumbs {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          line-height: 1.5;
        }

        .breadcrumb-list {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          list-style: none;
          margin: 0;
          padding: 0;
          gap: 0;
        }

        .breadcrumb-item {
          display: flex;
          align-items: center;
        }

        .breadcrumb-link {
          display: flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          transition: color 0.2s ease;
          cursor: pointer;
        }

        .breadcrumb-link:hover {
          color: ${settings.hoverColor} !important;
        }

        .breadcrumb-current {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .breadcrumb-separator-wrapper {
          display: flex;
          align-items: center;
          user-select: none;
        }

        .breadcrumb-separator {
          font-size: 0.9em;
        }

        .breadcrumb-home-icon {
          flex-shrink: 0;
        }

        .breadcrumb-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .breadcrumb-text {
          white-space: nowrap;
        }

        /* Responsive styles */
        @media (max-width: 1024px) {
          .breadcrumbs {
            font-size: ${settings.fontSize.tablet}px;
          }
        }

        @media (max-width: 768px) {
          .breadcrumbs {
            font-size: ${settings.fontSize.mobile}px;
            ${settings.mobileHidden ? 'display: none;' : ''}
          }

          .breadcrumb-text {
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .breadcrumb-link {
            text-decoration: underline;
          }
        }

        /* Focus styles for accessibility */
        .breadcrumb-link:focus-visible {
          outline: 2px solid ${settings.linkColor};
          outline-offset: 2px;
          border-radius: 2px;
        }
      `}</style>
    </>
  );
};

// Generate breadcrumb items from URL path
function generateBreadcrumbItems(pathname: string, settings: BreadcrumbsSettings): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];
  
  // Always start with home
  items.push({
    label: settings.homeText,
    url: '/',
    isActive: pathname === '/'
  });

  // If we're on the homepage, return just home
  if (pathname === '/') {
    return items;
  }

  // Split path and build breadcrumbs
  const pathSegments = pathname.split('/').filter(segment => segment);
  let currentPath = '';

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    // Convert segment to readable label
    const label = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    items.push({
      label,
      url: isLast ? undefined : currentPath, // Don't link the current page
      isActive: isLast
    });
  });

  return items;
}

export default Breadcrumbs;