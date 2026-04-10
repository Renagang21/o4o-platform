/**
 * KPA Block Adapter
 *
 * WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1 Phase 1
 *
 * KPA 블록 포맷 ↔ BlockRenderer 포맷 변환
 *
 * KPA:           { type: 'text', content: '...' }
 * BlockRenderer: { type: 'paragraph', data: { content: '...' } }
 */

import type { Block } from '@o4o/block-renderer';

/** KPA 원본 블록 타입 (kpa_contents.blocks, kpa_working_contents.edited_blocks) */
export interface KpaBlock {
  type: 'text' | 'image' | 'list' | string;
  content?: string;
  url?: string;
  items?: string[];
}

const KPA_TO_RENDERER: Record<string, string> = {
  text: 'paragraph',
  image: 'image',
  list: 'list',
};

const RENDERER_TO_KPA: Record<string, string> = {
  paragraph: 'text',
  'o4o/paragraph': 'text',
  'core/paragraph': 'text',
  image: 'image',
  'o4o/image': 'image',
  'core/image': 'image',
  list: 'list',
  'o4o/list': 'list',
  'core/list': 'list',
};

/** KPA 블록 → BlockRenderer 블록 */
export function kpaBlockToRendererBlock(block: KpaBlock): Block {
  const rendererType = KPA_TO_RENDERER[block.type] || block.type;

  const data: Record<string, any> = {};
  if (block.content !== undefined) data.content = block.content;
  if (block.url !== undefined) data.url = block.url;
  if (block.items !== undefined) data.items = block.items;

  return { type: rendererType, data };
}

/** KPA 블록 배열 → BlockRenderer 블록 배열 */
export function kpaBlocksToRendererBlocks(blocks: KpaBlock[]): Block[] {
  return blocks.map(kpaBlockToRendererBlock);
}

/** BlockRenderer 블록 → KPA 블록 (편집 후 저장용) */
export function rendererBlockToKpaBlock(block: Block): KpaBlock {
  const kpaType = RENDERER_TO_KPA[block.type] || block.type;
  const data = block.data || block.attributes || {};

  const result: KpaBlock = { type: kpaType };
  if (data.content !== undefined) result.content = data.content;
  if (data.url !== undefined) result.url = data.url;
  if (data.items !== undefined) result.items = data.items;

  return result;
}
