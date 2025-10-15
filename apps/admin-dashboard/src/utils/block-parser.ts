/**
 * Custom Block Parser - WordPress independent implementation
 * Parses WordPress-style block content without requiring WordPress dependencies
 */

export interface ParsedBlock {
  blockName: string;
  attrs: Record<string, any>;
  innerHTML: string;
  innerContent: (string | null)[];
  innerBlocks: ParsedBlock[];
}

/**
 * WordPress block comment pattern
 * Matches: <!-- wp:blockname {"attr":"value"} -->
 */
const BLOCK_COMMENT_REGEX = /<!--\s+wp:([a-z][a-z0-9_-]*\/)?([a-z][a-z0-9_-]*)\s+(\{[^}]*\})?\s+(\/)?\s+-->/g;

/**
 * Parses WordPress block markup into block objects
 */
export function parseBlocks(content: string): ParsedBlock[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // If content is already an array of blocks, return as-is
  if (Array.isArray(content)) {
    return content as ParsedBlock[];
  }

  const blocks: ParsedBlock[] = [];
  const lines = content.split('\n');
  let currentBlock: Partial<ParsedBlock> | null = null;
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for block comment
    const blockMatch = line.match(/<!--\s+wp:([a-z][a-z0-9_-]*\/)?([a-z][a-z0-9_-]*)\s+(\{[^}]*\})?\s+(\/)?\s+-->/);
    
    if (blockMatch) {
      // Save previous block if exists
      if (currentBlock) {
        finishBlock(currentBlock, currentContent, blocks);
        currentContent = [];
      }

      const [, namespace, blockType, attrsJson, selfClosing] = blockMatch;
      const blockName = namespace ? `${namespace}${blockType}` : `core/${blockType}`;
      
      let attrs = {};
      if (attrsJson) {
        try {
          attrs = JSON.parse(attrsJson);
        } catch (e) {
          console.warn('Failed to parse block attributes:', attrsJson);
        }
      }

      currentBlock = {
        blockName,
        attrs,
        innerHTML: '',
        innerContent: [],
        innerBlocks: []
      };

      // If self-closing, finish immediately
      if (selfClosing) {
        finishBlock(currentBlock, [], blocks);
        currentBlock = null;
      }
    } else if (line.includes('<!-- /wp:')) {
      // End of current block
      if (currentBlock) {
        finishBlock(currentBlock, currentContent, blocks);
        currentBlock = null;
        currentContent = [];
      }
    } else {
      // Regular content line
      currentContent.push(line);
    }
  }

  // Handle any remaining content as classic block
  if (currentContent.length > 0 || currentBlock) {
    if (currentBlock) {
      finishBlock(currentBlock, currentContent, blocks);
    } else {
      // Classic content without block markup
      const classicContent = currentContent.join('\n').trim();
      if (classicContent) {
        blocks.push({
          blockName: 'core/freeform',
          attrs: {},
          innerHTML: classicContent,
          innerContent: [classicContent],
          innerBlocks: []
        });
      }
    }
  }

  return blocks;
}

/**
 * Finishes parsing a block and adds it to the blocks array
 */
function finishBlock(
  block: Partial<ParsedBlock>, 
  content: string[], 
  blocks: ParsedBlock[]
): void {
  const innerHTML = content.join('\n').trim();
  
  blocks.push({
    blockName: block.blockName || 'o4o/paragraph',
    attrs: block.attrs || {},
    innerHTML,
    innerContent: innerHTML ? [innerHTML] : [],
    innerBlocks: block.innerBlocks || []
  });
}

/**
 * Converts blocks back to WordPress block markup
 */
export function serializeBlocks(blocks: ParsedBlock[]): string {
  return blocks.map(serializeBlock).join('\n\n');
}

/**
 * Converts a single block back to WordPress block markup
 */
export function serializeBlock(block: ParsedBlock): string {
  const { blockName, attrs, innerHTML, innerBlocks } = block;
  
  const attrsJson = Object.keys(attrs).length > 0 ? ` ${JSON.stringify(attrs)}` : '';
  
  if (innerBlocks && innerBlocks.length > 0) {
    // Block with inner blocks
    const innerContent = innerBlocks.map(serializeBlock).join('\n\n');
    return `<!-- wp:${blockName}${attrsJson} -->\n${innerHTML}\n${innerContent}\n<!-- /wp:${blockName} -->`;
  } else if (innerHTML) {
    // Block with content
    return `<!-- wp:${blockName}${attrsJson} -->\n${innerHTML}\n<!-- /wp:${blockName} -->`;
  } else {
    // Self-closing block
    return `<!-- wp:${blockName}${attrsJson} /-->`;
  }
}

/**
 * Validates if content appears to be WordPress block format
 */
export function isBlockContent(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  return content.includes('<!-- wp:') && content.includes('-->');
}

/**
 * Extracts text content from parsed blocks (for search/preview)
 */
export function extractTextFromBlocks(blocks: ParsedBlock[]): string {
  return blocks
    .map(block => extractTextFromBlock(block))
    .filter(Boolean)
    .join(' ')
    .trim();
}

/**
 * Extracts text content from a single block
 */
function extractTextFromBlock(block: ParsedBlock): string {
  let text = '';
  
  // Extract from innerHTML (strip HTML tags)
  if (block.innerHTML) {
    text += block.innerHTML.replace(/<[^>]*>/g, '').trim();
  }
  
  // Extract from inner blocks recursively
  if (block.innerBlocks && block.innerBlocks.length > 0) {
    text += ' ' + extractTextFromBlocks(block.innerBlocks);
  }
  
  return text.trim();
}

/**
 * Default fallback for unsupported content
 */
export function createFallbackBlock(content: string): ParsedBlock {
  return {
    blockName: 'core/freeform',
    attrs: {},
    innerHTML: content,
    innerContent: [content],
    innerBlocks: []
  };
}