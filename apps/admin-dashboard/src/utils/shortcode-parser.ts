/**
 * Admin Dashboard Shortcode Parser
 * MIGRATED TO USE @o4o/shortcodes package
 *
 * This file now acts as a compatibility wrapper for the Admin Dashboard.
 */

import {
  defaultParser,
  parseShortcodeAttributes as parseAttrs,
  hasShortcode as hasShortcodeInContent,
  stripShortcodes as stripAllShortcodes,
  extractShortcodes as extractAllShortcodes,
  ParsedShortcode,
  ShortcodeAttributes
} from '@o4o/shortcodes';

/**
 * Legacy ShortcodeMatch interface (for backward compatibility)
 */
export interface ShortcodeMatch {
  tag: string;
  attributes: Record<string, string>;
  content?: string;
  fullMatch: string;
  index: number;
}

/**
 * Parse attributes from shortcode string
 * Example: 'id="123" slug="contact" show_title="true"'
 *
 * @deprecated Use parseShortcodeAttributes from @o4o/shortcodes instead
 */
export function parseShortcodeAttributes(attrString: string): Record<string, string> {
  const attrs = parseAttrs(attrString);
  // Convert to string-only Record for backward compatibility
  const result: Record<string, string> = {};
  Object.entries(attrs).forEach(([key, value]) => {
    result[key] = String(value);
  });
  return result;
}

/**
 * Parse a shortcode string for a specific tag
 * Supports both self-closing [shortcode] and enclosing [shortcode]content[/shortcode]
 *
 * Uses @o4o/shortcodes parser internally
 */
export function parseShortcode(text: string, tag: string): ShortcodeMatch[] {
  // Use the official parser
  const allShortcodes = defaultParser.parse(text);

  // Filter by tag and convert to legacy format
  return allShortcodes
    .filter(s => s.name === tag)
    .map((s, idx) => {
      const index = text.indexOf(s.fullMatch);
      return {
        tag: s.name,
        attributes: convertToStringRecord(s.attributes),
        content: s.content,
        fullMatch: s.fullMatch,
        index: index !== -1 ? index : 0,
      };
    })
    .sort((a, b) => a.index - b.index);
}

/**
 * Convert ShortcodeAttributes to string-only Record
 */
function convertToStringRecord(attrs: ShortcodeAttributes): Record<string, string> {
  const result: Record<string, string> = {};
  Object.entries(attrs).forEach(([key, value]) => {
    result[key] = String(value);
  });
  return result;
}

/**
 * Replace shortcodes in text with rendered components
 * Returns an array of React elements and text nodes
 */
export function replaceShortcodes(
  text: string,
  tag: string,
  renderer: (match: ShortcodeMatch) => React.ReactNode
): (string | React.ReactNode)[] {
  const matches = parseShortcode(text, tag);

  if (matches.length === 0) {
    return [text];
  }

  const result: (string | React.ReactNode)[] = [];
  let lastIndex = 0;

  matches.forEach((match, i) => {
    // Add text before shortcode
    if (match.index > lastIndex) {
      result.push(text.substring(lastIndex, match.index));
    }

    // Add rendered shortcode
    result.push(renderer(match));

    lastIndex = match.index + match.fullMatch.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return result;
}

/**
 * Check if text contains a specific shortcode
 */
export function hasShortcode(text: string, tag: string): boolean {
  return hasShortcodeInContent(text, tag);
}

/**
 * Remove all shortcodes from text
 */
export function stripShortcodes(text: string): string {
  return stripAllShortcodes(text);
}

/**
 * Extract all shortcodes from text
 */
export function extractShortcodes(text: string): Array<{
  tag: string;
  attributes: Record<string, string>;
  content?: string;
}> {
  const shortcodes = extractAllShortcodes(text);

  // Convert to legacy format
  return shortcodes.map(s => ({
    tag: s.name,
    attributes: convertToStringRecord(s.attributes),
    content: s.content,
  }));
}
