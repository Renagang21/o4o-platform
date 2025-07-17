import React, { useEffect } from 'react';
import { TemplateBlock } from '../../api/content/contentApi';
import ParagraphBlock from './blocks/ParagraphBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ImageBlock from './blocks/ImageBlock';
import ButtonBlock from './blocks/ButtonBlock';
import HeroBlock from './blocks/HeroBlock';
import ColumnsBlock from './blocks/ColumnsBlock';
import SpacerBlock from './blocks/SpacerBlock';
import ShortcodeBlock from './blocks/ShortcodeBlock';
import { shortcodeParser } from '@/utils/shortcodeParser';
import { productShortcodes } from '@/components/shortcodes/productShortcodes';

// Block component mapping
const blockComponents: Record<string, React.ComponentType<{ block: TemplateBlock; [key: string]: unknown }>> = {
  paragraph: ParagraphBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  button: ButtonBlock,
  hero: HeroBlock,
  columns: ColumnsBlock,
  spacer: SpacerBlock,
  shortcode: ShortcodeBlock,
};

// Register product shortcodes on initialization
shortcodeParser.registerMany(productShortcodes);

interface TemplateRendererProps {
  blocks: TemplateBlock[];
  className?: string;
}

const TemplateRenderer: React.FC<TemplateRendererProps> = ({ blocks, className = '' }) => {
  // Register shortcodes once on mount
  useEffect(() => {
    // Additional shortcode registration if needed
    console.log('Available shortcodes:', shortcodeParser.getRegisteredShortcodes());
  }, []);

  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className={`template-renderer ${className}`}>
      {blocks.map((block, index) => {
        const BlockComponent = blockComponents[block.type];
        
        if (!BlockComponent) {
          console.warn(`Unknown block type: ${block.type}`);
          return null;
        }

        return (
          <BlockComponent
            key={block.id || `block-${index}`}
            {...block.content}
            settings={block.settings}
          />
        );
      })}
    </div>
  );
};

export default TemplateRenderer;