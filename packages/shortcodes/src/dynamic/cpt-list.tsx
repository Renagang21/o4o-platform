/**
 * CPT List Shortcode Component
 * [cpt_list type="ds_product" count="10" template="grid"]
 */

import React, { useEffect, useState } from 'react';
import { CPTListShortcodeAttributes, CPTPost } from './types.js';
import { ShortcodeProps, ShortcodeDefinition } from '../types.js';
import { shortcodeCache, CACHE_CONFIG } from './cache.js';
import { ErrorMessage, Placeholder } from './components.js';

// Default templates for different layouts
const DefaultTemplate: React.FC<{ posts: CPTPost[]; attributes: CPTListShortcodeAttributes }> = ({ posts, attributes }) => (
  <div className="cpt-list cpt-list--default">
    {posts.map((post) => (
      <article key={post.id} className="cpt-item">
        <h3>
          <a href={`/cpt-engine/content/${attributes.type}/${post.id}`}>
            {post.title}
          </a>
        </h3>
        {attributes.show_excerpt && post.excerpt && (
          <div className="cpt-item__excerpt">{post.excerpt}</div>
        )}
        {attributes.show_meta && (
          <div className="cpt-item__meta">
            <span className="date">{new Date(post.date).toLocaleDateString()}</span>
            {post.author && <span className="author">by {post.author.name}</span>}
          </div>
        )}
      </article>
    ))}
  </div>
);

const GridTemplate: React.FC<{ posts: CPTPost[]; attributes: CPTListShortcodeAttributes }> = ({ posts, attributes }) => (
  <div 
    className={`cpt-list cpt-list--grid`}
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${attributes.columns || 3}, 1fr)`,
      gap: '1.5rem'
    }}
  >
    {posts.map((post) => (
      <div key={post.id} className="cpt-grid-item">
        {attributes.show_thumbnail && post.featuredImage && (
          <div className="cpt-grid-item__thumbnail">
            <img src={post.featuredImage} alt={post.title} loading="lazy" />
          </div>
        )}
        <div className="cpt-grid-item__content">
          <h3>
            <a href={`/cpt-engine/content/${attributes.type}/${post.id}`}>
              {post.title}
            </a>
          </h3>
          {attributes.show_excerpt && post.excerpt && (
            <p className="excerpt">{post.excerpt}</p>
          )}
        </div>
      </div>
    ))}
  </div>
);

const ListTemplate: React.FC<{ posts: CPTPost[]; attributes: CPTListShortcodeAttributes }> = ({ posts, attributes }) => (
  <div className="cpt-list cpt-list--list">
    {posts.map((post) => (
      <div key={post.id} className="cpt-list-item">
        <div className="cpt-list-item__row">
          {attributes.show_thumbnail && post.featuredImage && (
            <div className="cpt-list-item__thumbnail">
              <img src={post.featuredImage} alt={post.title} loading="lazy" />
            </div>
          )}
          <div className="cpt-list-item__content">
            <h3>
              <a href={`/cpt-engine/content/${attributes.type}/${post.id}`}>
                {post.title}
              </a>
            </h3>
            {attributes.show_excerpt && post.excerpt && (
              <p>{post.excerpt}</p>
            )}
            {attributes.show_meta && (
              <div className="meta">
                <span>{new Date(post.date).toLocaleDateString()}</span>
                {post.author && <span> • {post.author.name}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const CardTemplate: React.FC<{ posts: CPTPost[]; attributes: CPTListShortcodeAttributes }> = ({ posts, attributes }) => (
  <div 
    className="cpt-list cpt-list--cards"
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${attributes.columns || 2}, 1fr)`,
      gap: '2rem'
    }}
  >
    {posts.map((post) => (
      <div key={post.id} className="cpt-card">
        {attributes.show_thumbnail && post.featuredImage && (
          <div className="cpt-card__image">
            <img src={post.featuredImage} alt={post.title} loading="lazy" />
          </div>
        )}
        <div className="cpt-card__body">
          <h3 className="cpt-card__title">
            <a href={`/cpt-engine/content/${attributes.type}/${post.id}`}>
              {post.title}
            </a>
          </h3>
          {attributes.show_excerpt && post.excerpt && (
            <p className="cpt-card__excerpt">{post.excerpt}</p>
          )}
          {attributes.show_meta && (
            <div className="cpt-card__meta">
              <span className="date">{new Date(post.date).toLocaleDateString()}</span>
              {post.author && (
                <span className="author"> • {post.author.name}</span>
              )}
            </div>
          )}
          <a 
            href={`/cpt-engine/content/${attributes.type}/${post.id}`}
            className="cpt-card__link"
          >
            자세히 보기 →
          </a>
        </div>
      </div>
    ))}
  </div>
);

