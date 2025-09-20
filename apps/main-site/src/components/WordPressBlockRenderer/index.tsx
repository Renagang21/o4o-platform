import { FC } from 'react';
import { transformWordPressBlocks, WordPressBlock } from '../../utils/wordpress-block-parser';
import { BlockRenderer } from './BlockRenderer';

interface WordPressBlockRendererProps {
  blocks: WordPressBlock[] | string;
  className?: string;
}

/**
 * Main WordPress Block Renderer
 * Renders WordPress Gutenberg blocks in the main site
 */
export const WordPressBlockRenderer: FC<WordPressBlockRendererProps> = ({ 
  blocks, 
  className = '' 
}) => {
  // Parse and transform blocks
  let parsedBlocks: any[] = [];
  
  if (typeof blocks === 'string') {
    try {
      const wpBlocks = JSON.parse(blocks);
      if (Array.isArray(wpBlocks)) {
        parsedBlocks = transformWordPressBlocks(wpBlocks);
      } else if (wpBlocks && typeof wpBlocks === 'object') {
        parsedBlocks = transformWordPressBlocks([wpBlocks]);
      } else {
        parsedBlocks = [];
      }
    } catch (error) {
      return <div className="error">Failed to render content</div>;
    }
  } else if (Array.isArray(blocks)) {
    parsedBlocks = transformWordPressBlocks(blocks);
  } else if (blocks && typeof blocks === 'object') {
    parsedBlocks = [];
  }

  if (parsedBlocks.length === 0) {
    return null;
  }

  return (
    <div className={`wp-block-content ${className}`}>
      {Array.isArray(parsedBlocks) ? parsedBlocks.map((block, index) => (
        <BlockRenderer key={block.id || index} block={block} />
      )) : null}
    </div>
  );
};

export default WordPressBlockRenderer;