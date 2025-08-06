/**
 * WordPress Block Parser and Transformer
 * Converts WordPress Gutenberg blocks to main-site compatible format
 */

export interface WordPressBlock {
  clientId?: string;
  name: string;
  attributes: Record<string, any>;
  innerBlocks?: WordPressBlock[];
  innerHTML?: string;
  innerContent?: (string | null)[];
}

export interface MainSiteBlock {
  id?: string;
  type: string;
  data?: Record<string, any>;
  content?: any;
  innerBlocks?: MainSiteBlock[];
}

/**
 * Transform WordPress block to main site block format
 */
export function transformWordPressBlock(wpBlock: WordPressBlock): MainSiteBlock | null {
  // Remove 'core/' prefix from block name
  const blockType = wpBlock.name.replace('core/', '');
  
  // Base block structure
  const block: MainSiteBlock = {
    id: wpBlock.clientId,
    type: blockType,
    data: {},
  };

  // Transform based on block type
  switch (wpBlock.name) {
    // Text blocks
    case 'core/paragraph':
      return {
        ...block,
        type: 'paragraph',
        data: {
          text: extractTextContent(wpBlock),
          alignment: wpBlock.attributes.align || 'left',
          dropCap: wpBlock.attributes.dropCap || false,
          fontSize: wpBlock.attributes.fontSize,
          textColor: wpBlock.attributes.textColor,
          backgroundColor: wpBlock.attributes.backgroundColor,
          customTextColor: wpBlock.attributes.style?.color?.text,
          customBackgroundColor: wpBlock.attributes.style?.color?.background,
        }
      };

    case 'core/heading':
      return {
        ...block,
        type: 'heading',
        data: {
          text: extractTextContent(wpBlock),
          level: wpBlock.attributes.level || 2,
          alignment: wpBlock.attributes.align || 'left',
          textColor: wpBlock.attributes.textColor,
          customTextColor: wpBlock.attributes.style?.color?.text,
        }
      };

    case 'core/list':
      return {
        ...block,
        type: 'list',
        data: {
          items: parseListItems(wpBlock),
          ordered: wpBlock.attributes.ordered || false,
          reversed: wpBlock.attributes.reversed || false,
          start: wpBlock.attributes.start,
        }
      };

    case 'core/quote':
      return {
        ...block,
        type: 'quote',
        data: {
          text: extractTextContent(wpBlock),
          citation: wpBlock.attributes.citation,
          align: wpBlock.attributes.align || 'left',
        }
      };

    // Media blocks
    case 'core/image':
      return {
        ...block,
        type: 'image',
        data: {
          url: wpBlock.attributes.url,
          alt: wpBlock.attributes.alt || '',
          caption: wpBlock.attributes.caption,
          width: wpBlock.attributes.width,
          height: wpBlock.attributes.height,
          align: wpBlock.attributes.align,
          linkDestination: wpBlock.attributes.linkDestination,
          href: wpBlock.attributes.href,
          sizeSlug: wpBlock.attributes.sizeSlug || 'large',
        }
      };

    case 'core/gallery':
      return {
        ...block,
        type: 'gallery',
        data: {
          images: wpBlock.attributes.images || [],
          columns: wpBlock.attributes.columns || 3,
          imageCrop: wpBlock.attributes.imageCrop !== false,
          linkTo: wpBlock.attributes.linkTo || 'none',
          sizeSlug: wpBlock.attributes.sizeSlug || 'large',
          align: wpBlock.attributes.align,
        }
      };

    case 'core/video':
      return {
        ...block,
        type: 'video',
        data: {
          src: wpBlock.attributes.src,
          poster: wpBlock.attributes.poster,
          autoplay: wpBlock.attributes.autoplay || false,
          controls: wpBlock.attributes.controls !== false,
          loop: wpBlock.attributes.loop || false,
          muted: wpBlock.attributes.muted || false,
          playsInline: wpBlock.attributes.playsInline || false,
        }
      };

    case 'core/audio':
      return {
        ...block,
        type: 'audio',
        data: {
          src: wpBlock.attributes.src,
          autoplay: wpBlock.attributes.autoplay || false,
          loop: wpBlock.attributes.loop || false,
          preload: wpBlock.attributes.preload || 'metadata',
        }
      };

    // Layout blocks
    case 'core/group':
      return {
        ...block,
        type: 'group',
        data: {
          tagName: wpBlock.attributes.tagName || 'div',
          backgroundColor: wpBlock.attributes.backgroundColor,
          textColor: wpBlock.attributes.textColor,
          gradient: wpBlock.attributes.gradient,
          customBackgroundColor: wpBlock.attributes.style?.color?.background,
          customTextColor: wpBlock.attributes.style?.color?.text,
          align: wpBlock.attributes.align,
          layout: wpBlock.attributes.layout,
        },
        innerBlocks: transformInnerBlocks(wpBlock.innerBlocks)
      };

    case 'core/columns':
      return {
        ...block,
        type: 'columns',
        data: {
          verticalAlignment: wpBlock.attributes.verticalAlignment,
          isStackedOnMobile: wpBlock.attributes.isStackedOnMobile !== false,
        },
        innerBlocks: transformInnerBlocks(wpBlock.innerBlocks)
      };

    case 'core/column':
      return {
        ...block,
        type: 'column',
        data: {
          width: wpBlock.attributes.width,
          verticalAlignment: wpBlock.attributes.verticalAlignment,
        },
        innerBlocks: transformInnerBlocks(wpBlock.innerBlocks)
      };

    case 'core/cover':
      return {
        ...block,
        type: 'cover',
        data: {
          url: wpBlock.attributes.url,
          dimRatio: wpBlock.attributes.dimRatio || 50,
          overlayColor: wpBlock.attributes.overlayColor,
          customOverlayColor: wpBlock.attributes.customOverlayColor,
          backgroundType: wpBlock.attributes.backgroundType || 'image',
          focalPoint: wpBlock.attributes.focalPoint,
          minHeight: wpBlock.attributes.minHeight,
          minHeightUnit: wpBlock.attributes.minHeightUnit,
          contentPosition: wpBlock.attributes.contentPosition,
          isDark: wpBlock.attributes.isDark !== false,
        },
        innerBlocks: transformInnerBlocks(wpBlock.innerBlocks)
      };

    case 'core/separator':
      return {
        ...block,
        type: 'separator',
        data: {
          className: wpBlock.attributes.className,
          opacity: wpBlock.attributes.opacity || 'alpha-channel',
        }
      };

    // Reusable blocks
    case 'core/block':
      return {
        ...block,
        type: 'reusable-block',
        data: {
          ref: wpBlock.attributes.ref,
        }
      };

    // Embed blocks
    case 'core/embed':
      return {
        ...block,
        type: 'embed',
        data: {
          url: wpBlock.attributes.url,
          type: wpBlock.attributes.type,
          providerNameSlug: wpBlock.attributes.providerNameSlug,
          responsive: wpBlock.attributes.responsive !== false,
          caption: wpBlock.attributes.caption,
        }
      };

    // Button blocks
    case 'core/button':
      return {
        ...block,
        type: 'button',
        data: {
          text: extractTextContent(wpBlock),
          url: wpBlock.attributes.url,
          linkTarget: wpBlock.attributes.linkTarget,
          rel: wpBlock.attributes.rel,
          backgroundColor: wpBlock.attributes.backgroundColor,
          textColor: wpBlock.attributes.textColor,
          gradient: wpBlock.attributes.gradient,
          borderRadius: wpBlock.attributes.borderRadius,
          width: wpBlock.attributes.width,
        }
      };

    case 'core/buttons':
      return {
        ...block,
        type: 'buttons',
        data: {
          layout: wpBlock.attributes.layout,
        },
        innerBlocks: transformInnerBlocks(wpBlock.innerBlocks)
      };

    // Table block
    case 'core/table':
      return {
        ...block,
        type: 'table',
        data: {
          hasFixedLayout: wpBlock.attributes.hasFixedLayout || false,
          caption: wpBlock.attributes.caption,
          head: wpBlock.attributes.head || [],
          body: wpBlock.attributes.body || [],
          foot: wpBlock.attributes.foot || [],
        }
      };

    // Code block
    case 'core/code':
      return {
        ...block,
        type: 'code',
        data: {
          content: wpBlock.attributes.content || extractTextContent(wpBlock),
        }
      };

    // HTML block
    case 'core/html':
      return {
        ...block,
        type: 'html',
        data: {
          content: wpBlock.attributes.content || extractTextContent(wpBlock),
        }
      };

    // Spacer block
    case 'core/spacer':
      return {
        ...block,
        type: 'spacer',
        data: {
          height: wpBlock.attributes.height || 100,
        }
      };

    // More block
    case 'core/more':
      return {
        ...block,
        type: 'more',
        data: {
          customText: wpBlock.attributes.customText,
          noTeaser: wpBlock.attributes.noTeaser || false,
        }
      };

    // Default case for unknown blocks
    default:
      console.warn(`Unknown block type: ${wpBlock.name}`);
      return {
        ...block,
        type: 'unknown',
        data: {
          originalType: wpBlock.name,
          attributes: wpBlock.attributes,
          content: extractTextContent(wpBlock),
        }
      };
  }
}

