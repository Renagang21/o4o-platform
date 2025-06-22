// UAGB Archive View - Spectra 스타일 (Part 1)
// WordPress Archive 스타일 뷰 컴포넌트

import React, { useState, useMemo } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
  UAGBTabs, 
  UAGBPanel, 
  UAGBTextControl,
  UAGBSelectControl,
  UAGBToggleControl,
  UAGBColorControl,
  UAGBNumberControl
} from './tiptap-block';
import { 
  Archive, Settings, Palette, Layout, Search, Filter,
  Calendar, Grid, List, Clock, User, Tag, MessageCircle,
  Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import { UAGBArchiveAttributes, UAGBArchiveItem } from './UAGBArchiveBlock';

interface UAGBArchiveViewProps {
  node: {
    attrs: UAGBArchiveAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBArchiveAttributes>) => void;
  selected: boolean;
}

// 데모 데이터 생성
const generateDemoData = (type: 'blog' | 'news' | 'portfolio' | 'ecommerce'): UAGBArchiveItem[] => {
  const blogData = [
    {
      id: '1',
      title: 'Getting Started with React and TypeScript',
      excerpt: 'Learn how to set up a modern React project with TypeScript, ESLint, and best practices for scalable web development.',
      content: 'Full content here...',
      date: '2024-06-20',
      author: 'John Doe',
      categories: ['Programming', 'React'],
      tags: ['react', 'typescript', 'javascript'],
      featured_image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
      slug: 'react-typescript-guide',
      status: 'published' as const,
      view_count: 1250,
      comment_count: 23
    },
    {
      id: '2',
      title: 'Modern CSS Techniques for 2024',
      excerpt: 'Discover the latest CSS features including Container Queries, CSS Grid improvements, and new color functions.',
      content: 'Full content here...',
      date: '2024-06-18',
      author: 'Jane Smith',
      categories: ['Design', 'CSS'],
      tags: ['css', 'web-design', 'responsive'],
      featured_image: 'https://images.unsplash.com/photo-1545670723-196ed0954986?w=400&h=250&fit=crop',
      slug: 'modern-css-2024',
      status: 'published' as const,
      view_count: 890,
      comment_count: 15
    },
    {
      id: '3',
      title: 'Building Scalable Node.js APIs',
      excerpt: 'Best practices for creating robust and scalable REST APIs using Node.js, Express, and modern architecture patterns.',
      content: 'Full content here...',
      date: '2024-06-15',
      author: 'Mike Johnson',
      categories: ['Backend', 'Node.js'],
      tags: ['nodejs', 'api', 'express'],
      featured_image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=250&fit=crop',
      slug: 'scalable-nodejs-apis',
      status: 'published' as const,
      view_count: 672,
      comment_count: 8
    },
    {
      id: '4',
      title: 'UI/UX Design Trends for 2024',
      excerpt: 'Explore the latest user interface and user experience design trends that are shaping digital products this year.',
      content: 'Full content here...',
      date: '2024-06-12',
      author: 'Sarah Wilson',
      categories: ['Design', 'UX'],
      tags: ['ui', 'ux', 'design-trends'],
      featured_image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=250&fit=crop',
      slug: 'ui-ux-trends-2024',
      status: 'published' as const,
      view_count: 1543,
      comment_count: 31
    },
    {
      id: '5',
      title: 'Database Optimization Strategies',
      excerpt: 'Learn advanced techniques for optimizing database performance, including indexing, query optimization, and caching.',
      content: 'Full content here...',
      date: '2024-06-10',
      author: 'Tom Brown',
      categories: ['Database', 'Performance'],
      tags: ['database', 'optimization', 'sql'],
      featured_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
      slug: 'database-optimization',
      status: 'published' as const,
      view_count: 423,
      comment_count: 7
    },
    {
      id: '6',
      title: 'Mobile App Development with React Native',
      excerpt: 'Complete guide to building cross-platform mobile applications using React Native and modern development tools.',
      content: 'Full content here...',
      date: '2024-06-08',
      author: 'Lisa Davis',
      categories: ['Mobile', 'React Native'],
      tags: ['react-native', 'mobile', 'ios', 'android'],
      featured_image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=250&fit=crop',
      slug: 'react-native-guide',
      status: 'published' as const,
      view_count: 789,
      comment_count: 12
    }
  ];

  return blogData;
};

export const UAGBArchiveView: React.FC<UAGBArchiveViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const attrs = node.attrs;

  // 데모 데이터 생성
  const demoData = useMemo(() => generateDemoData(attrs.demoDataType), [attrs.demoDataType]);

  // 필터링 및 검색 로직
  const filteredData = useMemo(() => {
    let filtered = [...demoData];

    // 검색 필터
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 카테고리/태그 필터
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.categories.some(cat => cat.toLowerCase() === selectedFilter.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase() === selectedFilter.toLowerCase())
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (attrs.sortBy) {
        case 'title':
          return attrs.sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
        case 'author':
          return attrs.sortOrder === 'asc' ? a.author.localeCompare(b.author) : b.author.localeCompare(a.author);
        case 'views':
          return attrs.sortOrder === 'asc' ? a.view_count - b.view_count : b.view_count - a.view_count;
        case 'comments':
          return attrs.sortOrder === 'asc' ? a.comment_count - b.comment_count : b.comment_count - a.comment_count;
        case 'date':
        default:
          return attrs.sortOrder === 'asc' ? 
            new Date(a.date).getTime() - new Date(b.date).getTime() : 
            new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return filtered;
  }, [demoData, searchQuery, selectedFilter, attrs.sortBy, attrs.sortOrder]);

  // 그룹핑 로직
  const groupedData = useMemo(() => {
    if (!attrs.enableGrouping) {
      return { 'All Posts': filteredData };
    }

    const groups: Record<string, UAGBArchiveItem[]> = {};
    
    filteredData.forEach(item => {
      let groupKey = '';
      
      switch (attrs.groupBy) {
        case 'year':
          groupKey = new Date(item.date).getFullYear().toString();
          break;
        case 'month':
          const date = new Date(item.date);
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'category':
          item.categories.forEach(cat => {
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
          });
          return;
        case 'tag':
          item.tags.forEach(tag => {
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push(item);
          });
          return;
        case 'author':
          groupKey = item.author;
          break;
        default:
          groupKey = 'All Posts';
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });

    return groups;
  }, [filteredData, attrs.enableGrouping, attrs.groupBy]);

  // 페이지네이션 로직
  const paginatedData = useMemo(() => {
    if (!attrs.enablePagination) return groupedData;

    const result: Record<string, UAGBArchiveItem[]> = {};
    Object.entries(groupedData).forEach(([groupKey, items]) => {
      const startIndex = (currentPage - 1) * attrs.postsPerPage;
      const endIndex = startIndex + attrs.postsPerPage;
      result[groupKey] = items.slice(startIndex, endIndex);
    });
    return result;
  }, [groupedData, currentPage, attrs.postsPerPage, attrs.enablePagination]);

  // 컨테이너 스타일
  const getContainerStyle = (): React.CSSProperties => {
    return {
      padding: `${attrs.blockTopPadding}px ${attrs.blockRightPadding}px ${attrs.blockBottomPadding}px ${attrs.blockLeftPadding}px`,
      margin: `${attrs.blockTopMargin}px ${attrs.blockRightMargin}px ${attrs.blockBottomMargin}px ${attrs.blockLeftMargin}px`,
      border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#fff',
      position: 'relative'
    };
  };

  // 그리드 스타일
  const getGridStyle = (): React.CSSProperties => {
    if (attrs.layout === 'list') {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: `${attrs.itemSpacing}px`
      };
    }

    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${attrs.columns}, 1fr)`,
      gap: `${attrs.itemSpacing}px`,
      gridAutoRows: attrs.layout === 'masonry' ? 'max-content' : 'auto'
    };
  };

  // 아이템 스타일
  const getItemStyle = (isHovered: boolean = false): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: isHovered && attrs.enableHoverEffect ? attrs.hoverBackgroundColor : attrs.itemBackgroundColor,
      border: `${attrs.itemBorderWidth}px solid ${isHovered && attrs.enableHoverEffect ? attrs.hoverBorderColor : attrs.itemBorderColor}`,
      borderRadius: `${attrs.itemBorderRadius}px`,
      padding: `${attrs.itemPadding}px`,
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    };

    if (attrs.itemShadow) {
      baseStyle.boxShadow = `0 4px 6px -1px ${isHovered && attrs.enableHoverEffect ? attrs.hoverShadowColor : attrs.itemShadowColor}`;
    }

    if (attrs.enableHoverEffect && isHovered) {
      switch (attrs.hoverTransform) {
        case 'scale':
          baseStyle.transform = 'scale(1.02)';
          break;
        case 'translateY':
          baseStyle.transform = 'translateY(-4px)';
          break;
      }
    }

    return baseStyle;
  };

  // 제목 스타일
  const getTitleStyle = (isHovered: boolean = false): React.CSSProperties => {
    return {
      fontFamily: attrs.titleFontFamily,
      fontSize: `${attrs.titleFontSize}px`,
      fontWeight: attrs.titleFontWeight,
      color: isHovered ? attrs.titleColorHover : attrs.titleColor,
      margin: '0 0 12px 0',
      lineHeight: '1.4',
      transition: 'color 0.3s ease'
    };
  };

  // 발췌문 스타일
  const getExcerptStyle = (): React.CSSProperties => {
    return {
      fontFamily: attrs.excerptFontFamily,
      fontSize: `${attrs.excerptFontSize}px`,
      color: attrs.excerptColor,
      lineHeight: attrs.excerptLineHeight,
      margin: '0 0 16px 0'
    };
  };

  // 메타 스타일
  const getMetaStyle = (): React.CSSProperties => {
    return {
      fontSize: `${attrs.metaFontSize}px`,
      color: attrs.metaColor,
      fontWeight: attrs.metaFontWeight,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
      margin: '0'
    };
  };

  // 그룹 제목 스타일
  const getGroupTitleStyle = (): React.CSSProperties => {
    return {
      fontSize: `${attrs.groupTitleFontSize}px`,
      color: attrs.groupTitleColor,
      fontWeight: attrs.groupTitleFontWeight,
      margin: `0 0 ${attrs.groupSpacing / 2}px 0`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    };
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    
    switch (attrs.dateFormat) {
      case 'relative':
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
        return `${Math.ceil(diffDays / 365)} years ago`;
        
      case 'custom':
        // 간단한 커스텀 포맷 (실제로는 더 복잡한 포맷팅 라이브러리 필요)
        return date.toLocaleDateString();
        
      default:
        return date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
    }
  };

  // 발췌문 자르기
  const truncateExcerpt = (text: string): string => {
    if (text.length <= attrs.excerptLength) return text;
    return text.substring(0, attrs.excerptLength).trim() + '...';
  };

  return (
    <NodeViewWrapper 
      className={`uagb-block-${attrs.block_id} uagb-archive`}
      data-block-id={attrs.block_id}
    >
      <div style={getContainerStyle()}>
        {/* 편집 버튼 */}
        {selected && (
          <button
            onClick={() => setIsEditorOpen(true)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            Edit Archive
          </button>
        )}

        {/* 필터 및 검색 */}
        {(attrs.enableSearch || attrs.enableFilters) && (
          <div style={{
            marginBottom: '32px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            {/* 검색 */}
            {attrs.enableSearch && (
              <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                <Search size={16} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }} />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 40px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* 필터 */}
            {attrs.enableFilters && (
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  outline: 'none'
                }}
              >
                <option value="all">All Categories</option>
                <option value="programming">Programming</option>
                <option value="design">Design</option>
                <option value="backend">Backend</option>
                <option value="css">CSS</option>
              </select>
            )}

            {/* 정렬 */}
            {attrs.enableSorting && (
              <select
                value={`${attrs.sortBy}-${attrs.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  updateAttributes({ 
                    sortBy: sortBy as any, 
                    sortOrder: sortOrder as any 
                  });
                }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  outline: 'none'
                }}
              >
                <option value="date-desc">Latest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="views-desc">Most Viewed</option>
                <option value="comments-desc">Most Comments</option>
              </select>
            )}
          </div>
        )}


        {/* 아이템 그리드/리스트 렌더링 */}
        <div style={{
          display: attrs.layout === 'list' ? 'block' : 'grid',
          gridTemplateColumns: attrs.layout === 'grid' ? 
            `repeat(${attrs.columns}, 1fr)` : 
            attrs.layout === 'masonry' ? 
              `repeat(${attrs.columns}, 1fr)` : 
              '1fr',
          gap: `${attrs.itemSpacing}px`,
          marginTop: '24px'
        }}>
          {currentItems.map((item, index) => (
            <div
              key={item.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                ...(attrs.layout === 'timeline' ? {
                  position: 'relative',
                  paddingLeft: '40px',
                  borderLeft: '2px solid #3b82f6',
                  marginLeft: '20px'
                } : {})
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
            >
              {/* Timeline 마커 */}
              {attrs.layout === 'timeline' && (
                <div style={{
                  position: 'absolute',
                  left: '-8px',
                  top: '16px',
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  border: '3px solid #fff'
                }} />
              )}

              {/* Featured Image */}
              {attrs.showFeaturedImage && item.featured_image && (
                <div style={{ position: 'relative', paddingBottom: '60%', overflow: 'hidden' }}>
                  <img
                    src={item.featured_image}
                    alt={item.title}
                    style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}

              {/* Content */}
              <div style={{ padding: attrs.layout === 'list' ? '16px 20px' : '16px' }}>
                {/* Categories */}
                {attrs.showCategories && item.categories.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {item.categories.slice(0, 2).map((category, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          fontSize: '11px',
                          borderRadius: '12px',
                          marginRight: '6px'
                        }}
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                {/* Title */}
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: attrs.layout === 'list' ? '18px' : '16px',
                  fontWeight: '600',
                  lineHeight: '1.4',
                  color: '#1f2937'
                }}>
                  {item.title}
                </h3>

                {/* Meta Information */}
                {(attrs.showDate || attrs.showAuthor || attrs.showViewCount || attrs.showCommentCount) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {attrs.showDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    )}
                    {attrs.showAuthor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        {item.author}
                      </div>
                    )}
                    {attrs.showViewCount && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={12} />
                        {item.view_count.toLocaleString()}
                      </div>
                    )}
                    {attrs.showCommentCount && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MessageCircle size={12} />
                        {item.comment_count}
                      </div>
                    )}
                  </div>
                )}

                {/* Excerpt */}
                {attrs.showExcerpt && (
                  <p style={{
                    margin: '0 0 12px 0',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: '#4b5563',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {item.excerpt}
                  </p>
                )}

                {/* Tags */}
                {attrs.showTags && item.tags.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {item.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          fontSize: '10px',
                          borderRadius: '10px',
                          marginRight: '4px',
                          marginBottom: '2px'
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Read More Button */}
                {attrs.showReadMore && (
                  <button
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }}
                  >
                    {attrs.readMoreText}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar View (layout이 calendar일 때) */}
        {attrs.layout === 'calendar' && (
          <div style={{
            marginTop: '24px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {/* Calendar Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb'
            }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#374151',
                    borderRight: '1px solid #e5e7eb'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Body */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridTemplateRows: 'repeat(6, 120px)'
            }}>
              {Array.from({ length: 42 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - date.getDay() + i);
                const dayItems = currentItems.filter(item => 
                  new Date(item.date).toDateString() === date.toDateString()
                );
                
                return (
                  <div
                    key={i}
                    style={{
                      border: '1px solid #e5e7eb',
                      padding: '4px',
                      backgroundColor: i % 7 === 0 || i % 7 === 6 ? '#fafafa' : '#fff',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      {date.getDate()}
                    </div>
                    
                    {dayItems.slice(0, 2).map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: '10px',
                          padding: '2px 4px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '2px',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    ))}
                    
                    {dayItems.length > 2 && (
                      <div style={{
                        fontSize: '9px',
                        color: '#6b7280',
                        textAlign: 'center'
                      }}>
                        +{dayItems.length - 2} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {attrs.enablePagination && attrs.paginationType === 'numbered' && totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '32px'
          }}>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                backgroundColor: currentPage === 1 ? '#f9fafb' : '#fff',
                color: currentPage === 1 ? '#9ca3af' : '#374151',
                borderRadius: '6px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    backgroundColor: currentPage === pageNum ? '#3b82f6' : '#fff',
                    color: currentPage === pageNum ? '#fff' : '#374151',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: currentPage === pageNum ? '600' : '400'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                backgroundColor: currentPage === totalPages ? '#f9fafb' : '#fff',
                color: currentPage === totalPages ? '#9ca3af' : '#374151',
                borderRadius: '6px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        )}

        {/* Load More Button */}
        {attrs.enablePagination && attrs.paginationType === 'load-more' && hasMore && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '32px'
          }}>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Load More Posts
            </button>
          </div>
        )}

        {/* No Results */}
        {currentItems.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#6b7280'
          }}>
            <Archive size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '500' }}>
              No posts found
            </h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              {selectedFilter !== 'all' || searchTerm ? 
                'Try adjusting your filters or search terms.' : 
                'There are no posts to display yet.'}
            </p>
          </div>
        )}
      </div>

      {/* 편집 모달 */}
      {isEditorOpen && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '900px',
            height: '80%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* 모달 헤더 */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Archive className="w-5 h-5 text-blue-600" />
                <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600' }}>
                  Archive Settings
                </h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ✕
              </button>
            </div>

            {/* 탭과 콘텐츠 */}
            <div className="flex-1 overflow-hidden">
              <UAGBTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={[
                  {
                    id: 'content',
                    label: 'Archive Content',
                    icon: <Archive className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* Data Source 설정 */}
                        <UAGBPanel title="Data Source">
                          <UAGBSelectControl
                            label="Archive Type"
                            value={attrs.archiveType}
                            onChange={(archiveType) => updateAttributes({ archiveType: archiveType as any })}
                            options={[
                              { label: 'Posts (Demo Data)', value: 'posts' },
                              { label: 'Custom Post Type', value: 'custom' },
                              { label: 'Dynamic from Forms', value: 'dynamic' }
                            ]}
                            help="Choose the source of your archive data"
                          />
                          
                          {attrs.archiveType === 'custom' && (
                            <UAGBTextControl
                              label="Post Type"
                              value={attrs.postType}
                              onChange={(postType) => updateAttributes({ postType })}
                              placeholder="blog, news, portfolio..."
                              help="Custom post type identifier"
                            />
                          )}
                          
                          {attrs.archiveType === 'dynamic' && (
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                                <Database size={16} />
                                Dynamic Data Source
                              </div>
                              <p className="text-sm text-blue-700 mb-3">
                                This archive will automatically display posts created through Form blocks 
                                with Post Creation Mode enabled.
                              </p>
                              <UAGBSelectControl
                                label="Source Post Type"
                                value={attrs.dynamicSourceType || 'blog'}
                                onChange={(dynamicSourceType) => updateAttributes({ dynamicSourceType })}
                                options={[
                                  { label: 'Blog Posts', value: 'blog' },
                                  { label: 'News Articles', value: 'news' },
                                  { label: 'Portfolio Items', value: 'portfolio' },
                                  { label: 'Products', value: 'product' },
                                  { label: 'Custom Type', value: 'custom' }
                                ]}
                                help="Which post type data to display"
                              />
                            </div>
                          )}
                        </UAGBPanel>

                        {/* Query Settings */}
                        <UAGBPanel title="Query Settings">
                          <UAGBNumberControl
                            label="Posts Per Page"
                            value={attrs.postsPerPage}
                            min={1}
                            max={50}
                            onChange={(postsPerPage) => updateAttributes({ postsPerPage })}
                          />
                          
                          <UAGBSelectControl
                            label="Order By"
                            value={attrs.sortBy}
                            onChange={(sortBy) => updateAttributes({ sortBy: sortBy as any })}
                            options={[
                              { label: 'Date', value: 'date' },
                              { label: 'Title', value: 'title' },
                              { label: 'View Count', value: 'views' },
                              { label: 'Comment Count', value: 'comments' },
                              { label: 'Random', value: 'random' }
                            ]}
                          />
                          
                          <UAGBSelectControl
                            label="Sort Order"
                            value={attrs.sortOrder}
                            onChange={(sortOrder) => updateAttributes({ sortOrder: sortOrder as any })}
                            options={[
                              { label: 'Descending (Newest First)', value: 'desc' },
                              { label: 'Ascending (Oldest First)', value: 'asc' }
                            ]}
                          />
                        </UAGBPanel>

                        {/* Grouping Settings */}
                        <UAGBPanel title="Grouping & Organization">
                          <UAGBSelectControl
                            label="Group By"
                            value={attrs.groupBy}
                            onChange={(groupBy) => updateAttributes({ groupBy: groupBy as any })}
                            options={[
                              { label: 'None', value: 'none' },
                              { label: 'Year', value: 'year' },
                              { label: 'Month', value: 'month' },
                              { label: 'Category', value: 'category' },
                              { label: 'Author', value: 'author' },
                              { label: 'Tag', value: 'tag' }
                            ]}
                            help="Group posts by specific criteria"
                          />
                          
                          <UAGBToggleControl
                            label="Show Group Headers"
                            checked={attrs.showGroupHeaders}
                            onChange={(showGroupHeaders) => updateAttributes({ showGroupHeaders })}
                            help="Display headers for each group"
                          />
                        </UAGBPanel>
                      </div>
                    )
                  },
                  
                  {
                    id: 'layout',
                    label: 'Layout',
                    icon: <Layout className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* Layout Options */}
                        <UAGBPanel title="Layout Style">
                          <UAGBSelectControl
                            label="Layout Type"
                            value={attrs.layout}
                            onChange={(layout) => updateAttributes({ layout: layout as any })}
                            options={[
                              { label: 'Grid', value: 'grid' },
                              { label: 'List', value: 'list' },
                              { label: 'Masonry', value: 'masonry' },
                              { label: 'Timeline', value: 'timeline' },
                              { label: 'Calendar', value: 'calendar' }
                            ]}
                          />
                          
                          {(attrs.layout === 'grid' || attrs.layout === 'masonry') && (
                            <>
                              <UAGBNumberControl
                                label="Columns (Desktop)"
                                value={attrs.columns}
                                min={1}
                                max={6}
                                onChange={(columns) => updateAttributes({ columns })}
                              />
                              
                              <UAGBNumberControl
                                label="Columns (Tablet)"
                                value={attrs.columnsTablet}
                                min={1}
                                max={4}
                                onChange={(columnsTablet) => updateAttributes({ columnsTablet })}
                              />
                              
                              <UAGBNumberControl
                                label="Columns (Mobile)"
                                value={attrs.columnsMobile}
                                min={1}
                                max={2}
                                onChange={(columnsMobile) => updateAttributes({ columnsMobile })}
                              />
                            </>
                          )}
                          
                          <UAGBNumberControl
                            label="Item Spacing"
                            value={attrs.itemSpacing}
                            min={0}
                            max={50}
                            onChange={(itemSpacing) => updateAttributes({ itemSpacing })}
                            help="Space between archive items (px)"
                          />
                        </UAGBPanel>

                        {/* Display Options */}
                        <UAGBPanel title="Display Elements">
                          <div className="grid grid-cols-2 gap-4">
                            <UAGBToggleControl
                              label="Featured Image"
                              checked={attrs.showFeaturedImage}
                              onChange={(showFeaturedImage) => updateAttributes({ showFeaturedImage })}
                            />
                            
                            <UAGBToggleControl
                              label="Excerpt"
                              checked={attrs.showExcerpt}
                              onChange={(showExcerpt) => updateAttributes({ showExcerpt })}
                            />
                            
                            <UAGBToggleControl
                              label="Date"
                              checked={attrs.showDate}
                              onChange={(showDate) => updateAttributes({ showDate })}
                            />
                            
                            <UAGBToggleControl
                              label="Author"
                              checked={attrs.showAuthor}
                              onChange={(showAuthor) => updateAttributes({ showAuthor })}
                            />
                            
                            <UAGBToggleControl
                              label="Categories"
                              checked={attrs.showCategories}
                              onChange={(showCategories) => updateAttributes({ showCategories })}
                            />
                            
                            <UAGBToggleControl
                              label="Tags"
                              checked={attrs.showTags}
                              onChange={(showTags) => updateAttributes({ showTags })}
                            />
                            
                            <UAGBToggleControl
                              label="View Count"
                              checked={attrs.showViewCount}
                              onChange={(showViewCount) => updateAttributes({ showViewCount })}
                            />
                            
                            <UAGBToggleControl
                              label="Comment Count"
                              checked={attrs.showCommentCount}
                              onChange={(showCommentCount) => updateAttributes({ showCommentCount })}
                            />
                            
                            <UAGBToggleControl
                              label="Read More Button"
                              checked={attrs.showReadMore}
                              onChange={(showReadMore) => updateAttributes({ showReadMore })}
                            />
                          </div>
                          
                          {attrs.showReadMore && (
                            <UAGBTextControl
                              label="Read More Text"
                              value={attrs.readMoreText}
                              onChange={(readMoreText) => updateAttributes({ readMoreText })}
                              placeholder="Read More"
                            />
                          )}
                        </UAGBPanel>

                        {/* Interactive Features */}
                        <UAGBPanel title="Interactive Features">
                          <UAGBToggleControl
                            label="Enable Search"
                            checked={attrs.enableSearch}
                            onChange={(enableSearch) => updateAttributes({ enableSearch })}
                            help="Allow users to search through posts"
                          />
                          
                          <UAGBToggleControl
                            label="Enable Filters"
                            checked={attrs.enableFilters}
                            onChange={(enableFilters) => updateAttributes({ enableFilters })}
                            help="Show category/tag filters"
                          />
                          
                          <UAGBToggleControl
                            label="Enable Sorting"
                            checked={attrs.enableSorting}
                            onChange={(enableSorting) => updateAttributes({ enableSorting })}
                            help="Allow users to change sort order"
                          />
                          
                          <UAGBToggleControl
                            label="Enable Pagination"
                            checked={attrs.enablePagination}
                            onChange={(enablePagination) => updateAttributes({ enablePagination })}
                            help="Split results across multiple pages"
                          />
                          
                          {attrs.enablePagination && (
                            <UAGBSelectControl
                              label="Pagination Type"
                              value={attrs.paginationType}
                              onChange={(paginationType) => updateAttributes({ paginationType: paginationType as any })}
                              options={[
                                { label: 'Numbered Pages', value: 'numbered' },
                                { label: 'Load More Button', value: 'load-more' },
                                { label: 'Infinite Scroll', value: 'infinite-scroll' }
                              ]}
                            />
                          )}
                        </UAGBPanel>
                      </div>
                    )
                  },
                  
                  {
                    id: 'style',
                    label: 'Styling',
                    icon: <Palette className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* Typography */}
                        <UAGBPanel title="Typography">
                          <UAGBColorControl
                            label="Title Color"
                            value={attrs.titleColor}
                            onChange={(titleColor) => updateAttributes({ titleColor })}
                          />
                          
                          <UAGBNumberControl
                            label="Title Font Size"
                            value={attrs.titleFontSize}
                            min={12}
                            max={32}
                            onChange={(titleFontSize) => updateAttributes({ titleFontSize })}
                          />
                          
                          <UAGBColorControl
                            label="Content Color"
                            value={attrs.contentColor}
                            onChange={(contentColor) => updateAttributes({ contentColor })}
                          />
                          
                          <UAGBColorControl
                            label="Meta Color"
                            value={attrs.metaColor}
                            onChange={(metaColor) => updateAttributes({ metaColor })}
                          />
                        </UAGBPanel>

                        {/* Container Styling */}
                        <UAGBPanel title="Container">
                          <UAGBColorControl
                            label="Background Color"
                            value={attrs.backgroundColor}
                            onChange={(backgroundColor) => updateAttributes({ backgroundColor })}
                          />
                          
                          <UAGBColorControl
                            label="Border Color"
                            value={attrs.borderColor}
                            onChange={(borderColor) => updateAttributes({ borderColor })}
                          />
                          
                          <UAGBNumberControl
                            label="Border Radius"
                            value={attrs.borderRadius}
                            min={0}
                            max={20}
                            onChange={(borderRadius) => updateAttributes({ borderRadius })}
                          />
                          
                          <UAGBNumberControl
                            label="Container Padding"
                            value={attrs.containerPadding}
                            min={0}
                            max={50}
                            onChange={(containerPadding) => updateAttributes({ containerPadding })}
                          />
                        </UAGBPanel>

                        {/* Item Styling */}
                        <UAGBPanel title="Archive Items">
                          <UAGBColorControl
                            label="Item Background"
                            value={attrs.itemBackgroundColor}
                            onChange={(itemBackgroundColor) => updateAttributes({ itemBackgroundColor })}
                          />
                          
                          <UAGBColorControl
                            label="Item Border Color"
                            value={attrs.itemBorderColor}
                            onChange={(itemBorderColor) => updateAttributes({ itemBorderColor })}
                          />
                          
                          <UAGBNumberControl
                            label="Item Border Radius"
                            value={attrs.itemBorderRadius}
                            min={0}
                            max={20}
                            onChange={(itemBorderRadius) => updateAttributes({ itemBorderRadius })}
                          />
                          
                          <UAGBNumberControl
                            label="Item Padding"
                            value={attrs.itemPadding}
                            min={0}
                            max={30}
                            onChange={(itemPadding) => updateAttributes({ itemPadding })}
                          />
                        </UAGBPanel>

                        {/* Button Styling */}
                        <UAGBPanel title="Read More Button">
                          <UAGBColorControl
                            label="Button Background"
                            value={attrs.buttonBackgroundColor}
                            onChange={(buttonBackgroundColor) => updateAttributes({ buttonBackgroundColor })}
                          />
                          
                          <UAGBColorControl
                            label="Button Text Color"
                            value={attrs.buttonTextColor}
                            onChange={(buttonTextColor) => updateAttributes({ buttonTextColor })}
                          />
                          
                          <UAGBColorControl
                            label="Button Hover Background"
                            value={attrs.buttonHoverBackgroundColor}
                            onChange={(buttonHoverBackgroundColor) => updateAttributes({ buttonHoverBackgroundColor })}
                          />
                          
                          <UAGBNumberControl
                            label="Button Border Radius"
                            value={attrs.buttonBorderRadius}
                            min={0}
                            max={20}
                            onChange={(buttonBorderRadius) => updateAttributes({ buttonBorderRadius })}
                          />
                        </UAGBPanel>
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default UAGBArchiveView;