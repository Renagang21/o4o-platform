/**
 * Block Registry — Default categories & metadata conversion
 *
 * WO-O4O-BLOCK-REGISTRY-SERVICE-SPLIT-V1
 * Extracted from block-registry.service.ts
 */

import type {
  BlockInfo,
  BlockCategory,
} from '../../types/block.types.js';

// Phase P0-C: Import metadata from SSOT
// TEMP FIX: Commented out to prevent server crash during deployment
// TODO: Re-enable once package exports are properly configured
// import { blockMetadata, type BlockMetadata } from '@o4o/block-renderer/metadata';

// Temporary fallback - AI block features disabled
export const blockMetadata: any[] = [];
export type BlockMetadata = any;

/**
 * 기본 카테고리 목록
 */
export function getDefaultCategories(): BlockCategory[] {
  return [
    {
      name: 'text',
      title: '텍스트',
      icon: 'text',
      priority: 1
    },
    {
      name: 'media',
      title: '미디어',
      icon: 'image',
      priority: 2
    },
    {
      name: 'design',
      title: '디자인',
      icon: 'palette',
      priority: 3
    },
    {
      name: 'layout',
      title: '레이아웃',
      icon: 'layout',
      priority: 4
    },
    {
      name: 'widgets',
      title: '위젯',
      icon: 'widget',
      priority: 5
    },
    {
      name: 'embed',
      title: '임베드',
      icon: 'link',
      priority: 6
    },
    {
      name: 'common',
      title: '일반',
      icon: 'star',
      priority: 7
    }
  ];
}

/**
 * Phase P0-C: Convert BlockMetadata to BlockInfo
 */
export function metadataToInfo(meta: BlockMetadata): BlockInfo {
  return {
    name: meta.name,
    title: meta.title,
    description: meta.description,
    category: meta.category,
    attributes: meta.attributes || {},
    example: meta.example || { json: '', text: '' },
    version: meta.version || '1.0.0',
    tags: meta.tags || [],
    aiPrompts: meta.aiPrompts || [],
    deprecated: meta.deprecated,
    replacedBy: meta.replacedBy
  };
}
