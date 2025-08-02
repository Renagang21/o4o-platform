import { useEffect, FC } from 'react';
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
import { shortcodeParser } from '@/utils/shortcodeParser';
import { productShortcodes } from '@/components/shortcodes/productShortcodes';
import { formShortcodes } from '@/components/shortcodes/formShortcodes';

// Block component mapping
const blockComponents: Record<string, React.ComponentType<{ block: TemplateBlock; [key: string]: unknown }>> = {
  // Core blocks
  paragraph: ParagraphBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  button: ButtonBlock,
  hero: HeroBlock,
  columns: ColumnsBlock,
  spacer: SpacerBlock,
  shortcode: ShortcodeBlock,
  
  // Spectra blocks
  'uagb/call-to-action': CTABlock,
  'uagb/pricing-table': PricingTableBlock,
  'uagb/testimonial': TestimonialBlock,
  'uagb/info-box': InfoBoxBlock,
  'uagb/form': SpectraFormBlock,
  'uagb/view': SpectraViewBlock,
};

// Register shortcodes on initialization
shortcodeParser.registerMany(productShortcodes);
shortcodeParser.registerMany(formShortcodes);

interface TemplateRendererProps {
  blocks: TemplateBlock[];
  className?: string;
}

const TemplateRenderer: FC<TemplateRendererProps> = ({ blocks, className = '' }) => {
  // Register shortcodes once on mount
  useEffect(() => {
    // Additional shortcode registration if needed
    // console.log('Available shortcodes:', shortcodeParser.getRegisteredShortcodes());
  }, []);

  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className={`template-renderer ${className}`}>
      {blocks.map((block, index) => {
        const BlockComponent = blockComponents[block.type];
        
        if (!BlockComponent) {
          console.warn(`Unknown block type: ${block.type}. Available types:`, Object.keys(blockComponents));
          
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
            settings={block.settings}
          />
        );
      })}
    </div>
  );
};

export default TemplateRenderer;