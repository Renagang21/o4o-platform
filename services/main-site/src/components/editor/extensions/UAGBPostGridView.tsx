// UAGB Post Grid View - Spectra 스타일
// ProductBlockView를 UAGB Post Grid View로 변환

import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
  UAGBTabs, 
  UAGBPanel, 
  UAGBPostGridControl,
  UAGBNumberControl,
  UAGBSelectControl,
  UAGBToggleControl
} from './tiptap-block';
import { Layout, Grid, Image, Settings, Type, Palette } from 'lucide-react';
import { UAGBPostGridAttributes } from './UAGBPostGridBlock';

interface UAGBPostGridViewProps {
  node: {
    attrs: UAGBPostGridAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBPostGridAttributes>) => void;
  selected: boolean;
}

// 데모 포스트 데이터
const demoPosts = [
  {
    id: 1,
    title: "The Future of Web Development",
    excerpt: "Exploring the latest trends and technologies that are shaping the future of web development...",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=250&fit=crop",
    author: "John Doe",
    date: "2024-06-20",
    categories: ["Technology", "Web Dev"],
    tags: ["React", "JavaScript", "CSS"]
  },
  {
    id: 2,
    title: "Design Systems at Scale",
    excerpt: "How to build and maintain design systems that work across large organizations...",
    image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=250&fit=crop",
    author: "Jane Smith",
    date: "2024-06-19",
    categories: ["Design", "UX/UI"],
    tags: ["Design System", "Figma", "Components"]
  },
  {
    id: 3,
    title: "Mobile-First Responsive Design",
    excerpt: "Best practices for creating mobile-first responsive designs that work everywhere...",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=250&fit=crop",
    author: "Mike Johnson",
    date: "2024-06-18",
    categories: ["Design", "Mobile"],
    tags: ["Responsive", "Mobile", "CSS Grid"]
  },
  {
    id: 4,
    title: "Advanced React Patterns",
    excerpt: "Deep dive into advanced React patterns and techniques for better component architecture...",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop",
    author: "Sarah Wilson",
    date: "2024-06-17",
    categories: ["Technology", "React"],
    tags: ["React", "Patterns", "Architecture"]
  },
  {
    id: 5,
    title: "CSS Grid vs Flexbox",
    excerpt: "Understanding when to use CSS Grid and when to use Flexbox for layout design...",
    image: "https://images.unsplash.com/photo-1545670723-196ed0954986?w=400&h=250&fit=crop",
    author: "Tom Brown",
    date: "2024-06-16",
    categories: ["CSS", "Layout"],
    tags: ["CSS Grid", "Flexbox", "Layout"]
  },
  {
    id: 6,
    title: "Performance Optimization Tips",
    excerpt: "Essential tips and techniques for optimizing web application performance...",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop",
    author: "Lisa Davis",
    date: "2024-06-15",
    categories: ["Performance", "Optimization"],
    tags: ["Performance", "Optimization", "Speed"]
  }
];

