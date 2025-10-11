/**
 * Shortcode Renderer
 * Renders text content with shortcodes replaced by React components
 */

import React from 'react';
import { replaceShortcodes, type ShortcodeMatch } from '@/utils/shortcode-parser';
import { ShortcodeFormRenderer } from './ShortcodeFormRenderer';

export interface ShortcodeRendererProps {
  /** Content containing shortcodes */
  content: string;
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
 * Supports: [cpt_form] shortcode
 */
export const ShortcodeRenderer: React.FC<ShortcodeRendererProps> = ({
  content,
  className = '',
}) => {
  // Replace cpt_form shortcodes
  let processed: (string | React.ReactNode)[] = [content];

  // Process cpt_form shortcodes
  processed = processed.flatMap((item, i) => {
    if (typeof item !== 'string') return item;

    const replaced = replaceShortcodes(item, 'cpt_form', (match) =>
      renderFormShortcode(match, i)
    );

    return replaced;
  });

  return (
    <div className={`shortcode-content ${className}`}>
      {processed.map((item, index) => {
        if (typeof item === 'string') {
          // Preserve whitespace and line breaks
          return (
            <span
              key={`text_${index}`}
              dangerouslySetInnerHTML={{ __html: item }}
            />
          );
        }
        return <React.Fragment key={index}>{item}</React.Fragment>;
      })}
    </div>
  );
};

export default ShortcodeRenderer;
