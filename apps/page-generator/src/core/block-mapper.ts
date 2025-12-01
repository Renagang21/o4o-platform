/**
 * Block Mapper
 * Converts ReactElement to O4O Block structure
 * Maps JSX elements to O4O block types with Tailwind parsing
 */

import { v4 as uuidv4 } from 'uuid';
import type { ReactElement, Block } from './types';
import { TailwindMapper } from './tailwind-mapper';
import { createPlaceholderBlock, shouldCreatePlaceholder } from './placeholder';
import { extractTextContent } from './jsx-parser';

/**
 * Clean block attributes by removing undefined and empty values
 */
function cleanAttributes(attributes: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(attributes)) {
    // Skip undefined
    if (value === undefined) continue;

    // Skip empty objects (e.g., padding: {})
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (Object.keys(value).length === 0) continue;
      // Keep non-empty objects
      cleaned[key] = value;
      continue;
    }

    // Keep all other values
    cleaned[key] = value;
  }

  return cleaned;
}

/**
 * Round number to 2 decimal places
 */
function roundTo2(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Convert ReactElement tree to O4O Block array
 */
export function convertReactToBlocks(elements: ReactElement[]): Block[] {
  return elements.map((element) => mapReactElementToBlock(element)).filter(Boolean) as Block[];
}

/**
 * Map single ReactElement to O4O Block
 * Core conversion logic with Tailwind parsing
 */
export function mapReactElementToBlock(element: ReactElement): Block | null {
  const blockId = uuidv4();
  const className = element.props.className || '';
  const elementType = element.type.toLowerCase();

  // Check for custom components first
  if (shouldCreatePlaceholder(element.type)) {
    return createPlaceholderBlock(element);
  }

  // Map by element type
  switch (elementType) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return createHeadingBlock(blockId, element, className);

    case 'p':
      return createParagraphBlock(blockId, element, className);

    case 'img':
      return createImageBlock(blockId, element, className);

    case 'button':
      return createButtonBlock(blockId, element, className);

    case 'a':
      // Check if styled as button
      if (isStyledAsButton(className)) {
        return createButtonBlock(blockId, element, className);
      }
      return createParagraphBlock(blockId, element, className, true);

    case 'ul':
      return createListBlock(blockId, element, className, 'unordered');

    case 'ol':
      return createListBlock(blockId, element, className, 'ordered');

    case 'blockquote':
      return createQuoteBlock(blockId, element, className);

    case 'div':
    case 'section':
    case 'article':
    case 'header':
    case 'footer':
    case 'main':
    case 'nav':
    case 'aside':
      return createLayoutBlock(blockId, element, className);

    default:
      // Unmapped element - create placeholder
      return createPlaceholderBlock(element);
  }
}

/**
 * Create heading block (h1-h6)
 */
