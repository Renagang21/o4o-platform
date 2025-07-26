import React from 'react';
import DOMPurify from 'dompurify';

// Shortcode type definitions
export interface ShortcodeAttributes {
  [key: string]: string | number | boolean;
}

export interface ShortcodeHandler {
  name: string;
  render: (attrs: ShortcodeAttributes, content?: string) => ReactElement | null;
}

// Parse attributes from shortcode string
export function parseShortcodeAttributes(attrString: string): ShortcodeAttributes {
  const attrs: ShortcodeAttributes = {};
  
  // Match attribute patterns: key="value" or key='value' or key=value
  const regex = /(\w+)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
  let match;
  
  while ((match = regex.exec(attrString)) !== null) {
    const key = match[1];
    const value = match[2] || match[3] || match[4];
    
    // Try to parse as number or boolean
    if (value === 'true') {
      attrs[key] = true;
    } else if (value === 'false') {
      attrs[key] = false;
    } else if (!isNaN(Number(value))) {
      attrs[key] = Number(value);
    } else {
      attrs[key] = value;
    }
  }
  
  return attrs;
}

// Main shortcode parser class
export class ShortcodeParser {
  private handlers: Map<string, ShortcodeHandler> = new Map();

  // Register a shortcode handler
  register(handler: ShortcodeHandler) {
    this.handlers.set(handler.name, handler);
  }

  // Register multiple handlers
  registerMany(handlers: ShortcodeHandler[]) {
    handlers.forEach(handler => this.register(handler));
  }

  // Parse content and replace shortcodes with React components
  parse(content: string): ReactNode[] {
    const elements: ReactNode[] = [];
    
    // Regex to match shortcodes: [name attr="value"] or [name attr="value"]content[/name]
    const shortcodeRegex = /\[(\w+)([^\]]*)\](?:([^[]*)\[\/\1\])?/g;
    
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = shortcodeRegex.exec(content)) !== null) {
      const [fullMatch, shortcodeName, attributes, innerContent] = match;
      const matchIndex = match.index;

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
      const handler = this.handlers.get(shortcodeName);
      if (handler) {
        const attrs = parseShortcodeAttributes(attributes || '');
        const element = handler.render(attrs, innerContent);
        if (element) {
          elements.push(cloneElement(element, { key: `shortcode-${keyIndex++}` }));
        }
      } else {
        // If no handler found, just show the shortcode as text
        elements.push(
          <span key={`unknown-${keyIndex++}`} className="text-gray-500">
            {fullMatch}
          </span>
        );
      }

      lastIndex = matchIndex + fullMatch.length;
    }

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

  // Parse content and return as a single React element
  parseAsElement(content: string): ReactElement {
    const nodes = this.parse(content);
    return <>{nodes}</>;
  }

  // Get list of registered shortcodes
  getRegisteredShortcodes(): string[] {
    return Array.from(this.handlers.keys());
  }

  // Check if a shortcode is registered
  hasShortcode(name: string): boolean {
    return this.handlers.has(name);
  }
}

// Create a singleton instance
export const shortcodeParser = new ShortcodeParser();

// Helper component to render parsed content
export const ShortcodeContent: FC<{ content: string }> = ({ content }) => {
  const parsed = shortcodeParser.parseAsElement(content);
  return <div className="shortcode-content">{parsed}</div>;
};