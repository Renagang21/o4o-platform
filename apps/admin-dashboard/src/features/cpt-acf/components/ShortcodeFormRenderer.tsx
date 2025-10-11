/**
 * Shortcode Form Renderer
 * Wrapper component for rendering forms via shortcode syntax
 * Usage: [cpt_form id="123"] or [cpt_form slug="contact-form"]
 */

import React from 'react';
import { FormRenderer } from './FormRenderer';

export interface ShortcodeFormProps {
  /** Shortcode attributes */
  attributes: {
    id?: string;
    slug?: string;
    showTitle?: string | boolean;
    showDescription?: string | boolean;
    className?: string;
  };
}

/**
 * Parse shortcode boolean attributes
 * Handles "true", "false", "1", "0", true, false
 */
const parseBoolean = (value: string | boolean | undefined, defaultValue: boolean = true): boolean => {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (value === 'false' || value === '0') return false;
  if (value === 'true' || value === '1') return true;
  return defaultValue;
};

export const ShortcodeFormRenderer: React.FC<ShortcodeFormProps> = ({ attributes }) => {
  const { id, slug, showTitle, showDescription, className } = attributes;

  // Parse boolean attributes
  const parsedShowTitle = parseBoolean(showTitle, true);
  const parsedShowDescription = parseBoolean(showDescription, true);

  return (
    <FormRenderer
      formId={id}
      formSlug={slug}
      showTitle={parsedShowTitle}
      showDescription={parsedShowDescription}
      className={className}
    />
  );
};

export default ShortcodeFormRenderer;
