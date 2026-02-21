/**
 * Store Block Registry — Central Block Registration
 *
 * WO-STORE-BLOCK-REGISTRY-V1
 *
 * 블록 타입 추가 = 블록 파일 1개 + registry 등록 1줄.
 * switch/case 없이 O(1) lookup.
 */

import type { StoreBlockType, StoreBlockDefinition } from './types';
import {
  HeroBlockDef,
  ProductGridBlockDef,
  BlogListBlockDef,
  TabletPromoBlockDef,
  SignagePromoBlockDef,
  InfoSectionBlockDef,
} from './blocks';

export const StoreBlockRegistry: Record<StoreBlockType, StoreBlockDefinition> = {
  HERO: HeroBlockDef,
  PRODUCT_GRID: ProductGridBlockDef,
  BLOG_LIST: BlogListBlockDef,
  TABLET_PROMO: TabletPromoBlockDef,
  SIGNAGE_PROMO: SignagePromoBlockDef,
  INFO_SECTION: InfoSectionBlockDef,
};

/** All registered block types */
export const ALL_BLOCK_TYPES: StoreBlockType[] = Object.keys(StoreBlockRegistry) as StoreBlockType[];
