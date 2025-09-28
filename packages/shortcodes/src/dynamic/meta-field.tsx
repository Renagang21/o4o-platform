/**
 * Meta Field Shortcode Component
 * [meta_field key="_stock_status" default="재고 확인 중"]
 */

import React, { useEffect, useState } from 'react';
import { MetaFieldShortcodeAttributes, DynamicShortcodeContext } from './types';
import { ShortcodeProps } from '../types';

// Common meta field formatters
const formatMetaValue = (value: any, key: string, format?: string): string => {
  // Handle arrays
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  // Handle objects
  if (typeof value === 'object' && value !== null) {
    // If it's a serialized PHP object, try to parse
    if (value.data) {
      return formatMetaValue(value.data, key, format);
    }
    return JSON.stringify(value);
  }

  // Format based on key patterns or explicit format
  if (format === 'boolean' || key.includes('_is_') || key.includes('_has_')) {
    return value ? '예' : '아니오';
  }

  if (format === 'currency' || key.includes('_price') || key.includes('_cost') || key.includes('_amount')) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
      }).format(numValue);
    }
  }

  if (format === 'date' || key.includes('_date') || key.includes('_time')) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('ko-KR');
    }
  }

  if (format === 'number' || key.includes('_count') || key.includes('_qty') || key.includes('_quantity')) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return new Intl.NumberFormat('ko-KR').format(numValue);
    }
  }

  // Special WordPress meta keys
  switch (key) {
    case '_thumbnail_id':
      return `Image ID: ${value}`;
    case '_wp_page_template':
      return value === 'default' ? 'Default Template' : value;
    case '_edit_lock':
      const [, userId] = String(value).split(':');
      return `Locked by user ${userId}`;
    case '_stock_status':
      return value === 'instock' ? '재고 있음' : value === 'outofstock' ? '품절' : value;
    case '_visibility':
      return value === 'visible' ? '공개' : value === 'hidden' ? '비공개' : value;
    case '_featured':
      return value === 'yes' ? '추천' : '';
    case '_downloadable':
    case '_virtual':
      return value === 'yes' ? '예' : '아니오';
  }

  return String(value);
};

export const MetaFieldShortcode: React.FC<ShortcodeProps> = ({ attributes, context }) => {
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const attrs = attributes as unknown as MetaFieldShortcodeAttributes;
  const ctx = context as DynamicShortcodeContext;
  
  const metaKey = attrs.key;
  const postId = attrs.post_id || ctx?.postId || 'current';
  const single = attrs.single !== false; // Default to true

  useEffect(() => {
    const fetchMetaField = async () => {
      try {
        setLoading(true);
        
        if (!metaKey) {
          throw new Error('Meta key is required');
        }

        // If current post context has meta data
        if (postId === 'current' && context?.currentPost?.meta) {
          const metaData = context.currentPost.meta;
          const metaValue = metaData[metaKey];
          
          if (metaValue !== undefined) {
            setValue(single && Array.isArray(metaValue) ? metaValue[0] : metaValue);
          } else {
            // Meta key not found
            setValue(null);
          }
        } else {
          // Fetch from API
          const actualPostId = postId === 'current' ? ctx?.postId : postId;
          
          if (!actualPostId) {
            throw new Error('Unable to determine post ID');
          }

          const response = await fetch(`/api/posts/${actualPostId}/meta/${metaKey}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.status === 404) {
            // Meta key doesn't exist
            setValue(null);
          } else if (!response.ok) {
            throw new Error(`Failed to fetch meta field "${metaKey}"`);
          } else {
            const data = await response.json();
            setValue(single && Array.isArray(data.value) ? data.value[0] : data.value);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching meta field:', err);
        setError(err instanceof Error ? err.message : 'Failed to load meta field');
        setValue(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMetaField();
  }, [metaKey, postId, single, context]);

  if (loading) {
    return <span className="meta-field-loading">...</span>;
  }

  if (error) {
    if (attrs.default) {
      return <span className="meta-field-default">{attrs.default}</span>;
    }
    return (
      <span className="meta-field-error" title={error}>
        [meta:{metaKey}]
      </span>
    );
  }

  if (value === null || value === undefined || value === '') {
    if (attrs.default) {
      return <span className="meta-field-default">{attrs.default}</span>;
    }
    return null;
  }

  // Format the value
  const formattedValue = formatMetaValue(value, metaKey, attrs.format);

  // Special handling for certain meta keys that should render as elements
  if (metaKey === '_thumbnail_id' && value) {
    // Try to fetch and display the actual image
    return (
      <img 
        src={`/api/media/${value}`} 
        alt=""
        className={`meta-field-thumbnail ${attrs.class || ''}`}
        loading="lazy"
      />
    );
  }

  // Wrap in specified HTML element
  if (attrs.wrapper) {
    const Wrapper = attrs.wrapper as keyof JSX.IntrinsicElements;
    return (
      <Wrapper className={`meta-field meta-field--${metaKey.replace(/^_/, '')} ${attrs.class || ''}`}>
        {formattedValue}
      </Wrapper>
    );
  }

  return (
    <span className={`meta-field meta-field--${metaKey.replace(/^_/, '')} ${attrs.class || ''}`}>
      {formattedValue}
    </span>
  );
};

// Register shortcode
export const metaFieldShortcodeDefinition = {
  name: 'meta_field',
  component: MetaFieldShortcode,
  defaultAttributes: {
    single: true,
  },
  description: 'Display a WordPress meta field value',
  examples: [
    '[meta_field key="_stock_status" default="재고 확인 중"]',
    '[meta_field key="_price" format="currency"]',
    '[meta_field key="_thumbnail_id"]',
    '[meta_field key="custom_meta_key" post_id="123"]',
  ],
};