function createHeadingBlock(
  id: string,
  element: ReactElement,
  className: string
): Block {
  const level = parseInt(element.type.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;

  return {
    id,
    type: 'o4o/heading',
    attributes: cleanAttributes({
      content: extractTextContent(element.children),
      level,
      align: TailwindMapper.parseTextAlign(className),
      fontSize: TailwindMapper.parseFontSize(className),
      textColor: TailwindMapper.parseAlphaColor(className, 'text') || TailwindMapper.parseTextColor(className),
      backgroundColor: TailwindMapper.parseAlphaColor(className, 'bg') || TailwindMapper.parseBackgroundColor(className),
      opacity: TailwindMapper.parseOpacity(className),
      shadow: TailwindMapper.parseShadow(className),
    }),
  };
}

/**
 * Create paragraph block
 */
function createParagraphBlock(
  id: string,
  element: ReactElement,
  className: string,
  preserveHTML = false
): Block {
  const content = preserveHTML
    ? serializeChildren(element.children)
    : extractTextContent(element.children);

  return {
    id,
    type: 'o4o/paragraph',
    attributes: cleanAttributes({
      content,
      align: TailwindMapper.parseTextAlign(className),
      fontSize: TailwindMapper.parseFontSize(className),
      textColor: TailwindMapper.parseAlphaColor(className, 'text') || TailwindMapper.parseTextColor(className),
      backgroundColor: TailwindMapper.parseAlphaColor(className, 'bg') || TailwindMapper.parseBackgroundColor(className),
      opacity: TailwindMapper.parseOpacity(className),
      shadow: TailwindMapper.parseShadow(className),
    }),
  };
}

/**
 * Create image block
 */
function createImageBlock(id: string, element: ReactElement, className: string): Block {
  return {
    id,
    type: 'o4o/image',
    attributes: {
      url: element.props.src || '',
      alt: element.props.alt || '',
      width: element.props.width || TailwindMapper.parseWidth(className),
      height: element.props.height || TailwindMapper.parseHeight(className),
      align: TailwindMapper.parseTextAlign(className),
    },
  };
}

/**
 * Create button block
 */
function createButtonBlock(
  id: string,
  element: ReactElement,
  className: string
): Block {
  const text = extractTextContent(element.children);
  const url = element.props.href || element.props.onClick ? '#' : '';

  return {
    id,
    type: 'o4o/button',
    attributes: cleanAttributes({
      text,
      url,
      backgroundColor: TailwindMapper.parseAlphaColor(className, 'bg') || TailwindMapper.parseBackgroundColor(className),
      textColor: TailwindMapper.parseAlphaColor(className, 'text') || TailwindMapper.parseTextColor(className),
      borderRadius: TailwindMapper.parseBorderRadius(className),
      fontSize: TailwindMapper.parseFontSize(className),
      padding: TailwindMapper.parsePadding(className),
      opacity: TailwindMapper.parseOpacity(className),
      shadow: TailwindMapper.parseShadow(className),
    }),
  };
}

/**
 * Create list block (ul/ol)
 */
function createListBlock(
  id: string,
  element: ReactElement,
  className: string,
  type: 'ordered' | 'unordered'
): Block {
  // Extract list items
  const items = element.children
    .filter((child): child is ReactElement => typeof child !== 'string')
    .filter((child) => child.type.toLowerCase() === 'li')
    .map((li) => extractTextContent(li.children));

  return {
    id,
    type: 'o4o/list',
    attributes: {
      type,
      content: items.join('\n'),
      textColor: TailwindMapper.parseTextColor(className),
      fontSize: TailwindMapper.parseFontSize(className),
    },
  };
}

/**
 * Create quote block
 */
function createQuoteBlock(id: string, element: ReactElement, className: string): Block {
  return {
    id,
    type: 'o4o/quote',
    attributes: {
      quote: extractTextContent(element.children),
      align: TailwindMapper.parseTextAlign(className),
      textColor: TailwindMapper.parseTextColor(className),
      fontSize: TailwindMapper.parseFontSize(className),
    },
  };
}

/**
 * Create layout block (div with grid/flex/flow)
 * Handles columns, groups, and nested layouts
 */
function createLayoutBlock(
  id: string,
  element: ReactElement,
  className: string
): Block {
  // Check for grid layout
  if (TailwindMapper.hasGrid(className)) {
    return createColumnsBlock(id, element, className);
  }

  // Check for flex layout
  if (TailwindMapper.hasFlex(className)) {
    return createFlexGroupBlock(id, element, className);
  }

  // Default: flow layout
  return createFlowGroupBlock(id, element, className);
}

/**
 * Create columns block (grid layout)
 */
function createColumnsBlock(
  id: string,
  element: ReactElement,
  className: string
): Block {
  const columnCount = TailwindMapper.parseGridCols(className) || 2;
  const gap = TailwindMapper.parseGap(className);

  // Convert children to column blocks
  const innerBlocks = element.children
    .filter((child): child is ReactElement => typeof child !== 'string')
    .map((child, index) => {
      const columnId = uuidv4();
      const childBlock = mapReactElementToBlock(child);

      return {
        id: columnId,
        type: 'o4o/column',
        attributes: cleanAttributes({
          width: roundTo2(100 / columnCount),
        }),
        innerBlocks: childBlock ? [childBlock] : [],
      };
    });

  return {
    id,
    type: 'o4o/columns',
    attributes: cleanAttributes({
      columnCount,
      gap,
      isStackedOnMobile: true,
    }),
    innerBlocks,
  };
}

/**
 * Create flex group block
 */
function createFlexGroupBlock(
  id: string,
  element: ReactElement,
  className: string
): Block {
  const innerBlocks = element.children
    .map((child) =>
      typeof child === 'string' ? null : mapReactElementToBlock(child)
    )
    .filter(Boolean) as Block[];

  return {
    id,
    type: 'o4o/group',
    attributes: cleanAttributes({
      layout: 'flex',
      flexDirection: TailwindMapper.parseFlexDirection(className),
      flexWrap: TailwindMapper.parseFlexWrap(className),
      gap: TailwindMapper.parseGap(className),
      justifyContent: TailwindMapper.parseJustifyContent(className),
      alignItems: TailwindMapper.parseAlignItems(className),
      padding: TailwindMapper.parsePadding(className),
      backgroundColor: TailwindMapper.parseAlphaColor(className, 'bg') || TailwindMapper.parseBackgroundColor(className),
      borderRadius: TailwindMapper.parseBorderRadius(className),
      opacity: TailwindMapper.parseOpacity(className),
      shadow: TailwindMapper.parseShadow(className),
      backdropBlur: TailwindMapper.parseBackdropBlur(className),
    }),
    innerBlocks,
  };
}

/**
 * Create flow group block (normal div)
 */
function createFlowGroupBlock(
  id: string,
  element: ReactElement,
  className: string
): Block {
  const innerBlocks = element.children
    .map((child) =>
      typeof child === 'string' ? null : mapReactElementToBlock(child)
    )
    .filter(Boolean) as Block[];

  return {
    id,
    type: 'o4o/group',
    attributes: cleanAttributes({
      layout: 'flow',
      padding: TailwindMapper.parsePadding(className),
      backgroundColor: TailwindMapper.parseAlphaColor(className, 'bg') || TailwindMapper.parseBackgroundColor(className),
      borderRadius: TailwindMapper.parseBorderRadius(className),
      opacity: TailwindMapper.parseOpacity(className),
      shadow: TailwindMapper.parseShadow(className),
      backdropBlur: TailwindMapper.parseBackdropBlur(className),
    }),
    innerBlocks,
  };
}

/**
 * Check if element is styled as a button
 */
function isStyledAsButton(className: string): boolean {
  return (
    className.includes('btn') ||
    className.includes('button') ||
    (className.includes('px-') && className.includes('py-') && className.includes('bg-'))
  );
}

/**
 * Serialize children to HTML string (for links with formatting)
 */
function serializeChildren(children: (string | ReactElement)[]): string {
  return children
    .map((child) => {
      if (typeof child === 'string') {
        return child;
      }

      // Simple serialization for common inline elements
      if (child.type === 'strong' || child.type === 'b') {
        return `<strong>${extractTextContent(child.children)}</strong>`;
      }
      if (child.type === 'em' || child.type === 'i') {
        return `<em>${extractTextContent(child.children)}</em>`;
      }
      if (child.type === 'a') {
        return `<a href="${child.props.href || '#'}">${extractTextContent(child.children)}</a>`;
      }

      return extractTextContent(child.children);
    })
    .join('');
}
