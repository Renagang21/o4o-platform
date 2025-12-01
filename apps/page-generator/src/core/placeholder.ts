/**
 * Placeholder Block Strategy
 * Preserves unmappable components as placeholder blocks instead of deleting them
 */

import { v4 as uuidv4 } from 'uuid';
import type { ReactElement, Block } from './types';

/**
 * Create a placeholder block for unmappable components
 * Preserves layout structure and original JSX code
 */
export function createPlaceholderBlock(element: ReactElement): Block {
  return {
    id: uuidv4(),
    type: 'o4o/placeholder',
    attributes: {
      componentName: element.type,
      reason: '기존 O4O 블록으로 매핑할 수 없는 커스텀 컴포넌트입니다.',
      notes: serializeJSX(element), // Preserve original JSX
      props: serializeProps(element.props),
    },
  };
}

/**
 * Serialize React Element to JSX string
 * Example: { type: 'Carousel', props: { items: [...] }, children: [] }
 *       → "<Carousel items={[...]}></Carousel>"
 */
export function serializeJSX(element: ReactElement): string {
  const { type, props, children } = element;

  // Build props string
  const propsStr = Object.entries(props)
    .map(([key, value]) => {
      if (key === 'children') return '';
      if (typeof value === 'string') return `${key}="${value}"`;
      if (typeof value === 'number') return `${key}={${value}}`;
      if (typeof value === 'boolean') return value ? key : '';
      // Complex values (objects, arrays, functions)
      return `${key}={${serializeValue(value)}}`;
    })
    .filter(Boolean)
    .join(' ');

  // Recursively serialize children
  const childrenStr = children
    .map((child) => (typeof child === 'string' ? child : serializeJSX(child)))
    .join('');

  // Self-closing tag if no children
  if (!childrenStr) {
    return `<${type}${propsStr ? ' ' + propsStr : ''} />`;
  }

  return `<${type}${propsStr ? ' ' + propsStr : ''}>${childrenStr}</${type}>`;
}

/**
 * Serialize props for storage
 * Converts functions and complex objects to readable strings
 */
function serializeProps(props: Record<string, any>): Record<string, any> {
  const serialized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children') continue;

    if (typeof value === 'function') {
      serialized[key] = '[function]';
    } else if (typeof value === 'object' && value !== null) {
      try {
        serialized[key] = JSON.stringify(value);
      } catch (e) {
        serialized[key] = '[object]';
      }
    } else {
      serialized[key] = value;
    }
  }

  return serialized;
}

/**
 * Serialize a value to string for JSX representation
 */
function serializeValue(value: any): string {
  if (typeof value === 'function') {
    return '[function]';
  }

  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[object]';
    }
  }

  return String(value);
}

/**
 * Check if a component should be converted to placeholder
 * Returns true for non-standard HTML elements (custom components)
 */
export function shouldCreatePlaceholder(elementType: string): boolean {
  const standardElements = [
    'div',
    'span',
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'button',
    'a',
    'img',
    'ul',
    'ol',
    'li',
    'section',
    'article',
    'header',
    'footer',
    'nav',
    'main',
    'aside',
    'blockquote',
    'code',
    'pre',
    'strong',
    'em',
    'small',
  ];

  return !standardElements.includes(elementType.toLowerCase());
}

/**
 * Extract placeholder summary from blocks
 * Returns list of placeholder components for user notification
 */
export function extractPlaceholders(blocks: Block[]): Array<{
  componentName: string;
  count: number;
}> {
  const placeholderMap = new Map<string, number>();

  function traverse(block: Block) {
    if (block.type === 'o4o/placeholder') {
      const name = block.attributes.componentName;
      placeholderMap.set(name, (placeholderMap.get(name) || 0) + 1);
    }

    if (block.innerBlocks) {
      block.innerBlocks.forEach(traverse);
    }
  }

  blocks.forEach(traverse);

  return Array.from(placeholderMap.entries()).map(([componentName, count]) => ({
    componentName,
    count,
  }));
}
