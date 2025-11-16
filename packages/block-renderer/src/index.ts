/**
 * @o4o/block-renderer
 * Unified block rendering engine for O4O Platform
 */

// Main exports
export { BlockRenderer } from './BlockRenderer';
export type { BlockRendererProps } from './BlockRenderer';

// Registry
export { blockRegistry } from './registry/BlockRegistry';
export { registerAllBlocks } from './renderers';

// Types
export type {
  Block,
  BlockComponent,
  BlockRegistryEntry,
  WordPressBlock,
} from './types/block.types';

// Utilities
export {
  extractTextContent,
  normalizeBlock,
  parseBlocks,
  getBlockData,
} from './utils/block-parser';

export {
  getColorClassName,
  getColorStyle,
  parseColor,
} from './utils/colors';

export {
  getFontSizeClass,
  getFontSizeStyle,
  getAlignmentClass,
} from './utils/typography';

// Re-export all block components for advanced usage
export * from './renderers/text/ParagraphBlock';
export * from './renderers/text/HeadingBlock';
export * from './renderers/text/ListBlock';
export * from './renderers/text/QuoteBlock';
export * from './renderers/text/CodeBlock';

export * from './renderers/media/ImageBlock';
export * from './renderers/media/VideoBlock';
export * from './renderers/media/GalleryBlock';
export * from './renderers/media/AudioBlock';

export * from './renderers/layout/ColumnsBlock';
export * from './renderers/layout/ColumnBlock';
export * from './renderers/layout/GroupBlock';
export * from './renderers/layout/ButtonBlock';
export * from './renderers/layout/ButtonsBlock';
export * from './renderers/layout/SeparatorBlock';
export * from './renderers/layout/SpacerBlock';
export * from './renderers/layout/TableBlock';

export * from './renderers/special/MarkdownBlock';
export * from './renderers/special/HtmlBlock';
export * from './renderers/special/EmbedBlock';
export * from './renderers/special/CoverBlock';

export * from './renderers/product/ProductCardBlock';
export * from './renderers/product/ProductTitleBlock';
export * from './renderers/product/ProductPriceBlock';
export * from './renderers/product/ProductGalleryBlock';
export * from './renderers/product/ProductDescriptionBlock';
export * from './renderers/product/AddToCartPanelBlock';
