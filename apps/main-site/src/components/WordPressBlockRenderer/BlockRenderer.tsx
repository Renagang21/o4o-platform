import { FC } from 'react';
import { MainSiteBlock } from '../../utils/wordpress-block-parser';

// Import individual block components
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { ListBlock } from './blocks/ListBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { GalleryBlock } from './blocks/GalleryBlock';
import { VideoBlock } from './blocks/VideoBlock';
import { AudioBlock } from './blocks/AudioBlock';
import { GroupBlock } from './blocks/GroupBlock';
import { ColumnsBlock } from './blocks/ColumnsBlock';
import { ColumnBlock } from './blocks/ColumnBlock';
import { CoverBlock } from './blocks/CoverBlock';
import { SeparatorBlock } from './blocks/SeparatorBlock';
import { ButtonBlock } from './blocks/ButtonBlock';
import { ButtonsBlock } from './blocks/ButtonsBlock';
import { TableBlock } from './blocks/TableBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { HtmlBlock } from './blocks/HtmlBlock';
import { SpacerBlock } from './blocks/SpacerBlock';
import { MoreBlock } from './blocks/MoreBlock';
import { EmbedBlock } from './blocks/EmbedBlock';
import { ReusableBlockRenderer } from './blocks/ReusableBlockRenderer';
import { MarkdownReaderBlock } from './blocks/MarkdownReaderBlock';

interface BlockRendererProps {
  block: MainSiteBlock;
}

/**
 * Block Renderer Component
 * Routes blocks to their specific renderer components
 */
export const BlockRenderer: FC<BlockRendererProps> = ({ block }) => {
  // Route to appropriate block component based on type
  switch (block.type) {
    // Text blocks
    case 'paragraph':
      return <ParagraphBlock block={block} />;
    case 'heading':
      return <HeadingBlock block={block} />;
    case 'list':
      return <ListBlock block={block} />;
    case 'quote':
      return <QuoteBlock block={block} />;
    
    // Media blocks
    case 'image':
      return <ImageBlock block={block} />;
    case 'gallery':
      return <GalleryBlock block={block} />;
    case 'video':
      return <VideoBlock block={block} />;
    case 'audio':
      return <AudioBlock block={block} />;
    
    // Layout blocks
    case 'group':
      return <GroupBlock block={block} />;
    case 'columns':
      return <ColumnsBlock block={block} />;
    case 'column':
      return <ColumnBlock block={block} />;
    case 'cover':
      return <CoverBlock block={block} />;
    case 'separator':
      return <SeparatorBlock block={block} />;
    
    // Interactive blocks
    case 'button':
      return <ButtonBlock block={block} />;
    case 'buttons':
      return <ButtonsBlock block={block} />;
    
    // Content blocks
    case 'table':
      return <TableBlock block={block} />;
    case 'code':
      return <CodeBlock block={block} />;
    case 'html':
      return <HtmlBlock block={block} />;
    case 'spacer':
      return <SpacerBlock block={block} />;
    case 'more':
      return <MoreBlock block={block} />;
    case 'embed':
      return <EmbedBlock block={block} />;
    
    // Reusable blocks
    case 'reusable-block':
      return <ReusableBlockRenderer block={block} />;

    // Custom blocks
    case 'o4o/markdown-reader':
    case 'o4o/markdown':
      return <MarkdownReaderBlock block={block} />;

    // Unknown block fallback
    case 'unknown':
    default:
      return (
        <div className="wp-block-unknown p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">
            Unknown block type: {block.data?.originalType || block.type}
          </p>
          {block.data?.content && (
            <div className="mt-2">{block.data.content}</div>
          )}
        </div>
      );
  }
};