// Template map
const templates = {
  default: DefaultTemplate,
  grid: GridTemplate,
  list: ListTemplate,
  card: CardTemplate,
};

export const CPTListShortcode: React.FC<ShortcodeProps> = ({ attributes, context }) => {
  const [posts, setPosts] = useState<CPTPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const attrs = attributes as unknown as CPTListShortcodeAttributes;
  
  // Set defaults
  const finalAttrs: CPTListShortcodeAttributes = {
    ...attrs,
    type: attrs.type || 'post',
    count: attrs.count || 10,
    orderby: attrs.orderby || 'date',
    order: attrs.order || 'DESC',
    status: attrs.status || 'publish',
    template: attrs.template || 'default',
    columns: attrs.columns || 3,
    show_thumbnail: attrs.show_thumbnail !== false,
    show_excerpt: attrs.show_excerpt !== false,
    show_meta: attrs.show_meta !== false,
    cache: attrs.cache !== false
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        
        // Generate cache key
        const cacheKey = shortcodeCache.generateKey('cpt_list', finalAttrs, context);
        
        // Check cache first if caching is enabled
        if (finalAttrs.cache) {
          const cached = shortcodeCache.get<CPTPost[]>(cacheKey);
          if (cached) {
            setPosts(cached);
            setError(null);
            setLoading(false);
            return;
          }
        }
        
        // Build query params
        const params = new URLSearchParams({
          limit: finalAttrs.count!.toString(),
          orderby: finalAttrs.orderby!,
          order: finalAttrs.order!,
          status: finalAttrs.status!,
        });

        if (finalAttrs.meta_key) {
          params.append('meta_key', finalAttrs.meta_key);
        }
        if (finalAttrs.meta_value) {
          params.append('meta_value', finalAttrs.meta_value);
        }

        // Fetch from API
        const response = await fetch(`/api/cpt/${finalAttrs.type}/posts?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${finalAttrs.type} posts`);
        }

        const data = await response.json();
        
        // Map API response to CPTPost format
        // Phase 4-2: meta field is provided by API - downstream consumers
        // should use Meta API for normalized access, but we preserve this
        // for backward compatibility during transition period
        const mappedPosts: CPTPost[] = (data.data || data || []).map((post: any) => ({
          id: post.id,
          title: post.title || 'Untitled',
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          featuredImage: post.featuredImage || post.thumbnail,
          author: post.author,
          date: post.createdAt || post.date,
          modified: post.updatedAt || post.modified,
          status: post.status,
          meta: post.meta || {}, // Legacy - use Meta API endpoints instead
          acf: post.customFields || post.acf || {},
          taxonomies: post.taxonomies,
        }));

        // Cache the results if caching is enabled
        if (finalAttrs.cache) {
          shortcodeCache.set(cacheKey, mappedPosts, CACHE_CONFIG.cpt_list.ttl);
        }
        
        setPosts(mappedPosts);
        setError(null);
      } catch (err) {
        console.error('Error fetching CPT posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    if (finalAttrs.type) {
      fetchPosts();
    }
  }, [finalAttrs.type, finalAttrs.count, finalAttrs.orderby, finalAttrs.order, finalAttrs.cache, context]);

  if (loading) {
    return (
      <div className="cpt-list-loading">
        {finalAttrs.template === 'grid' ? (
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${finalAttrs.columns || 3}, 1fr)`,
              gap: '1.5rem'
            }}
          >
            {Array.from({ length: Math.min(finalAttrs.count || 3, 6) }).map((_, i) => (
              <Placeholder key={i} type="card" />
            ))}
          </div>
        ) : (
          <Placeholder type="list" lines={Math.min(finalAttrs.count || 3, 5)} />
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="cpt-list-error">
        <ErrorMessage 
          error={error} 
          showDetails={true}
          className="mb-2"
        />
        <p className="cpt-list-error__shortcode text-xs text-gray-500">
          [cpt_list type="{finalAttrs.type}" count="{finalAttrs.count}"]
        </p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="cpt-list-empty">
        <p>No {finalAttrs.type} posts found.</p>
      </div>
    );
  }

  // Select template
  const Template = templates[finalAttrs.template!] || templates.default;

  return <Template posts={posts} attributes={finalAttrs} />;
};

// Register shortcode
// Phase SC-3: Enhanced with UI metadata for editor
export const cptListShortcodeDefinition: ShortcodeDefinition = {
  name: 'cpt_list',
  component: CPTListShortcode,
  label: 'CPT 목록',
  category: 'Dynamic Content',
  description: 'Display a list of CPT posts',
  defaultAttributes: {
    type: 'post',
    count: 10,
    template: 'default',
    show_thumbnail: true,
    show_excerpt: true,
    show_meta: true,
  },
  fields: [
    {
      name: 'type',
      label: 'CPT 타입',
      type: 'string',
      required: true,
      placeholder: 'ds_product',
      helpText: '표시할 커스텀 포스트 타입 (예: ds_product, ds_supplier)',
      defaultValue: 'post'
    },
    {
      name: 'count',
      label: '표시 개수',
      type: 'number',
      required: false,
      defaultValue: 10,
      helpText: '표시할 게시물 개수'
    },
    {
      name: 'template',
      label: '템플릿',
      type: 'select',
      required: false,
      options: [
        { label: '기본', value: 'default' },
        { label: '그리드', value: 'grid' },
        { label: '리스트', value: 'list' },
        { label: '카드', value: 'card' }
      ],
      defaultValue: 'default',
      helpText: '목록 표시 템플릿을 선택합니다.'
    },
    {
      name: 'columns',
      label: '열 개수',
      type: 'number',
      required: false,
      defaultValue: 3,
      helpText: '그리드/카드 템플릿 사용 시 열 개수 (2-4 권장)'
    },
    {
      name: 'orderby',
      label: '정렬 기준',
      type: 'select',
      required: false,
      options: [
        { label: '날짜', value: 'date' },
        { label: '제목', value: 'title' },
        { label: '수정일', value: 'modified' }
      ],
      defaultValue: 'date',
      helpText: '게시물 정렬 기준'
    },
    {
      name: 'order',
      label: '정렬 순서',
      type: 'select',
      required: false,
      options: [
        { label: '내림차순', value: 'DESC' },
        { label: '오름차순', value: 'ASC' }
      ],
      defaultValue: 'DESC',
      helpText: '정렬 방향'
    },
    {
      name: 'show_thumbnail',
      label: '썸네일 표시',
      type: 'boolean',
      required: false,
      defaultValue: true,
      helpText: '대표 이미지 표시 여부'
    },
    {
      name: 'show_excerpt',
      label: '요약 표시',
      type: 'boolean',
      required: false,
      defaultValue: true,
      helpText: '게시물 요약 표시 여부'
    },
    {
      name: 'show_meta',
      label: '메타 정보 표시',
      type: 'boolean',
      required: false,
      defaultValue: true,
      helpText: '날짜, 작성자 등 메타 정보 표시 여부'
    }
  ]
};