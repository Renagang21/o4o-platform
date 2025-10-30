/**
 * ACF Field Shortcode Component
 * [acf_field name="custom_price" format="currency"]
 */

import React, { useEffect, useState, createElement } from 'react';
import { ACFFieldShortcodeAttributes, ACFFieldValue, DynamicShortcodeContext } from './types.js';
import { ShortcodeProps } from '../types.js';

// ACF field type formatters
const formatACFValue = (value: any, type?: string, format?: string, attributes?: ACFFieldShortcodeAttributes): React.ReactNode => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return attributes?.default || '';
  }

  // Format based on field type
  switch (type) {
    case 'image':
      if (typeof value === 'object' && value.url) {
        const size = attributes?.size || 'full';
        const imageUrl = value.sizes?.[size]?.url || value.url;
        return (
          <img 
            src={imageUrl}
            alt={value.alt || ''}
            title={value.title || ''}
            className={`acf-field-image ${attributes?.class || ''}`}
            loading="lazy"
          />
        );
      }
      return <img src={value} alt="" className={`acf-field-image ${attributes?.class || ''}`} loading="lazy" />;

    case 'gallery':
      if (Array.isArray(value)) {
        return (
          <div className={`acf-field-gallery ${attributes?.class || ''}`}>
            {value.map((img: any, index: number) => (
              <img 
                key={index}
                src={img.url || img}
                alt={img.alt || ''}
                className="acf-gallery-image"
                loading="lazy"
              />
            ))}
          </div>
        );
      }
      return null;

    case 'date_picker':
    case 'date_time_picker':
      const date = new Date(value);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...(type === 'date_time_picker' && {
          hour: '2-digit',
          minute: '2-digit'
        })
      });

    case 'time_picker':
      return value; // Already formatted from ACF

    case 'true_false':
      return value ? '예' : '아니오';

    case 'select':
    case 'radio':
      if (typeof value === 'object' && value.label) {
        return value.label;
      }
      return value;

    case 'checkbox':
      if (Array.isArray(value)) {
        const separator = attributes?.separator || ', ';
        return value.map(v => v.label || v).join(separator);
      }
      return value;

    case 'relationship':
    case 'post_object':
      if (Array.isArray(value)) {
        return (
          <ul className={`acf-field-posts ${attributes?.class || ''}`}>
            {value.map((post: any) => (
              <li key={post.ID || post.id}>
                <a href={post.permalink || `/cpt-engine/content/post/${post.ID || post.id}`}>
                  {post.post_title || post.title}
                </a>
              </li>
            ))}
          </ul>
        );
      }
      if (typeof value === 'object' && value.post_title) {
        return (
          <a href={value.permalink || `/cpt-engine/content/post/${value.ID}`}>
            {value.post_title}
          </a>
        );
      }
      return value;

    case 'user':
      if (typeof value === 'object') {
        return value.display_name || value.name || value.user_nicename;
      }
      return value;

    case 'taxonomy':
      if (Array.isArray(value)) {
        const separator = attributes?.separator || ', ';
        return value.map(term => term.name || term).join(separator);
      }
      if (typeof value === 'object' && value.name) {
        return value.name;
      }
      return value;

    case 'repeater':
      if (Array.isArray(value)) {
        return (
          <div className={`acf-field-repeater ${attributes?.class || ''}`}>
            {value.map((row: any, index: number) => (
              <div key={index} className="acf-repeater-row">
                {Object.entries(row).map(([key, val]) => (
                  <div key={key} className="acf-repeater-field">
                    <span className="field-label">{key}: </span>
                    <span className="field-value">{String(val)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      }
      return null;

    case 'url':
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className={attributes?.class || ''}>
          {value}
        </a>
      );

    case 'email':
      return (
        <a href={`mailto:${value}`} className={attributes?.class || ''}>
          {value}
        </a>
      );

    case 'number':
      if (format === 'currency' || attributes?.name?.includes('price') || attributes?.name?.includes('cost')) {
        return new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency: 'KRW'
        }).format(value);
      }
      if (format === 'comma') {
        return new Intl.NumberFormat('ko-KR').format(value);
      }
      return value;

    case 'wysiwyg':
    case 'textarea':
      if (format === 'html' || type === 'wysiwyg') {
        return <div dangerouslySetInnerHTML={{ __html: value }} className={attributes?.class || ''} />;
      }
      return value;

    default:
      return String(value);
  }
};

export const ACFFieldShortcode: React.FC<ShortcodeProps> = ({ attributes, context }) => {
  const [fieldData, setFieldData] = useState<ACFFieldValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const attrs = attributes as unknown as ACFFieldShortcodeAttributes;
  const ctx = context as DynamicShortcodeContext;
  
  const fieldName = attrs.name;
  const postId = attrs.post_id || ctx?.postId || 'current';

  useEffect(() => {
    const fetchACFField = async () => {
      try {
        setLoading(true);
        
        if (!fieldName) {
          throw new Error('Field name is required');
        }

        // If current post context has ACF data
        if (postId === 'current' && context?.currentPost?.acf) {
          const acfData = context.currentPost.acf;
          const value = acfData[fieldName];
          
          if (value !== undefined) {
            setFieldData({
              value,
              type: attrs.type || 'text',
              formatted: String(value),
            });
          } else {
            throw new Error(`ACF field "${fieldName}" not found`);
          }
        } else {
          // Fetch from API
          const actualPostId = postId === 'current' ? ctx?.postId : postId;
          
          if (!actualPostId) {
            throw new Error('Unable to determine post ID');
          }

          const response = await fetch(`/api/acf/fields/${fieldName}/value?post_id=${actualPostId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch ACF field "${fieldName}"`);
          }

          const data = await response.json();
          
          setFieldData({
            value: data.value,
            type: data.type || attrs.type || 'text',
            formatted: data.formatted || String(data.value),
          });
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching ACF field:', err);
        setError(err instanceof Error ? err.message : 'Failed to load ACF field');
        setFieldData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchACFField();
  }, [fieldName, postId, context, attrs.type]);

  if (loading) {
    return <span className="acf-field-loading">...</span>;
  }

  if (error) {
    if (attrs.default) {
      return <span className="acf-field-default">{attrs.default}</span>;
    }
    return (
      <span className="acf-field-error" title={error}>
        [acf:{fieldName}]
      </span>
    );
  }

  if (!fieldData || fieldData.value === null || fieldData.value === undefined) {
    if (attrs.default) {
      return <span className="acf-field-default">{attrs.default}</span>;
    }
    return null;
  }

  // Format the value
  const formattedContent = formatACFValue(
    fieldData.value,
    fieldData.type,
    attrs.format,
    attrs
  );

  // Wrap in specified HTML element
  if (attrs.wrapper) {
    const wrapperTag = attrs.wrapper as keyof React.JSX.IntrinsicElements;
    return createElement(
      wrapperTag,
      {
        className: `acf-field acf-field--${fieldName} acf-type--${fieldData.type} ${attrs.class || ''}`
      },
      formattedContent
    );
  }

  // Return formatted value
  if (React.isValidElement(formattedContent)) {
    return formattedContent;
  }

  return (
    <span className={`acf-field acf-field--${fieldName} acf-type--${fieldData.type} ${attrs.class || ''}`}>
      {formattedContent}
    </span>
  );
};

// Register shortcode
export const acfFieldShortcodeDefinition = {
  name: 'acf_field',
  component: ACFFieldShortcode,
  defaultAttributes: {
    format: 'formatted',
  },
  description: 'Display an ACF field value',
  examples: [
    '[acf_field name="custom_price" format="currency"]',
    '[acf_field name="product_gallery" type="gallery"]',
    '[acf_field name="featured_video" default="No video available"]',
    '[acf_field name="supplier_info" post_id="123"]',
  ],
};