/**
 * WordPress-style Shortcode Parser
 * Parses shortcodes in the format: [shortcode_name attr="value" attr2="value2"]
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
 */
export function parseShortcodeAttributes(attrString: string): Record<string, string> {
  const attributes: Record<string, string> = {};

  // Match attribute="value" or attribute='value' or attribute=value
  const attrRegex = /(\w+)=["']?([^"'\s]+)["']?/g;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    attributes[match[1]] = match[2];
  }

  return attributes;
}

/**
 * Parse a shortcode string
 * Supports both self-closing [shortcode] and enclosing [shortcode]content[/shortcode]
 */
export function parseShortcode(text: string, tag: string): ShortcodeMatch[] {
  const matches: ShortcodeMatch[] = [];

  // Self-closing shortcode: [tag attr="value"]
  const selfClosingRegex = new RegExp(
    `\\[${tag}([^\\]]*)\\]`,
    'gi'
  );

  // Enclosing shortcode: [tag attr="value"]content[/tag]
  const enclosingRegex = new RegExp(
    `\\[${tag}([^\\]]*)\\]([\\s\\S]*?)\\[\\/${tag}\\]`,
    'gi'
  );

  // Try enclosing format first
  let match;
  while ((match = enclosingRegex.exec(text)) !== null) {
    matches.push({
      tag,
      attributes: parseShortcodeAttributes(match[1]),
      content: match[2].trim(),
      fullMatch: match[0],
      index: match.index,
    });
  }

  // Then try self-closing format (only if no enclosing matches found at that position)
  while ((match = selfClosingRegex.exec(text)) !== null) {
    // Skip if already matched by enclosing regex
    const alreadyMatched = matches.some(m => m.index === match.index);
    if (!alreadyMatched) {
      matches.push({
        tag,
        attributes: parseShortcodeAttributes(match[1]),
        fullMatch: match[0],
        index: match.index,
      });
    }
  }

  // Sort by index
  return matches.sort((a, b) => a.index - b.index);
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
  const regex = new RegExp(`\\[${tag}[^\\]]*\\]`, 'i');
  return regex.test(text);
}

/**
 * Remove all shortcodes from text
 */
export function stripShortcodes(text: string): string {
  // Remove all [shortcode] and [shortcode]content[/shortcode] patterns
  return text
    .replace(/\[[\w-]+[^\]]*\][\s\S]*?\[\/[\w-]+\]/g, '') // Enclosing
    .replace(/\[[\w-]+[^\]]*\]/g, ''); // Self-closing
}

/**
 * Extract all shortcodes from text
 */
export function extractShortcodes(text: string): Array<{
  tag: string;
  attributes: Record<string, string>;
  content?: string;
}> {
  const shortcodes: Array<{
    tag: string;
    attributes: Record<string, string>;
    content?: string;
  }> = [];

  // Find all shortcodes (both self-closing and enclosing)
  const regex = /\[([\w-]+)([^\]]*)\](?:([^[]*)\[\/\1\])?/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    shortcodes.push({
      tag: match[1],
      attributes: parseShortcodeAttributes(match[2]),
      content: match[3] ? match[3].trim() : undefined,
    });
  }

  return shortcodes;
}