/**
 * Transform array of inner blocks
 */
function transformInnerBlocks(innerBlocks?: WordPressBlock[]): MainSiteBlock[] {
  if (!innerBlocks || innerBlocks.length === 0) {
    return [];
  }
  
  return innerBlocks
    .map(block => transformWordPressBlock(block))
    .filter((block): block is MainSiteBlock => block !== null);
}

/**
 * Extract text content from WordPress block
 */
function extractTextContent(block: WordPressBlock): string {
  if (block.attributes.content) {
    return block.attributes.content;
  }
  
  if (block.innerHTML) {
    // Strip HTML tags for plain text
    const div = document.createElement('div');
    div.innerHTML = block.innerHTML;
    return div.textContent || '';
  }
  
  if (block.innerContent && block.innerContent.length > 0) {
    return block.innerContent
      .filter((content): content is string => typeof content === 'string')
      .join('');
  }
  
  return '';
}

/**
 * Parse list items from WordPress list block
 */
function parseListItems(block: WordPressBlock): string[] {
  if (block.attributes.values) {
    // New format with values attribute
    return block.attributes.values;
  }
  
  if (block.innerHTML) {
    // Parse from HTML
    const div = document.createElement('div');
    div.innerHTML = block.innerHTML;
    const items = div.querySelectorAll('li');
    return Array.from(items).map(item => item.textContent || '');
  }
  
  return [];
}

/**
 * Transform WordPress blocks array to main site format
 */
export function transformWordPressBlocks(wpBlocks: WordPressBlock[]): MainSiteBlock[] {
  return wpBlocks
    .map(block => transformWordPressBlock(block))
    .filter((block): block is MainSiteBlock => block !== null);
}

/**
 * Parse WordPress block content string
 */
export function parseWordPressContent(content: string): MainSiteBlock[] {
  try {
    // If content is already parsed JSON
    if (typeof content === 'object') {
      return transformWordPressBlocks(content as any);
    }
    
    // Try to parse as JSON first
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return transformWordPressBlocks(parsed);
    }
    
    // If it's a single block object
    if (parsed.name) {
      return transformWordPressBlocks([parsed]);
    }
    
    return [];
  } catch (error) {
    console.error('Failed to parse WordPress content:', error);
    return [];
  }
}