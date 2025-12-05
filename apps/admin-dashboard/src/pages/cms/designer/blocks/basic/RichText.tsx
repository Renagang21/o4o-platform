/**
 * RichText Block - Formatted text with HTML
 */

import React from 'react';

export interface RichTextProps {
  html: string;
  maxWidth?: string;
  className?: string;
}

export default function RichText({
  html = '<p>Enter your rich text here. You can use <strong>bold</strong>, <em>italic</em>, and <a href="#">links</a>.</p>',
  maxWidth = '100%',
  className = '',
}: RichTextProps) {
  return (
    <div
      className={`prose prose-slate max-w-none ${className}`}
      style={{ maxWidth }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
