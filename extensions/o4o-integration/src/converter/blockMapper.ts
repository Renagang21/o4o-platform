import { v4 as uuidv4 } from 'uuid';
import { Block } from '../types';
import * as TailwindParser from './tailwindParser';

/**
 * React Element Interface (simplified)
 */
export interface ReactElement {
  type: string;
  props: {
    className?: string;
    src?: string;
    alt?: string;
    href?: string;
    onClick?: any;
    width?: number;
    height?: number;
    [key: string]: any;
  };
  children: (string | ReactElement)[];
}

/**
 * Extract text content from React children
 */
function extractTextContent(children: (string | ReactElement)[]): string {
  return children
    .map((child) => (typeof child === 'string' ? child : extractTextContent(child.children || [])))
    .join('');
}

/**
 * Serialize React element to JSX string (for placeholder blocks)
 */
function serializeJSX(element: ReactElement): string {
  const { type, props, children } = element;
  const propsStr = Object.entries(props)
    .map(([key, value]) => {
      if (key === 'children') return '';
      if (typeof value === 'string') return `${key}="${value}"`;
      if (typeof value === 'number') return `${key}={${value}}`;
      return `${key}={${JSON.stringify(value)}}`;
    })
    .filter(Boolean)
    .join(' ');

  const childrenStr = children.map((child) =>
    typeof child === 'string' ? child : serializeJSX(child)
  ).join('');

  return `<${type}${propsStr ? ' ' + propsStr : ''}>${childrenStr}</${type}>`;
}

/**
 * Map React element to O4O Block
 * This is the core conversion logic
 */
export function mapReactElementToBlock(element: ReactElement): Block {
  const blockId = uuidv4();
  const className = element.props.className || '';

  switch (element.type) {
    // Heading blocks (h1-h6)
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return {
        id: blockId,
        type: 'o4o/heading',
        attributes: {
          content: extractTextContent(element.children),
          level: parseInt(element.type.slice(1)),
          align: TailwindParser.parseTextAlign(className),
          fontSize: TailwindParser.parseFontSize(className),
          textColor: TailwindParser.parseTextColor(className),
          backgroundColor: TailwindParser.parseBackgroundColor(className),
        },
      };

    // Paragraph block
    case 'p':
      return {
        id: blockId,
        type: 'o4o/paragraph',
        attributes: {
          content: extractTextContent(element.children),
          align: TailwindParser.parseTextAlign(className),
          fontSize: TailwindParser.parseFontSize(className),
          textColor: TailwindParser.parseTextColor(className),
          backgroundColor: TailwindParser.parseBackgroundColor(className),
        },
      };

    // Image block
    case 'img':
      return {
        id: blockId,
        type: 'o4o/image',
        attributes: {
          url: element.props.src || '',
          alt: element.props.alt || '',
          width: element.props.width,
          height: element.props.height,
          align: TailwindParser.parseTextAlign(className),
        },
      };

    // Button block
    case 'button':
      return {
        id: blockId,
        type: 'o4o/button',
        attributes: {
          text: extractTextContent(element.children),
          url: element.props.onClick ? '#' : (element.props.href || ''),
          backgroundColor: TailwindParser.parseBackgroundColor(className),
          textColor: TailwindParser.parseTextColor(className),
          borderRadius: TailwindParser.parseBorderRadius(className),
          fontSize: TailwindParser.parseFontSize(className),
        },
      };

    // Div - complex mapping based on Tailwind classes
    case 'div':
      // Grid layout -> o4o/columns
      if (TailwindParser.hasGrid(className)) {
        const columnCount = TailwindParser.parseGridColumns(className);
        const innerBlocks = element.children
          .filter((child): child is ReactElement => typeof child !== 'string')
          .map((child, index) => ({
            id: uuidv4(),
            type: 'o4o/column',
            attributes: {
              width: 100 / columnCount,
            },
            innerBlocks: typeof child === 'string' ? [] : [mapReactElementToBlock(child)],
          }));

        return {
          id: blockId,
          type: 'o4o/columns',
          attributes: {
            columnCount,
            isStackedOnMobile: true,
          },
          innerBlocks,
        };
      }

      // Flex layout -> o4o/group
      if (TailwindParser.hasFlex(className)) {
        const innerBlocks = element.children
          .filter((child): child is ReactElement => typeof child !== 'string')
          .map((child) => mapReactElementToBlock(child));

        return {
          id: blockId,
          type: 'o4o/group',
          attributes: {
            layout: 'flex',
            flexDirection: TailwindParser.parseFlexDirection(className),
            gap: TailwindParser.parseGap(className),
            justifyContent: TailwindParser.parseJustifyContent(className),
            alignItems: TailwindParser.parseAlignItems(className),
            backgroundColor: TailwindParser.parseBackgroundColor(className),
            padding: TailwindParser.parsePadding(className),
            borderRadius: TailwindParser.parseBorderRadius(className),
          },
          innerBlocks,
        };
      }

      // Regular div -> o4o/group
      const innerBlocks = element.children
        .filter((child): child is ReactElement => typeof child !== 'string')
        .map((child) => mapReactElementToBlock(child));

      return {
        id: blockId,
        type: 'o4o/group',
        attributes: {
          layout: 'flow',
          backgroundColor: TailwindParser.parseBackgroundColor(className),
          padding: TailwindParser.parsePadding(className),
          borderRadius: TailwindParser.parseBorderRadius(className),
        },
        innerBlocks: innerBlocks.length > 0 ? innerBlocks : undefined,
      };

    // Unordered list
    case 'ul':
      return {
        id: blockId,
        type: 'o4o/list',
        attributes: {
          type: 'unordered',
          content: extractTextContent(element.children),
        },
      };

    // Ordered list
    case 'ol':
      return {
        id: blockId,
        type: 'o4o/list',
        attributes: {
          type: 'ordered',
          content: extractTextContent(element.children),
        },
      };

    // Blockquote -> o4o/quote
    case 'blockquote':
      return {
        id: blockId,
        type: 'o4o/quote',
        attributes: {
          quote: extractTextContent(element.children),
          align: TailwindParser.parseTextAlign(className),
        },
      };

    // Anchor -> treat as button if it looks like a button
    case 'a':
      // If styled like a button, map to button block
      if (className && (className.includes('btn') || className.includes('button'))) {
        return {
          id: blockId,
          type: 'o4o/button',
          attributes: {
            text: extractTextContent(element.children),
            url: element.props.href || '#',
            backgroundColor: TailwindParser.parseBackgroundColor(className),
            textColor: TailwindParser.parseTextColor(className),
          },
        };
      }

      // Otherwise, embed in paragraph (simplified)
      return {
        id: blockId,
        type: 'o4o/paragraph',
        attributes: {
          content: `<a href="${element.props.href || '#'}">${extractTextContent(element.children)}</a>`,
        },
      };

    // Default: unmappable component -> o4o/placeholder
    default:
      return {
        id: blockId,
        type: 'o4o/placeholder',
        attributes: {
          componentName: element.type,
          reason: '기존 O4O 블록으로 매핑할 수 없는 커스텀 컴포넌트입니다.',
          notes: serializeJSX(element), // Preserve original JSX
          props: element.props,
        },
      };
  }
}

/**
 * Convert array of React elements to Block array
 */
export function convertReactToBlocks(elements: ReactElement[]): Block[] {
  return elements.map((element) => mapReactElementToBlock(element));
}
