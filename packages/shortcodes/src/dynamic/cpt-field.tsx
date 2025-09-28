/**
 * CPT Field Shortcode Component
 * [cpt_field field="title"] or [cpt_field post_type="ds_product" post_id="123" field="price"]
 */

import React, { useEffect, useState } from 'react';
import { CPTFieldShortcodeAttributes, DynamicShortcodeContext } from './types';
import { ShortcodeProps } from '../types';

// Field formatters
const formatters: Record<string, (value: any, format?: string) => string> = {
  date: (value, format) => {
    const date = new Date(value);
    if (format === 'relative') {
      const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });
      const diff = (date.getTime() - Date.now()) / 1000;
      if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second');
      if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
      if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
      return rtf.format(Math.round(diff / 86400), 'day');
    }
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },
  
  currency: (value) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(value);
  },
  
  number: (value, format) => {
    if (format === 'comma') {
      return new Intl.NumberFormat('ko-KR').format(value);
    }
    return String(value);
  },
  
  excerpt: (value, format) => {
    const length = format ? parseInt(format) : 100;
    if (value.length <= length) return value;
    return value.substring(0, length) + '...';
  },
  
  default: (value) => String(value || '')
};

export const CPTFieldShortcode: React.FC<ShortcodeProps> = ({ attributes, context }) => {
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const attrs = attributes as unknown as CPTFieldShortcodeAttributes;
  const ctx = context as DynamicShortcodeContext;
  
  // Determine post ID and type
  const postId = attrs.post_id || ctx?.postId || 'current';
  const postType = attrs.post_type || ctx?.postType || 'post';
  const field = attrs.field;
  
  useEffect(() => {
    const fetchFieldValue = async () => {
      try {
        setLoading(true);
        
        // If it's the current post context and we have the data
        if (postId === 'current' && context?.currentPost) {
          const currentPost = context.currentPost;
          
          // Get field value from current post
          let fieldValue;
          switch (field) {
            case 'title':
              fieldValue = currentPost.title;
              break;
            case 'content':
              fieldValue = currentPost.content;
              break;
            case 'excerpt':
              fieldValue = currentPost.excerpt;
              break;
            case 'date':
              fieldValue = currentPost.date || currentPost.createdAt;
              break;
            case 'modified':
              fieldValue = currentPost.modified || currentPost.updatedAt;
              break;
            case 'author':
              fieldValue = currentPost.author?.name || 'Unknown';
              break;
            case 'author_email':
              fieldValue = currentPost.author?.email || '';
              break;
            case 'status':
              fieldValue = currentPost.status;
              break;
            case 'slug':
              fieldValue = currentPost.slug;
              break;
            case 'featured_image':
            case 'thumbnail':
              fieldValue = currentPost.featuredImage || currentPost.thumbnail;
              break;
            default:
              // Check in meta or custom fields
              fieldValue = currentPost.meta?.[field] || 
                          currentPost.customFields?.[field] || 
                          currentPost[field];
          }
          
          setValue(fieldValue);
        } else {
          // Fetch from API for specific post
          const response = await fetch(`/api/cpt/${postType}/posts/${postId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch post ${postId}`);
          }

          const data = await response.json();
          const post = data.data || data;
          
          // Extract field value
          let fieldValue;
          switch (field) {
            case 'title':
              fieldValue = post.title;
              break;
            case 'content':
              fieldValue = post.content;
              break;
            case 'excerpt':
              fieldValue = post.excerpt;
              break;
            case 'date':
              fieldValue = post.createdAt || post.date;
              break;
            case 'modified':
              fieldValue = post.updatedAt || post.modified;
              break;
            case 'author':
              fieldValue = post.author?.name || 'Unknown';
              break;
            case 'author_email':
              fieldValue = post.author?.email || '';
              break;
            case 'status':
              fieldValue = post.status;
              break;
            case 'slug':
              fieldValue = post.slug;
              break;
            case 'featured_image':
            case 'thumbnail':
              fieldValue = post.featuredImage || post.thumbnail;
              break;
            default:
              // Check in meta or custom fields
              fieldValue = post.meta?.[field] || 
                          post.customFields?.[field] || 
                          post[field];
          }
          
          setValue(fieldValue);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching CPT field:', err);
        setError(err instanceof Error ? err.message : 'Failed to load field');
        setValue(null);
      } finally {
        setLoading(false);
      }
    };

    if (field) {
      fetchFieldValue();
    } else {
      setError('Field name is required');
      setLoading(false);
    }
  }, [postId, postType, field, context]);

  if (loading) {
    return <span className="cpt-field-loading">...</span>;
  }

  if (error) {
    if (attrs.default) {
      return <span className="cpt-field-default">{attrs.default}</span>;
    }
    return (
      <span className="cpt-field-error" title={error}>
        [{field}]
      </span>
    );
  }

  if (value === null || value === undefined) {
    if (attrs.default) {
      return <span className="cpt-field-default">{attrs.default}</span>;
    }
    return null;
  }

  // Format the value
  let formattedValue = value;
  
  // Apply formatter based on field type or format attribute
  if (attrs.format) {
    const formatter = formatters[attrs.format] || formatters.default;
    formattedValue = formatter(value, attrs.format);
  } else {
    // Auto-detect format based on field name
    if (field === 'date' || field === 'modified' || field.includes('_date')) {
      formattedValue = formatters.date(value);
    } else if (field === 'price' || field.includes('_price') || field.includes('_cost')) {
      formattedValue = formatters.currency(value);
    } else if (field === 'excerpt') {
      formattedValue = formatters.excerpt(value);
    } else if (field === 'featured_image' || field === 'thumbnail') {
      // Return image element
      formattedValue = (
        <img 
          src={value} 
          alt="" 
          className={`cpt-field-image ${attrs.class || ''}`}
          loading="lazy"
        />
      );
    } else {
      formattedValue = formatters.default(value);
    }
  }

  // Wrap in specified HTML element
  if (attrs.wrapper) {
    const Wrapper = attrs.wrapper as keyof JSX.IntrinsicElements;
    return (
      <Wrapper className={`cpt-field cpt-field--${field} ${attrs.class || ''}`}>
        {formattedValue}
      </Wrapper>
    );
  }

  // Return formatted value
  if (React.isValidElement(formattedValue)) {
    return formattedValue;
  }

  return (
    <span className={`cpt-field cpt-field--${field} ${attrs.class || ''}`}>
      {formattedValue}
    </span>
  );
};

// Register shortcode
export const cptFieldShortcodeDefinition = {
  name: 'cpt_field',
  component: CPTFieldShortcode,
  defaultAttributes: {
    field: 'title',
  },
  description: 'Display a CPT post field value',
  examples: [
    '[cpt_field field="title"]',
    '[cpt_field field="price" format="currency"]',
    '[cpt_field post_type="ds_product" post_id="123" field="stock_status" default="재고 없음"]',
  ],
};