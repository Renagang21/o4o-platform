/**
 * Shortcode Renderer
 * Renders text content with shortcodes replaced by React components
 */

import React from 'react';
import { replaceShortcodes, type ShortcodeMatch } from '@/utils/shortcode-parser';
import { ShortcodeFormRenderer } from './ShortcodeFormRenderer';
import type { CustomField } from '../types/acf.types';

export interface ShortcodeRendererProps {
  /** Content containing shortcodes */
  content: string;
  /** ACF fields (for [acf] shortcode support) */
  fields?: CustomField[];
  /** ACF field values (for [acf] shortcode support) */
  values?: Record<string, any>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Render a cpt_form shortcode
 */
const renderFormShortcode = (match: ShortcodeMatch, index: number): React.ReactNode => {
  return (
    <div key={`cpt_form_${index}`} className="my-4">
      <ShortcodeFormRenderer
        attributes={{
          id: match.attributes.id,
          slug: match.attributes.slug,
          showTitle: match.attributes.show_title,
          showDescription: match.attributes.show_description,
          className: match.attributes.class || match.attributes.className,
        }}
      />
    </div>
  );
};

/**
 * Main Shortcode Renderer Component
 * Supports: [cpt_form] and [acf] shortcodes
 */
export const ShortcodeRenderer: React.FC<ShortcodeRendererProps> = ({
  content,
  fields,
  values,
  className = '',
}) => {
  let processed: (string | React.ReactNode)[] = [content];

  // Process cpt_form shortcodes
  processed = processed.flatMap((item, i) => {
    if (typeof item !== 'string') return item;
    const replaced = replaceShortcodes(item, 'cpt_form', (match) =>
      renderFormShortcode(match, i)
    );
    return replaced;
  });

  // Process acf shortcodes
  if (fields && values) {
    processed = processed.flatMap((item, i) => {
      if (typeof item !== 'string') return item;

      const replaced = replaceShortcodes(item, 'acf', (match) => {
        const fieldName = match.attributes.field || match.attributes.name;
        if (!fieldName) return null;

        const field = fields.find(f => f.name === fieldName || f.key === fieldName);
        const value = values[fieldName];

        if (value === null || value === undefined) {
          return match.attributes.default || null;
        }

        // Simple rendering for now (detailed rendering in ACFShortcodeRenderer)
        return (
          <span key={`acf_${i}_${fieldName}`} className="acf-field-value">
            {String(value)}
          </span>
        );
      });

      return replaced;
    });
  }

  return (
    <div className={`shortcode-content ${className}`}>
      {processed.map((item, index) => {
        if (typeof item === 'string') {
          return <span key={`text_${index}`}>{item}</span>;
        }
        return <React.Fragment key={index}>{item}</React.Fragment>;
      })}
    </div>
  );
};

export default ShortcodeRenderer;
