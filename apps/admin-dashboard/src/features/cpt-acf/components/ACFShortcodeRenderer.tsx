/**
 * ACF Shortcode Renderer
 * Renders [acf field="field_name"] shortcodes with field values
 */

import React from 'react';
import { replaceShortcodes, type ShortcodeMatch } from '@/utils/shortcode-parser';
import type { CustomField, LinkValue, RepeaterRow } from '../types/acf.types';

export interface ACFShortcodeRendererProps {
  /** Content containing [acf] shortcodes */
  content: string;
  /** Field definitions for this content */
  fields?: CustomField[];
  /** Field values for this content */
  values?: Record<string, any>;
  /** Current post/page context */
  postId?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Render a Link field value
 */
const renderLinkField = (value: LinkValue | null): React.ReactNode => {
  if (!value || !value.url) return null;

  return (
    <a
      href={value.url}
      target={value.target || '_self'}
      rel={value.target === '_blank' ? 'noopener noreferrer' : undefined}
      className="acf-link text-blue-600 hover:underline"
    >
      {value.title || value.url}
    </a>
  );
};

/**
 * Render an Image field value
 */
const renderImageField = (value: any, alt?: string): React.ReactNode => {
  if (!value) return null;

  // Handle different image value formats
  const src = typeof value === 'string' ? value : value.url || value.src;
  const imageAlt = alt || value.alt || value.title || '';

  if (!src) return null;

  return (
    <img
      src={src}
      alt={imageAlt}
      className="acf-image max-w-full h-auto"
    />
  );
};

/**
 * Render a Repeater field value
 */
const renderRepeaterField = (
  value: RepeaterRow[] | null,
  field?: CustomField
): React.ReactNode => {
  if (!value || !Array.isArray(value) || value.length === 0) return null;

  const subFields = field?.subFields || [];

  return (
    <div className="acf-repeater space-y-2">
      {value.map((row, index) => (
        <div key={row._id || index} className="acf-repeater-row p-3 border rounded-md">
          {subFields.map(subField => {
            const subValue = row[subField.name];
            if (!subValue) return null;

            return (
              <div key={subField.name} className="acf-repeater-field">
                <span className="font-medium">{subField.label}: </span>
                <span>{String(subValue)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/**
 * Render a Relationship/Post Object field value
 */
const renderRelationshipField = (value: any): React.ReactNode => {
  if (!value) return null;

  // Handle single post
  if (typeof value === 'object' && !Array.isArray(value)) {
    const post = value;
    return (
      <a
        href={`/posts/${post.id}`}
        className="acf-relationship-link text-blue-600 hover:underline"
      >
        {post.title || `Post #${post.id}`}
      </a>
    );
  }

  // Handle array of posts
  if (Array.isArray(value)) {
    return (
      <ul className="acf-relationship-list list-disc list-inside">
        {value.map((post, index) => (
          <li key={post.id || index}>
            <a
              href={`/posts/${post.id}`}
              className="acf-relationship-link text-blue-600 hover:underline"
            >
              {post.title || `Post #${post.id}`}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return String(value);
};

/**
 * Render a field value based on field type
 */
const renderFieldValue = (
  field: CustomField | undefined,
  value: any,
  attributes: Record<string, string>
): React.ReactNode => {
  if (value === null || value === undefined) {
    return attributes.default || null;
  }

  if (!field) {
    // No field definition, render as text
    return String(value);
  }

  switch (field.type) {
    case 'link':
      return renderLinkField(value as LinkValue);

    case 'image':
      return renderImageField(value, attributes.alt);

    case 'gallery':
      if (!Array.isArray(value)) return null;
      return (
        <div className="acf-gallery grid grid-cols-2 md:grid-cols-3 gap-2">
          {value.map((img, index) => (
            <div key={index}>
              {renderImageField(img)}
            </div>
          ))}
        </div>
      );

    case 'repeater':
      return renderRepeaterField(value as RepeaterRow[], field);

    case 'relationship':
    case 'post_object':
      return renderRelationshipField(value);

    case 'true_false':
      return value ? 'Yes' : 'No';

    case 'select':
    case 'radio':
      // Try to find label from choices
      if (Array.isArray(field.choices)) {
        const choice = field.choices.find(c => c.value === value);
        return choice?.label || String(value);
      }
      return String(value);

    case 'checkbox':
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);

    case 'wysiwyg':
      // Render HTML content
      // WARNING: Ensure content is sanitized on the server to prevent XSS attacks
      return (
        <div
          className="acf-wysiwyg prose"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      );

    case 'textarea':
      // Preserve line breaks
      return (
        <div className="acf-textarea whitespace-pre-wrap">
          {value}
        </div>
      );

    case 'url':
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {value}
        </a>
      );

    case 'email':
      return (
        <a
          href={`mailto:${value}`}
          className="text-blue-600 hover:underline"
        >
          {value}
        </a>
      );

    default:
      // Default: render as text
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return '[Complex Object]';
        }
      }
      return String(value);
  }
};

/**
 * Render an [acf] shortcode
 */
const renderACFShortcode = (
  match: ShortcodeMatch,
  index: number,
  fields?: CustomField[],
  values?: Record<string, any>
): React.ReactNode => {
  const fieldName = match.attributes.field || match.attributes.name;

  if (!fieldName) {
    console.warn('[acf] shortcode missing field attribute');
    return null;
  }

  // Find field definition
  const field = fields?.find(f => f.name === fieldName || f.key === fieldName);

  // Get field value
  const value = values?.[fieldName];

  // Render value
  const rendered = renderFieldValue(field, value, match.attributes);

  if (!rendered) return null;

  return (
    <span key={`acf_${index}`} className="acf-shortcode-output">
      {rendered}
    </span>
  );
};

/**
 * Main ACF Shortcode Renderer Component
 * Replaces [acf field="field_name"] shortcodes with rendered field values
 */
export const ACFShortcodeRenderer: React.FC<ACFShortcodeRendererProps> = ({
  content,
  fields,
  values,
  postId,
  className = '',
}) => {
  // Replace [acf] shortcodes
  let index = 0;
  const processed = replaceShortcodes(content, 'acf', (match) => {
    const result = renderACFShortcode(match, index++, fields, values);
    return result;
  });

  return (
    <div className={`acf-shortcode-content ${className}`}>
      {processed.map((item, index) => {
        if (typeof item === 'string') {
          return <span key={`text_${index}`}>{item}</span>;
        }
        return <React.Fragment key={index}>{item}</React.Fragment>;
      })}
    </div>
  );
};

export default ACFShortcodeRenderer;
