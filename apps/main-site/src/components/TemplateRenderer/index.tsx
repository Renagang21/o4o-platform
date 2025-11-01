import { Component, FC, useEffect } from 'react';
import { TemplateBlock } from '../../api/content/contentApi';
import ParagraphBlock from './blocks/ParagraphBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ImageBlock from './blocks/ImageBlock';
import ButtonBlock from './blocks/ButtonBlock';
import HeroBlock from './blocks/HeroBlock';
import ColumnsBlock from './blocks/ColumnsBlock';
import SpacerBlock from './blocks/SpacerBlock';
import ShortcodeBlock from './blocks/ShortcodeBlock';
import ErrorBlock from './blocks/ErrorBlock';
import { CTABlock, PricingTableBlock, TestimonialBlock, InfoBoxBlock } from './blocks/SpectraBlocks';
import { SpectraFormBlock, SpectraViewBlock } from './blocks/SpectraFormBlocks';

// Block component mapping
const blockComponents: Record<string, ComponentType<{ block: TemplateBlock; [key: string]: unknown }>> = {
  // Core blocks
  paragraph: ParagraphBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  button: ButtonBlock,
  hero: HeroBlock,
  columns: ColumnsBlock,
  spacer: SpacerBlock,
  shortcode: ShortcodeBlock,

  // O4O blocks (AI-generated blocks with o4o/ prefix)
  'o4o/paragraph': ParagraphBlock,
  'o4o/heading': HeadingBlock,
  'o4o/image': ImageBlock,
  'o4o/button': ButtonBlock,
  'o4o/columns': ColumnsBlock,
  'o4o/spacer': SpacerBlock,
  'o4o/shortcode': ShortcodeBlock,

  // Spectra blocks
  'uagb/call-to-action': CTABlock,
  'uagb/pricing-table': PricingTableBlock,
  'uagb/testimonial': TestimonialBlock,
  'uagb/info-box': InfoBoxBlock,
  'uagb/form': SpectraFormBlock,
  'uagb/view': SpectraViewBlock,
};

// Note: Shortcode 등록은 main.tsx에서 앱 초기화 시점에 수행됨

interface TemplateRendererProps {
  blocks: TemplateBlock[];
  className?: string;
}

const TemplateRenderer: FC<TemplateRendererProps> = ({ blocks, className = '' }) => {
  // Register shortcodes once on mount
  useEffect(() => {
    // Additional shortcode registration if needed
  }, []);

  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className={`template-renderer ${className}`}>
      {blocks.map((block, index) => {
        const BlockComponent = blockComponents[block.type];
        
        if (!BlockComponent) {
    // Removed console.warn
          
          // Use ErrorBlock for better debugging
          return (
            <ErrorBlock
              key={block.id || `block-${index}`}
              blockType={block.type}
              blockData={block.content || block.data}
              availableTypes={Object.keys(blockComponents)}
            />
          );
        }

        // Handle both block.content and block.data for compatibility
        const blockData = block.content || block.data || {};

        return (
          <BlockComponent
            key={block.id || `block-${index}`}
            {...blockData}
            {...(block.attributes || {})}
            innerBlocks={block.innerBlocks}
            settings={block.settings}
          />
        );
      })}
    </div>
  );
};

export default TemplateRenderer;