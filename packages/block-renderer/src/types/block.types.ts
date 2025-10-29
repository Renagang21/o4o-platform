/**
 * Block Type Definitions
 * Unified block types for all renderers
 */

import { ReactNode } from 'react';

/**
 * Base Block Structure
 * Compatible with WordPress Gutenberg and custom blocks
 */
export interface Block {
  id?: string;
  clientId?: string;
  type: string;
  name?: string; // WordPress uses 'name' instead of 'type'
  data?: Record<string, any>;
  attributes?: Record<string, any>;
  content?: any;
  innerBlocks?: Block[];
  innerHTML?: string;
  innerContent?: (string | null)[];
}

/**
 * Block Component Props
 */
export interface BlockRendererProps {
  block: Block;
  children?: ReactNode;
}

/**
 * Block Component Type
 */
export type BlockComponent = React.FC<BlockRendererProps>;

/**
 * Block Registry Entry
 */
export interface BlockRegistryEntry {
  type: string;
  component: BlockComponent;
  lazy?: boolean;
}

/**
 * WordPress Block (for parsing)
 */
export interface WordPressBlock {
  clientId?: string;
  name: string;
  attributes: Record<string, any>;
  innerBlocks?: WordPressBlock[];
  innerHTML?: string;
  innerContent?: (string | null)[];
}
