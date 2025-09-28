/**
 * CPT List Shortcode Component
 * [cpt_list type="ds_product" count="10" template="grid"]
 */

import React, { useEffect, useState } from 'react';
import { CPTListShortcodeAttributes, CPTPost } from './types';
import { ShortcodeProps } from '../types';
import { shortcodeCache, CACHE_CONFIG } from './cache';
import { ErrorMessage, Placeholder } from './components';

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
          meta: post.meta || {},
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
export const cptListShortcodeDefinition = {
  name: 'cpt_list',
  component: CPTListShortcode,
  defaultAttributes: {
    type: 'post',
    count: 10,
    template: 'default',
    show_thumbnail: true,
    show_excerpt: true,
    show_meta: true,
  },
  description: 'Display a list of CPT posts',
  example: '[cpt_list type="ds_product" count="6" template="grid" columns="3"]',
};