import { useCallback } from 'react';
import type { Block } from '../types';

export interface UseBlockTransformReturn {
  getAvailableTransforms: (blockType: string) => string[];
  transformBlock: (blockId: string, targetType: string) => void;
}

export const useBlockTransform = (
  blocks: Block[],
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
): UseBlockTransformReturn => {
  
  /**
   * Get available transformation options for a given block type
   */
  const getAvailableTransforms = useCallback((blockType: string): string[] => {
    const transformations: Record<string, string[]> = {
      paragraph: ['heading', 'list', 'quote'],
      heading: ['paragraph', 'list', 'quote'],
      list: ['paragraph', 'heading', 'quote'],
      quote: ['paragraph', 'heading', 'list'],
      // Image, button, and other media blocks typically can't be transformed to text blocks
      image: [],
      button: [],
      video: [],
      audio: [],
      embed: [],
      code: ['paragraph', 'quote']
    };

    return transformations[blockType] || [];
  }, []);

  /**
   * Transform a block from one type to another
   */
  const transformBlock = useCallback((blockId: string, targetType: string) => {
    setBlocks(prevBlocks => {
      return prevBlocks.map(block => {
        if (block.id !== blockId) {
          return block;
        }

        // Get the text content from the source block
        let textContent = '';
        if (typeof block.content === 'string') {
          textContent = block.content;
        } else if (block.content && typeof block.content === 'object' && 'text' in block.content) {
          textContent = block.content.text || '';
        }

        // Create the transformed block
        const transformedBlock: Block = {
          ...block,
          type: targetType as any,
          content: { text: textContent },
          attributes: getDefaultAttributesForType(targetType)
        };

        return transformedBlock;
      });
    });
  }, [setBlocks]);

  return {
    getAvailableTransforms,
    transformBlock
  };
};

/**
 * Get default attributes for a block type
 */
function getDefaultAttributesForType(blockType: string): Record<string, any> {
  const defaultAttributes: Record<string, Record<string, any>> = {
    paragraph: {
      align: 'left',
      fontSize: 'base'
    },
    heading: {
      level: 2,
      align: 'left'
    },
    list: {
      ordered: false,
      align: 'left'
    },
    quote: {
      align: 'left',
      cite: ''
    }
  };

  return defaultAttributes[blockType] || {};
}