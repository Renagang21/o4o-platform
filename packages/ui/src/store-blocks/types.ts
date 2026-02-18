/**
 * Store Block Engine — Types
 *
 * WO-STORE-BLOCK-REGISTRY-V1
 * WO-STORE-ENGINE-HARDENING-V1: channels, visibilityGuard
 *
 * Registry 기반 블록 엔진의 공용 타입 정의.
 * StoreBlockType / StoreBlock은 API entity와 동일 구조.
 */

import type { ComponentType } from 'react';

// ── Block Types (matches API entity) ────────────────────────────────────────

export type StoreBlockType =
  | 'HERO'
  | 'PRODUCT_GRID'
  | 'BLOG_LIST'
  | 'TABLET_PROMO'
  | 'SIGNAGE_PROMO'
  | 'INFO_SECTION';

export interface StoreBlock {
  type: StoreBlockType;
  enabled: boolean;
  config?: Record<string, any>;
}

// ── Data Types ──────────────────────────────────────────────────────────────

export interface StoreData {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  hero_image?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  images?: Array<{ url: string }>;
  category: string;
}

export interface BlogPostPreview {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
}

// ── Channel State ───────────────────────────────────────────────────────────

export interface StoreChannels {
  B2C: boolean;
  TABLET: boolean;
  SIGNAGE: boolean;
}

// ── Block Render Context ────────────────────────────────────────────────────

export interface BlockRenderContext {
  store: StoreData;
  slug: string;
  products: Product[];
  blogPosts: BlogPostPreview[];
  storePrefix: string;
  tabletPrefix: string;
  signagePrefix: string;
  storeId: string;
  channels: StoreChannels;
}

// ── Block Component Props ───────────────────────────────────────────────────

export interface BlockComponentProps {
  block: StoreBlock;
  context: BlockRenderContext;
}

// ── Block Definition (Registry Entry) ───────────────────────────────────────

export interface StoreBlockDefinition {
  type: StoreBlockType;
  label: string;
  description: string;
  defaultConfig: Record<string, any>;
  validate?: (config: Record<string, any>) => boolean;
  /** WO-STORE-ENGINE-HARDENING-V1: 정책/채널 기반 가시성 제어 */
  visibilityGuard?: (ctx: BlockRenderContext) => boolean;
  component: ComponentType<BlockComponentProps>;
}
