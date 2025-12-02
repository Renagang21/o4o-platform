/**
 * Post Card Component
 * Displays individual blog post in various layouts
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { PostItem, BlogSettings, CardStyleType, ImageRatioType } from '@/types/customizer-types';
import { Calendar, User, MessageCircle, Eye, Clock, Folder, Tag } from 'lucide-react';

interface PostCardProps {
  post: PostItem;
  settings: BlogSettings['archive'];
  layout: 'grid' | 'list' | 'masonry';
  className?: string;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  settings,
  layout,
  className = ''
}) => {
  // Generate excerpt if not provided
  const getExcerpt = () => {
    if (settings.content.excerptSource === 'manual' && post.excerpt) {
      return post.excerpt;
    }
    
    if (settings.content.excerptSource === 'content' && post.content) {
      // Strip HTML and limit words
      const plainText = post.content.replace(/<[^>]*>/g, '');
      const words = plainText.split(' ').slice(0, settings.content.excerptLength);
      return words.join(' ') + (words.length >= settings.content.excerptLength ? '...' : '');
    }
    
    // Auto-generated excerpt
    const title = post.title || '';
    return title.length > settings.content.excerptLength 
      ? title.substring(0, settings.content.excerptLength) + '...'
      : title;
  };

  // Get image aspect ratio
  const getImageRatio = () => {
    const { ratio, customRatio } = settings.featuredImage;
    switch (ratio) {
      case '16:9':
        return { paddingBottom: '56.25%' }; // 9/16 * 100
      case '4:3':
        return { paddingBottom: '75%' }; // 3/4 * 100
      case '1:1':
        return { paddingBottom: '100%' };
      case 'custom':
        return { paddingBottom: `${(customRatio.height / customRatio.width) * 100}%` };
      default:
        return { paddingBottom: '56.25%' };
    }
  };

  // Render meta items
  const renderMetaItems = () => {
    return settings.meta.items
      .filter(item => item.enabled)
      .sort((a, b) => a.order - b.order)
      .map(item => {
        let content = null;
        let icon = null;

        switch (item.id) {
          case 'author':
            icon = <User size={14} />;
            content = (
              <Link 
                to={post.author.url || '#'} 
                className="meta-link"
                style={{ color: settings.meta.colors.links }}
              >
                {post.author.name}
              </Link>
            );
            break;
          case 'date':
            icon = <Calendar size={14} />;
            content = new Date(post.date).toLocaleDateString();
            break;
          case 'category':
            icon = <Folder size={14} />;
            content = post.categories.length > 0 ? (
              <Link 
                to={post.categories[0].url} 
                className="meta-link"
                style={{ color: settings.meta.colors.links }}
              >
                {post.categories[0].name}
              </Link>
            ) : null;
            break;
          case 'comments':
            icon = <MessageCircle size={14} />;
            content = `${post.commentCount} comment${post.commentCount !== 1 ? 's' : ''}`;
            break;
          case 'views':
            icon = <Eye size={14} />;
            content = post.viewCount ? `${post.viewCount} views` : null;
            break;
          case 'readTime':
            icon = <Clock size={14} />;
            content = post.readTime ? `${post.readTime} min read` : null;
            break;
          case 'tags':
            icon = <Tag size={14} />;
            content = post.tags.length > 0 ? post.tags[0].name : null;
            break;
          default:
            return null;
        }

        if (!content) return null;

        return (
          <span key={item.id} className="meta-item">
            {settings.meta.showIcons && icon && (
              <span className="meta-icon" style={{ color: settings.meta.colors.icons }}>
                {icon}
              </span>
            )}
            <span 
              className="meta-text"
              style={{ color: settings.meta.colors.text }}
            >
              {content}
            </span>
          </span>
        );
      });
  };

  // Card wrapper classes and styles
  const cardClasses = `post-card post-card-${layout} card-style-${settings.cardStyle} ${className}`;
  
  const cardStyles: React.CSSProperties = {
    backgroundColor: settings.styling.backgroundColor,
    borderColor: settings.styling.borderColor,
    borderRadius: `${settings.styling.borderRadius}px`,
    padding: `${settings.styling.cardPadding}px`,
    marginBottom: layout === 'list' ? `${settings.cardSpacing}px` : 0,
  };

  const imageStyles = layout === 'list' && settings.featuredImage.position === 'left' 
    ? { width: '200px', flexShrink: 0 }
    : {};

  return (
    <article className={cardClasses} style={cardStyles}>
      {/* Featured Image */}
      {settings.featuredImage.enabled && post.featuredImage && (
        <div 
          className={`post-image post-image-${settings.featuredImage.position}`}
          style={imageStyles}
        >
          <div className="image-wrapper" style={getImageRatio()}>
            <Link to={post.url} className="image-link">
              <img 
                src={post.featuredImage.url}
                alt={post.featuredImage.alt || post.title}
                className="featured-image"
                loading="lazy"
              />
              {settings.featuredImage.hoverEffect === 'overlay' && (
                <div className="image-overlay" />
              )}
            </Link>
          </div>
        </div>
      )}

      {/* Post Content */}
      <div className="post-content">
        {/* Meta - Before Title */}
        {settings.meta.position === 'before-title' && (
          <div className="post-meta post-meta-before">
            {renderMetaItems()}
          </div>
        )}

        {/* Post Title */}
        {settings.content.showTitle && (
          <h2 className="post-title">
            <Link 
              to={post.url}
              style={{ 
                color: settings.styling.titleColor,
                fontSize: `${settings.styling.typography.titleSize.desktop}px`,
                fontWeight: settings.styling.typography.titleWeight
              }}
            >
              {post.title}
            </Link>
          </h2>
        )}

        {/* Meta - After Title */}
        {settings.meta.position === 'after-title' && (
          <div className="post-meta post-meta-after">
            {renderMetaItems()}
          </div>
        )}

        {/* Post Excerpt */}
        {settings.content.showExcerpt && (
          <div 
            className="post-excerpt"
            style={{ 
              color: settings.styling.excerptColor,
              fontSize: `${settings.styling.typography.excerptSize.desktop}px`
            }}
          >
            <p>{getExcerpt()}</p>
          </div>
        )}

        {/* Read More Button */}
        {settings.content.showReadMoreButton && (
          <div className="post-actions">
            <Link to={post.url} className="read-more-btn btn">
              {settings.content.readMoreText}
            </Link>
          </div>
        )}

        {/* Meta - Bottom */}
        {settings.meta.position === 'bottom' && (
          <div className="post-meta post-meta-bottom">
            {renderMetaItems()}
          </div>
        )}
      </div>

      {/* Inline Styles */}
      <style>{`
        .post-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s ease;
          height: fit-content;
        }

        .post-card-list {
          flex-direction: row;
          align-items: flex-start;
        }

        .post-card-list .post-content {
          flex: 1;
          margin-left: ${settings.featuredImage.position === 'left' ? '16px' : '0'};
          margin-right: ${settings.featuredImage.position === 'right' ? '16px' : '0'};
        }

        .card-style-boxed {
          border: 1px solid;
        }

        .card-style-shadow {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .card-style-shadow:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .card-style-flat {
          border: none;
          box-shadow: none;
        }

        .post-image {
          position: relative;
          overflow: hidden;
          border-radius: inherit;
        }

        .image-wrapper {
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .featured-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .post-card:hover .featured-image {
          ${settings.featuredImage.hoverEffect === 'zoom' ? 'transform: scale(1.05);' : ''}
          ${settings.featuredImage.hoverEffect === 'fade' ? 'opacity: 0.8;' : ''}
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .post-card:hover .image-overlay {
          opacity: 1;
        }

        .post-content {
          padding: ${settings.featuredImage.enabled ? '16px 0 0 0' : '0'};
        }

        .post-card-list .post-content {
          padding: 0;
        }

        .post-title {
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .post-title a {
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .post-title a:hover {
          color: ${settings.styling.titleHoverColor} !important;
        }

        .post-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin: 8px 0;
          font-size: ${settings.styling.typography.metaSize.desktop}px;
        }

        .post-meta-before {
          margin-bottom: 8px;
          margin-top: 0;
        }

        .post-meta-after {
          margin-top: 8px;
          margin-bottom: 12px;
        }

        .post-meta-bottom {
          margin-top: 12px;
          margin-bottom: 0;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .meta-link {
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .meta-link:hover {
          opacity: 0.8;
        }

        .post-excerpt {
          margin: 12px 0;
          line-height: 1.6;
        }

        .post-excerpt p {
          margin: 0;
        }

        .post-actions {
          margin-top: 16px;
        }

        .read-more-btn {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .post-title a {
            font-size: ${settings.styling.typography.titleSize.tablet}px !important;
          }
          .post-excerpt {
            font-size: ${settings.styling.typography.excerptSize.tablet}px !important;
          }
          .post-meta {
            font-size: ${settings.styling.typography.metaSize.tablet}px !important;
          }
        }

        @media (max-width: 768px) {
          .post-card-list {
            flex-direction: column;
          }
          
          .post-card-list .post-content {
            margin-left: 0;
            margin-right: 0;
            margin-top: 12px;
          }
          
          .post-title a {
            font-size: ${settings.styling.typography.titleSize.mobile}px !important;
          }
          .post-excerpt {
            font-size: ${settings.styling.typography.excerptSize.mobile}px !important;
          }
          .post-meta {
            font-size: ${settings.styling.typography.metaSize.mobile}px !important;
          }
        }
      `}</style>
    </article>
  );
};

export default PostCard;