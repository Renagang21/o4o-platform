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
  let parsedBlocks = [];
  
  if (typeof blocks === 'string') {
    try {
      const wpBlocks = JSON.parse(blocks);
      parsedBlocks = transformWordPressBlocks(Array.isArray(wpBlocks) ? wpBlocks : [wpBlocks]);
    } catch (error) {
    // Error logging - use proper error handler
      return <div className="error">Failed to render content</div>;
    }
  } else if (Array.isArray(blocks)) {
    parsedBlocks = transformWordPressBlocks(blocks);
  }

  if (parsedBlocks.length === 0) {
    return null;
  }

  return (
    <div className={`wp-block-content ${className}`}>
      {parsedBlocks.map((block, index) => (
        <BlockRenderer key={block.id || index} block={block} />
      ))}
    </div>
  );
};

export default WordPressBlockRenderer;