/**
 * Store Layout Controller
 *
 * WO-STORE-BLOCK-ENGINE-V1
 * WO-STORE-ENGINE-HARDENING-V1: Registry 기반 검증 + channel 가시성
 * WO-STORE-CHANNEL-SOURCE-UNIFICATION-V1: organization_channels 단일 소스
 *
 * GET  /stores/:slug/layout — 블록 레이아웃 조회 (public) + channels
 * PUT  /stores/:slug/layout — 블록 레이아웃 저장 (owner only, 강화 검증)
 *
 * storefront_blocks가 NULL이면 template_profile에서 기본 블록 생성 (fallback).
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import type { StoreBlockType, StoreBlock, TemplateProfile } from '../entities/glycopharm-pharmacy.entity.js';
import type { AuthRequest } from '../../../types/auth.js';

// ── Valid Block Types ───────────────────────────────────────────────────────

const VALID_BLOCK_TYPES: StoreBlockType[] = [
  'HERO', 'PRODUCT_GRID', 'BLOG_LIST', 'TABLET_PROMO', 'SIGNAGE_PROMO', 'INFO_SECTION',
];

// ── Block Default Configs (mirror of frontend registry) ─────────────────────

const BLOCK_DEFAULT_CONFIGS: Record<StoreBlockType, Record<string, any>> = {
  HERO: {},
  PRODUCT_GRID: { limit: 4, mode: 'single' },
  BLOG_LIST: { limit: 3 },
  TABLET_PROMO: {},
  SIGNAGE_PROMO: {},
  INFO_SECTION: {},
};

// ── Block Config Validators ─────────────────────────────────────────────────

const BLOCK_CONFIG_VALIDATORS: Partial<Record<StoreBlockType, (config: Record<string, any>) => boolean>> = {
  PRODUCT_GRID: (c) => {
    // limit validation
    if (typeof c.limit !== 'number' || c.limit < 1 || c.limit > 12) return false;
    // mode validation (optional, defaults to 'single')
    if (c.mode !== undefined && c.mode !== 'single' && c.mode !== 'multi') return false;
    // services validation (required for multi mode)
    if (c.mode === 'multi') {
      const ALLOWED = ['glycopharm', 'kpa', 'cosmetics'];
      if (!Array.isArray(c.services) || c.services.length === 0) return false;
      if (!c.services.every((s: any) => typeof s === 'string' && ALLOWED.includes(s))) return false;
    }
    // services must not exist in single mode
    if (c.mode === 'single' && c.services !== undefined) return false;
    return true;
  },
  BLOG_LIST: (c) => typeof c.limit === 'number' && c.limit >= 1 && c.limit <= 12,
};

// ── Template Profile → Default Blocks ───────────────────────────────────────

function generateDefaultBlocks(profile: TemplateProfile): StoreBlock[] {
  switch (profile) {
    case 'COMMERCE_FOCUS':
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
      ];
    case 'CONTENT_FOCUS':
      return [
        { type: 'HERO', enabled: true },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
        { type: 'INFO_SECTION', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
      ];
    case 'MINIMAL':
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
      ];
    case 'BASIC':
    default:
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
        { type: 'TABLET_PROMO', enabled: true },
      ];
  }
}

// ── Detailed Block Validation ───────────────────────────────────────────────

/** Returns error object if invalid, null if valid */
function validateBlocksDetailed(
  blocks: any,
): { code: string; message: string } | null {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { code: 'VALIDATION_ERROR', message: 'blocks must be a non-empty array' };
  }

  const seen = new Set<string>();
  for (const block of blocks) {
    if (!block || typeof block !== 'object') {
      return { code: 'VALIDATION_ERROR', message: 'Each block must be an object' };
    }
    if (!VALID_BLOCK_TYPES.includes(block.type)) {
      return { code: 'INVALID_BLOCK_TYPE', message: `Unknown block type: ${block.type}` };
    }
    if (typeof block.enabled !== 'boolean') {
      return { code: 'VALIDATION_ERROR', message: `block.enabled must be boolean for type: ${block.type}` };
    }
    if (seen.has(block.type)) {
      return { code: 'VALIDATION_ERROR', message: `Duplicate block type: ${block.type}` };
    }
    seen.add(block.type);

    // Deep-merge config with defaults and validate
    const defaultConfig = BLOCK_DEFAULT_CONFIGS[block.type as StoreBlockType];
    const mergedConfig = { ...defaultConfig, ...(block.config && typeof block.config === 'object' ? block.config : {}) };
    const validator = BLOCK_CONFIG_VALIDATORS[block.type as StoreBlockType];
    if (validator && !validator(mergedConfig)) {
      return { code: 'INVALID_BLOCK_CONFIG', message: `Invalid config for block type: ${block.type}` };
    }
  }

  return null;
}

// ── Channel Derivation (organization_channels 단일 소스) ─────────────────────
// WO-STORE-CHANNEL-SOURCE-UNIFICATION-V1
// pharmacy.id ≡ kpa_organization.id (PK 공유)

async function deriveChannels(
  dataSource: DataSource,
  organizationId: string,
): Promise<{ B2C: boolean; TABLET: boolean; SIGNAGE: boolean }> {
  const rows: Array<{ channel_type: string }> = await dataSource.query(
    `SELECT channel_type FROM organization_channels WHERE organization_id = $1 AND status = 'APPROVED'`,
    [organizationId],
  );
  const approved = new Set(rows.map((r) => r.channel_type));
  return {
    B2C: approved.has('B2C'),
    TABLET: approved.has('TABLET'),
    SIGNAGE: approved.has('SIGNAGE'),
  };
}

// ── Controller Factory ──────────────────────────────────────────────────────

export function createLayoutController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);

  // GET /:slug/layout — public
  router.get('/:slug/layout', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug, status: 'active' as any } });

      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      const hasCustomBlocks = pharmacy.storefront_blocks && pharmacy.storefront_blocks.length > 0;
      const blocks = hasCustomBlocks
        ? pharmacy.storefront_blocks!
        : generateDefaultBlocks(pharmacy.template_profile);

      const channels = await deriveChannels(dataSource, pharmacy.id);

      res.json({
        success: true,
        data: {
          storeId: pharmacy.id,
          templateProfile: pharmacy.template_profile || 'BASIC',
          blocks,
          isDefault: !hasCustomBlocks,
          channels,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch layout' },
      });
    }
  });

  // PUT /:slug/layout — authenticated, owner only
  router.put('/:slug/layout', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { blocks } = req.body;

      // Detailed validation with specific error codes
      const validationError = validateBlocksDetailed(blocks);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: validationError,
        });
        return;
      }

      const pharmacy = await pharmacyRepo.findOne({ where: { slug, status: 'active' as any } });
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || pharmacy.created_by_user_id !== userId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      // Sanitize: strip unknown fields, deep-merge config with defaults
      const sanitized: StoreBlock[] = blocks.map((b: any) => {
        const defaultConfig = BLOCK_DEFAULT_CONFIGS[b.type as StoreBlockType] || {};
        const userConfig = b.config && typeof b.config === 'object' ? b.config : {};
        const mergedConfig = { ...defaultConfig, ...userConfig };
        return {
          type: b.type,
          enabled: b.enabled,
          ...(Object.keys(mergedConfig).length > 0 ? { config: mergedConfig } : {}),
        };
      });

      await pharmacyRepo.update(pharmacy.id, { storefront_blocks: sanitized });

      res.json({ success: true, data: { blocks: sanitized } });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update layout' },
      });
    }
  });

  return router;
}
