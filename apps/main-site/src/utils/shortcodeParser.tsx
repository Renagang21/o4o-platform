/**
 * Main Site Shortcode Parser
 * MIGRATED TO USE @o4o/shortcodes package
 *
 * This file now acts as a compatibility layer and configuration hub
 * for the Main Site shortcode system.
 */

import { FC, ReactElement, cloneElement, Fragment, createElement } from 'react';
import DOMPurify from 'dompurify';
import {
  defaultParser,
  globalRegistry,
  registerShortcode,
  ShortcodeDefinition,
  ShortcodeProps,
  ParsedShortcode,
  ShortcodeAttributes,
  parseShortcodeAttributes
} from '@o4o/shortcodes';

// Re-export for backward compatibility
export { parseShortcodeAttributes, ShortcodeAttributes };

/**
 * Legacy ShortcodeHandler interface (for backward compatibility)
 * New code should use ShortcodeDefinition from @o4o/shortcodes
 */
export interface ShortcodeHandler {
  name: string;
  render: (attrs: ShortcodeAttributes, content?: string) => ReactElement | null;
}

/**
 * Legacy ShortcodeParser class (for backward compatibility)
 * Uses @o4o/shortcodes internally
 */
export class ShortcodeParser {
  /**
   * Register a legacy handler (converts to new format)
   */
  register(handler: ShortcodeHandler) {
    const definition: ShortcodeDefinition = {
      name: handler.name,
      component: ({ attributes, content }: ShortcodeProps) => {
        return handler.render(attributes, content);
      },
    };
    registerShortcode(definition);
  }

  /**
   * Register multiple handlers
   */
  registerMany(handlers: ShortcodeHandler[]) {
    handlers.forEach((handler: any) => this.register(handler));
  }

  /**
   * Parse content and replace shortcodes with React components
   */
  parse(content: string): React.ReactNode[] {
    const elements: React.ReactNode[] = [];

    // Use @o4o/shortcodes parser
    const shortcodes = defaultParser.parse(content);

    let lastIndex = 0;
    let keyIndex = 0;

    shortcodes.forEach((shortcode) => {
      const matchIndex = content.indexOf(shortcode.fullMatch, lastIndex);

      // Add any text before the shortcode
      if (matchIndex > lastIndex) {
        const textContent = content.slice(lastIndex, matchIndex);
        if (textContent.trim()) {
          elements.push(
            <span
              key={`text-${keyIndex++}`}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(textContent)
              }}
            />
          );
        }
      }

      // Process the shortcode
      const definition = globalRegistry.get(shortcode.name);
      if (definition) {
        const Component = definition.component;
        const element = (
          <Component
            key={`shortcode-${keyIndex++}`}
            attributes={shortcode.attributes}
            content={shortcode.content}
          />
        );
        elements.push(element);
      } else {
        // If no handler found, just show the shortcode as text
        elements.push(
          <span key={`unknown-${keyIndex++}`} className="text-gray-500">
            {shortcode.fullMatch}
          </span>
        );
      }

      lastIndex = matchIndex + shortcode.fullMatch.length;
    });

    // Add any remaining text after the last shortcode
    if (lastIndex < content.length) {
      const textContent = content.slice(lastIndex);
      if (textContent.trim()) {
        elements.push(
          <span
            key={`text-${keyIndex++}`}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(textContent)
            }}
          />
        );
      }
    }

    return elements;
  }

  /**
   * Parse content and return as a single React element
   */
  parseAsElement(content: string): ReactElement {
    const nodes = this.parse(content);
    return <>{nodes}</>;
  }

  /**
   * Get list of registered shortcodes
   */
  getRegisteredShortcodes(): string[] {
    return Array.from(globalRegistry.getAll().keys());
  }

  /**
   * Check if a shortcode is registered
   */
  hasShortcode(name: string): boolean {
    return globalRegistry.has(name);
  }
}

// Create a singleton instance (for backward compatibility)
export const shortcodeParser = new ShortcodeParser();

/**
 * Helper component to render parsed content
 */
export const ShortcodeContent: FC<{ content: string }> = ({ content }) => {
  const parsed = shortcodeParser.parseAsElement(content);
  return <div className="shortcode-content">{parsed}</div>;
};