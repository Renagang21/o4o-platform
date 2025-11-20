/**
 * Block Renderers Index
 * Auto-registers all block components with the registry
 */

import { blockRegistry } from '../registry/BlockRegistry';

// Text blocks
import { ParagraphBlock } from './text/ParagraphBlock';
import { HeadingBlock } from './text/HeadingBlock';
import { ListBlock } from './text/ListBlock';
import { QuoteBlock } from './text/QuoteBlock';
import { CodeBlock } from './text/CodeBlock';

// Media blocks
import { ImageBlock } from './media/ImageBlock';
import { VideoBlock } from './media/VideoBlock';
import { GalleryBlock } from './media/GalleryBlock';
import { AudioBlock } from './media/AudioBlock';
import { SlideBlock } from './media/SlideBlock';

// Layout blocks
import { ColumnsBlock } from './layout/ColumnsBlock';
import { ColumnBlock } from './layout/ColumnBlock';
import { GroupBlock } from './layout/GroupBlock';
import { ButtonBlock } from './layout/ButtonBlock';
import { ButtonsBlock } from './layout/ButtonsBlock';
import { SeparatorBlock } from './layout/SeparatorBlock';
import { SpacerBlock } from './layout/SpacerBlock';
import { TableBlock } from './layout/TableBlock';
import { TimelineChartBlock } from './layout/TimelineChartBlock';

// Special blocks
import { MarkdownBlock } from './special/MarkdownBlock';
import { HtmlBlock } from './special/HtmlBlock';
import { EmbedBlock } from './special/EmbedBlock';
import { CoverBlock } from './special/CoverBlock';
import { ShortcodeBlock } from './special/ShortcodeBlock';

// Product blocks
import { ProductCardBlock } from './product/ProductCardBlock';
import { ProductTitleBlock } from './product/ProductTitleBlock';
import { ProductPriceBlock } from './product/ProductPriceBlock';
import { ProductGalleryBlock } from './product/ProductGalleryBlock';
import { ProductDescriptionBlock } from './product/ProductDescriptionBlock';
import { AddToCartPanelBlock } from './product/AddToCartPanelBlock';

/**
 * Register all blocks with the registry
 * This is called automatically when the package is imported
 */
export function registerAllBlocks() {
  blockRegistry.registerMany({
    // Text blocks - support both with and without prefix
    'paragraph': ParagraphBlock,
    'core/paragraph': ParagraphBlock,
    'o4o/paragraph': ParagraphBlock,

    'heading': HeadingBlock,
    'core/heading': HeadingBlock,
    'o4o/heading': HeadingBlock,

    'list': ListBlock,
    'core/list': ListBlock,
    'o4o/list': ListBlock,

    'quote': QuoteBlock,
    'core/quote': QuoteBlock,
    'o4o/quote': QuoteBlock,

    'code': CodeBlock,
    'core/code': CodeBlock,
    'o4o/code': CodeBlock,

    // Media blocks
    'image': ImageBlock,
    'core/image': ImageBlock,
    'o4o/image': ImageBlock,

    'video': VideoBlock,
    'core/video': VideoBlock,
    'o4o/video': VideoBlock,

    'gallery': GalleryBlock,
    'core/gallery': GalleryBlock,
    'o4o/gallery': GalleryBlock,

    'audio': AudioBlock,
    'core/audio': AudioBlock,
    'o4o/audio': AudioBlock,

    'slide': SlideBlock,
    'core/slide': SlideBlock,
    'o4o/slide': SlideBlock,

    // Layout blocks
    'columns': ColumnsBlock,
    'core/columns': ColumnsBlock,
    'o4o/columns': ColumnsBlock,

    'column': ColumnBlock,
    'core/column': ColumnBlock,
    'o4o/column': ColumnBlock,

    'group': GroupBlock,
    'core/group': GroupBlock,
    'o4o/group': GroupBlock,

    'button': ButtonBlock,
    'core/button': ButtonBlock,
    'o4o/button': ButtonBlock,

    'buttons': ButtonsBlock,
    'core/buttons': ButtonsBlock,
    'o4o/buttons': ButtonsBlock,

    'separator': SeparatorBlock,
    'core/separator': SeparatorBlock,
    'o4o/separator': SeparatorBlock,

    'spacer': SpacerBlock,
    'core/spacer': SpacerBlock,
    'o4o/spacer': SpacerBlock,

    'table': TableBlock,
    'core/table': TableBlock,
    'o4o/table': TableBlock,

    'timeline-chart': TimelineChartBlock,
    'o4o/timeline-chart': TimelineChartBlock,

    // Special blocks
    'markdown': MarkdownBlock,
    'o4o/markdown': MarkdownBlock,
    'o4o/markdown-reader': MarkdownBlock,

    'html': HtmlBlock,
    'core/html': HtmlBlock,
    'o4o/html': HtmlBlock,

    'embed': EmbedBlock,
    'core/embed': EmbedBlock,
    'o4o/embed': EmbedBlock,

    'cover': CoverBlock,
    'core/cover': CoverBlock,
    'o4o/cover': CoverBlock,

    'shortcode': ShortcodeBlock,
    'core/shortcode': ShortcodeBlock,
    'o4o/shortcode': ShortcodeBlock,

    // Product blocks
    'product-card': ProductCardBlock,
    'o4o/product-card': ProductCardBlock,

    'product-title': ProductTitleBlock,
    'o4o/product-title': ProductTitleBlock,

    'product-price': ProductPriceBlock,
    'o4o/product-price': ProductPriceBlock,

    'product-gallery': ProductGalleryBlock,
    'o4o/product-gallery': ProductGalleryBlock,

    'product-description': ProductDescriptionBlock,
    'o4o/product-description': ProductDescriptionBlock,

    'add-to-cart-panel': AddToCartPanelBlock,
    'o4o/add-to-cart-panel': AddToCartPanelBlock,
  });
}

// Auto-register on import
registerAllBlocks();

// Export all block components
export * from './text/ParagraphBlock';
export * from './text/HeadingBlock';
export * from './text/ListBlock';
export * from './text/QuoteBlock';
export * from './text/CodeBlock';

export * from './media/ImageBlock';
export * from './media/VideoBlock';
export * from './media/GalleryBlock';
export * from './media/AudioBlock';
export * from './media/SlideBlock';

export * from './layout/ColumnsBlock';
export * from './layout/ColumnBlock';
export * from './layout/GroupBlock';
export * from './layout/ButtonBlock';
export * from './layout/ButtonsBlock';
export * from './layout/SeparatorBlock';
export * from './layout/SpacerBlock';
export * from './layout/TableBlock';
export * from './layout/TimelineChartBlock';

export * from './special/MarkdownBlock';
export * from './special/HtmlBlock';
export * from './special/EmbedBlock';
export * from './special/CoverBlock';
export * from './special/ShortcodeBlock';

export * from './product/ProductCardBlock';
export * from './product/ProductTitleBlock';
export * from './product/ProductPriceBlock';
export * from './product/ProductGalleryBlock';
export * from './product/ProductDescriptionBlock';
export * from './product/AddToCartPanelBlock';
