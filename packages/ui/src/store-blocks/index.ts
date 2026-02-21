/**
 * Store Block Engine — Public API
 *
 * WO-STORE-BLOCK-REGISTRY-V1
 *
 * Usage:
 *   import { StoreBlockRegistry, type StoreBlock, type BlockRenderContext } from '@o4o/ui';
 *
 *   const def = StoreBlockRegistry[block.type];
 *   const BlockComponent = def.component;
 *   return <BlockComponent block={block} context={context} />;
 */

export type {
  StoreBlockType,
  StoreBlock,
  StoreBlockDefinition,
  StoreChannels,
  BlockRenderContext,
  BlockComponentProps,
  StoreData,
  Product,
  BlogPostPreview,
} from './types';

export { StoreBlockRegistry, ALL_BLOCK_TYPES } from './registry';
