/**
 * Core Module Exports
 * JSX → O4O Block conversion engine
 */

// Main conversion API
export { convertJSXToBlocks, convertJSXToPage, validateJSX } from './converter';
export type { ConversionResult } from './converter';

// Low-level modules (for advanced usage)
export { parseJSXCode, extractTextContent } from './jsx-parser';
export { convertReactToBlocks, mapReactElementToBlock } from './block-mapper';
export { TailwindMapper } from './tailwind-mapper';
export {
  createPlaceholderBlock,
  shouldCreatePlaceholder,
  extractPlaceholders,
  serializeJSX,
} from './placeholder';

// Types
export type { Block, ReactElement, PageData } from './types';
