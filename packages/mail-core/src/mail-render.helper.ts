/**
 * Mail Render Helper — Pure rendering utility functions
 *
 * WO-O4O-MAIL-SERVICE-SPLIT-V1
 * Extracted from mail.service.ts
 *
 * Functions:
 *   htmlToText            — Strip HTML tags to plain text
 *   replaceTemplatePlaceholders — Replace {{key}} placeholders in template string
 *   removeConditionalBlocks    — Remove {{#if field}}...{{/if}} blocks for empty fields
 */

/**
 * Convert HTML to plain text by stripping tags, styles, and scripts
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Replace {{key}} placeholders in a template string with values from data
 */
export function replaceTemplatePlaceholders(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  return result;
}

/**
 * Remove {{#if field}}...{{/if}} conditional blocks for fields that are empty
 */
export function removeConditionalBlocks(html: string, emptyFields: string[]): string {
  let result = html;
  for (const field of emptyFields) {
    result = result.replace(new RegExp(`{{#if ${field}}}[\\s\\S]*?{{\\/if}}`, 'g'), '');
  }
  return result;
}
