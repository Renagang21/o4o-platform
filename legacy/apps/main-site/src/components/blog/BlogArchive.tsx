/**
 * Blog Archive Component
 * Renders blog posts in various layouts (Grid, List, Masonry)
 * Integrates with customizer settings for dynamic styling
 */

import React, { useState, useEffect, useMemo } from 'react';
import { PostItem, BlogSettings } from '@/types/customizer-types';
import PostCard from './PostCard';
import Pagination from './Pagination';
import { Grid, List, Layers } from 'lucide-react';

interface BlogArchiveProps {
  posts: PostItem[];
  settings: BlogSettings['archive'];
  loading?: boolean;
  totalPosts?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSortChange?: (sortBy: string, order: 'asc' | 'desc') => void;
  className?: string;
}

const BlogArchive: React.FC<BlogArchiveProps> = ({
  posts,
  settings,
  loading = false,
  totalPosts = 0,
  currentPage = 1,
  onPageChange,
  onSortChange,
  className = ''
}) => {
  const [selectedLayout, setSelectedLayout] = useState(settings.layout);

  // Update layout when settings change
  useEffect(() => {
    setSelectedLayout(settings.layout);
  }, [settings.layout]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalPosts / settings.pagination.postsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Sort posts based on settings
  const sortedPosts = useMemo(() => {
    if (!posts.length) return [];

    return [...posts].sort((a, b) => {
      let comparison = 0;
      
      switch (settings.sorting.sortBy) {
        case 'date':
          comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'views':
          comparison = (b.viewCount || 0) - (a.viewCount || 0);
          break;
        case 'comments':
          comparison = b.commentCount - a.commentCount;
          break;
        default:
          comparison = 0;
      }

      return settings.sorting.order === 'desc' ? comparison : -comparison;
    });
  }, [posts, settings.sorting]);

  // Handle layout change
  const handleLayoutChange = (layout: 'grid' | 'list' | 'masonry') => {
    setSelectedLayout(layout);
    // You could emit this change to parent component if needed
  };

  // Handle sort change
  const handleSortChange = (sortBy: string) => {
    const newOrder = settings.sorting.sortBy === sortBy && settings.sorting.order === 'desc' ? 'asc' : 'desc';
    onSortChange?.(sortBy, newOrder);
  };

  // Layout-specific styles
  const getLayoutStyles = () => {
    switch (selectedLayout) {
      case 'grid':
        return {
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${settings.layout === 'grid' ? '300px' : '250px'}, 1fr))`,
          gap: `${settings.cardSpacing}px`,
        };
      case 'list':
        return {
          display: 'flex',
          flexDirection: 'column' as const,
          gap: `${settings.cardSpacing}px`,
        };
      case 'masonry':
        return {
          columnCount: 'auto',
          columnWidth: '300px',
          columnGap: `${settings.cardSpacing}px`,
          columnFill: 'balance',
        };
      default:
        return {};
    }
  };

  // Loading skeleton
  const renderLoadingSkeleton = () => {
    const skeletonCount = settings.pagination.postsPerPage;
    return (
      <div className="blog-archive-skeleton" style={getLayoutStyles()}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div key={index} className="post-skeleton" style={{
            backgroundColor: '#f8f9fa',
            borderRadius: `${settings.styling.borderRadius}px`,
            height: selectedLayout === 'list' ? '150px' : '300px',
            marginBottom: selectedLayout === 'masonry' ? `${settings.cardSpacing}px` : 0,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))}
      </div>
    );
  };

  return (
    <div className={`blog-archive blog-archive-${selectedLayout} ${className}`}>
      {/* Archive Header */}
      {settings.showArchiveHeader && (
        <div className="archive-header" style={{
          marginBottom: `${settings.cardSpacing * 2}px`,
          borderBottom: `1px solid ${settings.styling.borderColor}`,
          paddingBottom: `${settings.cardSpacing}px`,
        }}>
          <div className="archive-header-content">
            <div className="archive-info">
              <h1 className="archive-title" style={{
                color: settings.styling.titleColor,
                fontSize: `${settings.styling.typography.titleSize.desktop}px`,
                fontWeight: settings.styling.typography.titleWeight,
                margin: '0 0 8px 0',
              }}>
                Blog Archive
              </h1>
              <p className="archive-description" style={{
                color: settings.styling.excerptColor,
                fontSize: `${settings.styling.typography.excerptSize.desktop}px`,
                margin: 0,
              }}>
                {totalPosts} post{totalPosts !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* Layout Switcher */}
            {settings.showLayoutSwitcher && (
              <div className="layout-switcher">
                <button
                  onClick={() => handleLayoutChange('grid')}
                  className={`layout-btn ${selectedLayout === 'grid' ? 'active' : ''}`}
                  aria-label="Grid layout"
                  title="Grid layout"
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => handleLayoutChange('list')}
                  className={`layout-btn ${selectedLayout === 'list' ? 'active' : ''}`}
                  aria-label="List layout"
                  title="List layout"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => handleLayoutChange('masonry')}
                  className={`layout-btn ${selectedLayout === 'masonry' ? 'active' : ''}`}
                  aria-label="Masonry layout"
                  title="Masonry layout"
                >
                  <Layers size={18} />
                </button>
              </div>
            )}

            {/* Sort Options */}
            {settings.showSortOptions && (
              <div className="sort-options">
                <label htmlFor="sort-select" className="sort-label">Sort by:</label>
                <select
                  id="sort-select"
                  value={settings.sorting.sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="sort-select"
                >
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                  <option value="views">Views</option>
                  <option value="comments">Comments</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Posts Container */}
      {loading ? (
        renderLoadingSkeleton()
      ) : (
        <div className="posts-container" style={getLayoutStyles()}>
          {sortedPosts.map((post) => (
            <div
              key={post.id}
              className="post-item"
              style={{
                marginBottom: selectedLayout === 'masonry' ? `${settings.cardSpacing}px` : 0,
                breakInside: selectedLayout === 'masonry' ? 'avoid' : 'auto',
              }}
            >
              <PostCard
                post={post}
                settings={settings}
                layout={selectedLayout}
              />
            </div>
          ))}
        </div>
      )}

      {/* No Posts Message */}
      {!loading && sortedPosts.length === 0 && (
        <div className="no-posts" style={{
          textAlign: 'center',
          padding: `${settings.cardSpacing * 3}px`,
          color: settings.styling.excerptColor,
        }}>
          <p>No posts found.</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && sortedPosts.length > 0 && settings.pagination.enabled && (
        <div className="archive-pagination" style={{
          marginTop: `${settings.cardSpacing * 2}px`,
        }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            settings={settings.pagination}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
          />
        </div>
      )}

      {/* Archive Styles */}
      <style>{`
        .blog-archive {
          width: 100%;
        }

        .archive-header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
        }

        .layout-switcher {
          display: flex;
          gap: 4px;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          padding: 2px;
          background: #ffffff;
        }

        .layout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 8px;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #6c757d;
        }

        .layout-btn:hover {
          background: #f8f9fa;
          color: #495057;
        }

        .layout-btn.active {
          background: #0073e6;
          color: white;
        }

        .sort-options {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sort-label {
          font-size: 14px;
          color: #6c757d;
          font-weight: 500;
        }

        .sort-select {
          padding: 6px 12px;
          border: 1px solid #e1e5e9;
          border-radius: 4px;
          background: white;
          font-size: 14px;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .sort-select:focus {
          outline: none;
          border-color: #0073e6;
          box-shadow: 0 0 0 2px rgba(0, 115, 230, 0.1);
        }

        /* Masonry specific styles */
        .blog-archive-masonry .posts-container {
          column-gap: ${settings.cardSpacing}px;
        }

        /* Loading animation */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        /* Responsive design */
        @media (max-width: 1024px) {
          .archive-header-content {
            flex-direction: column;
            align-items: stretch;
          }
          
          .layout-switcher,
          .sort-options {
            align-self: flex-start;
          }

          .blog-archive-grid .posts-container {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          }

          .blog-archive-masonry .posts-container {
            column-count: 2;
            column-width: auto;
          }
        }

        @media (max-width: 768px) {
          .archive-header-content {
            gap: 12px;
          }

          .layout-switcher {
            width: 100%;
            justify-content: center;
          }

          .sort-options {
            width: 100%;
            justify-content: space-between;
          }

          .blog-archive-grid .posts-container {
            grid-template-columns: 1fr;
          }

          .blog-archive-masonry .posts-container {
            column-count: 1;
          }

          .archive-title {
            font-size: ${settings.styling.typography.titleSize.mobile}px !important;
          }

          .archive-description {
            font-size: ${settings.styling.typography.excerptSize.mobile}px !important;
          }
        }

        @media (max-width: 480px) {
          .layout-switcher {
            padding: 1px;
          }

          .layout-btn {
            padding: 8px 12px;
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default BlogArchive;