export const UAGBPostGridView: React.FC<UAGBPostGridViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [displayedPosts, setDisplayedPosts] = useState(demoPosts);
  const attrs = node.attrs;

  // 포스트 개수에 따른 표시 제한
  useEffect(() => {
    setDisplayedPosts(demoPosts.slice(0, attrs.postsPerPage));
  }, [attrs.postsPerPage]);

  const getGridStyle = () => {
    const style: React.CSSProperties = {
      display: 'grid',
      gap: `${attrs.rowGap}px ${attrs.columnGap}px`,
      gridTemplateColumns: `repeat(${attrs.columns}, 1fr)`,
    };

    if (attrs.layout === 'list') {
      style.gridTemplateColumns = '1fr';
    } else if (attrs.layout === 'masonry') {
      style.gridAutoRows = 'max-content';
    }

    return style;
  };

  const renderPost = (post: any) => (
    <div 
      key={post.id} 
      className={`uagb-post-grid-item ${attrs.layout}`}
      style={{ 
        height: attrs.equalHeight ? '100%' : 'auto',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#fff'
      }}
    >
      <div style={{ position: 'relative' }}>
        <img 
          src={post.image} 
          alt={post.title}
          style={{ 
            width: '100%', 
            height: '200px', 
            objectFit: 'cover' 
          }}
        />
      </div>
      
      <div style={{ padding: '20px' }}>
        <h3 style={{ 
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '12px',
          lineHeight: '1.4'
        }}>
          {post.title}
        </h3>
        
        {attrs.showExcerpt && (
          <p style={{ 
            color: '#6b7280',
            fontSize: '14px',
            lineHeight: '1.6',
            marginBottom: '16px'
          }}>
            {post.excerpt.length > attrs.excerptLength ? 
              `${post.excerpt.substring(0, attrs.excerptLength)}...` : 
              post.excerpt
            }
          </p>
        )}
        
        {attrs.showMeta && (
          <div style={{ 
            fontSize: '12px',
            color: '#9ca3af',
            marginBottom: '16px'
          }}>
            {attrs.showAuthor && <span>By {post.author}</span>}
            {attrs.showAuthor && attrs.showDate && <span> • </span>}
            {attrs.showDate && <span>{post.date}</span>}
          </div>
        )}
        
        {attrs.showCategories && (
          <div style={{ marginBottom: '12px' }}>
            {post.categories.map((cat: string, idx: number) => (
              <span 
                key={idx}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  marginRight: '6px',
                  marginBottom: '4px'
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}
        
        {attrs.showReadMore && (
          <button style={{
            color: '#3b82f6',
            fontSize: '14px',
            fontWeight: '500',
            textDecoration: 'none',
            border: 'none',
            background: 'none',
            cursor: 'pointer'
          }}>
            {attrs.readMoreText}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <NodeViewWrapper 
      className={`uagb-block-${attrs.block_id} uagb-post-grid`}
      data-block-id={attrs.block_id}
    >
      <div 
        style={{ 
          border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          position: 'relative',
          backgroundColor: '#fff'
        }}
      >
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
            Edit Post Grid
          </button>
        )}

        {/* 포스트 그리드 */}
        <div style={getGridStyle()}>
          {displayedPosts.map(renderPost)}
        </div>

        {/* 페이지네이션 */}
        {attrs.showPagination && (
          <div style={{
            marginTop: '30px',
            textAlign: 'center'
          }}>
            {attrs.paginationType === 'numbered' && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <button style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>1</button>
                <button style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>2</button>
                <button style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>3</button>
              </div>
            )}
            {attrs.paginationType === 'load-more' && (
              <button style={{ 
                padding: '12px 24px', 
                backgroundColor: '#3b82f6', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '6px',
                fontWeight: '500'
              }}>
                Load More
              </button>
            )}
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
            maxWidth: '1000px',
            height: '80%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* 모달 헤더 */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600' }}>
                Edit Post Grid
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            {/* 탭 컨텐츠 */}
            <div style={{ flex: '1', overflow: 'auto' }}>
              <UAGBTabs
                tabs={[
                  {
                    id: 'layout',
                    label: 'Layout',
                    icon: <Grid size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPostGridControl
                          settings={{
                            columns: attrs.columns,
                            columnsTablet: attrs.columnsTablet,
                            columnsMobile: attrs.columnsMobile,
                            postsPerPage: attrs.postsPerPage,
                            showFilters: attrs.showFilters,
                            showPagination: attrs.showPagination,
                            layout: attrs.layout,
                            imageSize: attrs.imageSize,
                            showExcerpt: attrs.showExcerpt,
                            excerptLength: attrs.excerptLength,
                            showMeta: attrs.showMeta,
                            showAuthor: attrs.showAuthor,
                            showDate: attrs.showDate,
                            showCategories: attrs.showCategories,
                            orderBy: attrs.orderBy,
                            order: attrs.order
                          }}
                          onChange={(settings) => updateAttributes(settings)}
                        />
                      </div>
                    )
                  },
                  {
                    id: 'spacing',
                    label: 'Spacing',
                    icon: <Layout size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPanel title="Grid Spacing" isOpen={true}>
                          <UAGBNumberControl
                            label="Row Gap"
                            value={attrs.rowGap}
                            min={0}
                            max={100}
                            onChange={(rowGap) => updateAttributes({ rowGap })}
                          />
                          <UAGBNumberControl
                            label="Column Gap"
                            value={attrs.columnGap}
                            min={0}
                            max={100}
                            onChange={(columnGap) => updateAttributes({ columnGap })}
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

export default UAGBPostGridView;
