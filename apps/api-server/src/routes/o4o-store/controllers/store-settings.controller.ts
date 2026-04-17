/**
 * Store Settings Controller
 *
 * WO-STORE-COMMON-SETTINGS-FOUNDATION-V1
 *
 * Platform-wide unified Store Settings API.
 * Shared across KPA, K-Cosmetics, GlycoPharm.
 *
 * GET  /stores/:slug/settings        — public, returns settings + channels
 * PATCH /stores/:slug/settings       — owner only, deep merge update
 * GET  /stores/:slug/channels        — public, list all channels
 * PATCH /stores/:slug/channels/:type — owner only, update channel config
 *
 * Data source:
 *   - organizations.storefront_config  (JSONB, canonical)
 *   - organizations.storefront_blocks  (JSONB, legacy block override)
 *   - organizations.template_profile   (VARCHAR, deprecated fallback)
 *   - organization_channels            (rows, channel list)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import {
  StoreTemplate,
  StoreTheme,
  StoreBlock,
  StorefrontConfig,
  ChannelType,
  StoreSettingsData,
  VALID_TEMPLATES,
  VALID_THEMES,
  VALID_BLOCK_TYPES,
  VALID_CHANNEL_TYPES,
} from '../store-settings.types.js';

// ── Default Blocks per Template ───────────────────────────────────────────────

function generateDefaultBlocks(template: StoreTemplate): StoreBlock[] {
  switch (template) {
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

// Legacy template_profile name → StoreTemplate mapping
const LEGACY_TEMPLATE_MAP: Record<string, StoreTemplate> = {
  standard: 'BASIC',
  compact: 'MINIMAL',
  visual: 'CONTENT_FOCUS',
  minimal: 'MINIMAL',
  BASIC: 'BASIC',
  COMMERCE_FOCUS: 'COMMERCE_FOCUS',
  CONTENT_FOCUS: 'CONTENT_FOCUS',
  MINIMAL: 'MINIMAL',
};

function normalizeTemplate(raw: string | null | undefined): StoreTemplate {
  if (!raw) return 'BASIC';
  return LEGACY_TEMPLATE_MAP[raw] ?? 'BASIC';
}

// ── Merge Helpers ─────────────────────────────────────────────────────────────

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (sv !== null && typeof sv === 'object' && !Array.isArray(sv)
        && tv !== null && typeof tv === 'object' && !Array.isArray(tv)) {
      result[key] = deepMerge(tv, sv);
    } else {
      result[key] = sv;
    }
  }
  return result;
}

// ── Channel Config Validators ─────────────────────────────────────────────────

function validateChannelConfig(type: ChannelType, config: Record<string, any>): string | null {
  if (typeof config.enabled !== 'boolean') return 'config.enabled must be boolean';

  switch (type) {
    case 'B2C':
      if (config.visibilityMode !== undefined
          && config.visibilityMode !== 'PUBLIC'
          && config.visibilityMode !== 'PRIVATE') {
        return 'visibilityMode must be PUBLIC or PRIVATE';
      }
      if (config.productLimit !== undefined
          && (typeof config.productLimit !== 'number' || config.productLimit < 1)) {
        return 'productLimit must be a positive number';
      }
      break;
    case 'KIOSK':
      if (config.pin !== undefined && typeof config.pin !== 'string') return 'pin must be string';
      if (config.autoResetMinutes !== undefined
          && (typeof config.autoResetMinutes !== 'number' || config.autoResetMinutes < 0)) {
        return 'autoResetMinutes must be a non-negative number';
      }
      break;
    case 'TABLET':
      if (config.pin !== undefined && typeof config.pin !== 'string') return 'pin must be string';
      if (config.slideShowIntervalSeconds !== undefined
          && (typeof config.slideShowIntervalSeconds !== 'number' || config.slideShowIntervalSeconds < 1)) {
        return 'slideShowIntervalSeconds must be a positive number';
      }
      break;
    case 'SIGNAGE':
      if (config.playlistId !== undefined && typeof config.playlistId !== 'string') return 'playlistId must be string';
      if (config.autoRotateSeconds !== undefined
          && (typeof config.autoRotateSeconds !== 'number' || config.autoRotateSeconds < 1)) {
        return 'autoRotateSeconds must be a positive number';
      }
      break;
  }
  return null;
}

// ── Controller Factory ────────────────────────────────────────────────────────

export function createStoreSettingsController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const slugService = new StoreSlugService(dataSource);

  async function resolveOrg(slug: string): Promise<{ id: string; name: string; storefront_config: any; storefront_blocks: any; template_profile: string | null } | null> {
    const record = await slugService.findBySlug(slug);
    if (!record || !record.isActive) return null;
    const rows: any[] = await dataSource.query(
      `SELECT id, name, storefront_config, storefront_blocks, template_profile
       FROM organizations WHERE id = $1 AND "isActive" = true LIMIT 1`,
      [record.storeId],
    );
    return rows[0] ?? null;
  }

  async function checkOwner(userId: string, organizationId: string): Promise<boolean> {
    const rows: any[] = await dataSource.query(
      `SELECT id FROM organization_members
       WHERE user_id = $1 AND organization_id = $2
         AND role IN ('owner', 'admin', 'manager')
         AND left_at IS NULL
       LIMIT 1`,
      [userId, organizationId],
    );
    return rows.length > 0;
  }

  async function fetchChannels(organizationId: string) {
    return dataSource.query<Array<{
      id: string;
      channel_type: string;
      status: string;
      config: any;
      approved_at: string | null;
      created_at: string;
    }>>(
      `SELECT id, channel_type, status, config, approved_at, created_at
       FROM organization_channels
       WHERE organization_id = $1
       ORDER BY created_at ASC`,
      [organizationId],
    );
  }

  function buildSettingsData(org: any, channels: any[]): StoreSettingsData {
    const cfg: StorefrontConfig = org.storefront_config ?? {};
    const template = normalizeTemplate(cfg.template ?? org.template_profile);

    // Block fallback chain: storefront_blocks → storefront_config.blocks → generateDefaultBlocks
    let blocks: StoreBlock[];
    if (Array.isArray(org.storefront_blocks) && org.storefront_blocks.length > 0) {
      blocks = org.storefront_blocks;
    } else if (Array.isArray(cfg.blocks) && cfg.blocks.length > 0) {
      blocks = cfg.blocks;
    } else {
      blocks = generateDefaultBlocks(template);
    }

    return {
      storeId: org.id,
      slug: '', // filled by caller
      settings: {
        template,
        theme: (cfg.theme as StoreTheme) ?? 'professional',
        blocks,
        components: cfg.components ?? {},
        customizations: cfg.customizations ?? {},
      },
      channels: channels.map((ch) => ({
        id: ch.id,
        type: ch.channel_type as ChannelType,
        status: ch.status,
        config: ch.config ?? null,
        approvedAt: ch.approved_at ?? null,
        createdAt: ch.created_at,
      })),
    };
  }

  // ── GET /:slug/settings ────────────────────────────────────────────────────

  router.get('/:slug/settings', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const org = await resolveOrg(slug);
      if (!org) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      const channels = await fetchChannels(org.id);
      const data = buildSettingsData(org, channels);
      data.slug = slug;

      res.json({ success: true, data });
    } catch (e: any) {
      console.error('[StoreSettings] GET settings error:', e);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch settings' } });
    }
  });

  // ── PATCH /:slug/settings ──────────────────────────────────────────────────

  router.patch('/:slug/settings', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const userId = (req as any).user?.id;

      const org = await resolveOrg(slug);
      if (!org) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !(await checkOwner(userId, org.id))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this store' } });
        return;
      }

      const patch = req.body ?? {};

      // Validate individual fields if present
      if (patch.template !== undefined && !VALID_TEMPLATES.includes(patch.template)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_TEMPLATE', message: `template must be one of: ${VALID_TEMPLATES.join(', ')}` } });
        return;
      }
      if (patch.theme !== undefined && !VALID_THEMES.includes(patch.theme)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_THEME', message: `theme must be one of: ${VALID_THEMES.join(', ')}` } });
        return;
      }
      if (patch.blocks !== undefined) {
        if (!Array.isArray(patch.blocks) || patch.blocks.length === 0) {
          res.status(400).json({ success: false, error: { code: 'INVALID_BLOCKS', message: 'blocks must be a non-empty array' } });
          return;
        }
        for (const b of patch.blocks) {
          if (!VALID_BLOCK_TYPES.includes(b.type)) {
            res.status(400).json({ success: false, error: { code: 'INVALID_BLOCK_TYPE', message: `Unknown block type: ${b.type}` } });
            return;
          }
          if (typeof b.enabled !== 'boolean') {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `block.enabled must be boolean for type: ${b.type}` } });
            return;
          }
        }
      }

      // Deep merge into existing storefront_config
      const existing: StorefrontConfig = org.storefront_config ?? {};
      const updated: StorefrontConfig = { ...existing };

      if (patch.template !== undefined) updated.template = patch.template;
      if (patch.theme !== undefined) updated.theme = patch.theme;
      if (patch.blocks !== undefined) {
        // blocks = full replace
        updated.blocks = patch.blocks;
      }
      if (patch.components !== undefined && typeof patch.components === 'object') {
        // components = shallow merge (per-key override)
        updated.components = { ...(existing.components ?? {}), ...patch.components };
      }
      if (patch.customizations !== undefined && typeof patch.customizations === 'object') {
        // customizations = deep merge
        updated.customizations = deepMerge(existing.customizations ?? {}, patch.customizations);
      }

      // Write storefront_config; if blocks changed also sync storefront_blocks for backward compat
      if (patch.blocks !== undefined) {
        await dataSource.query(
          `UPDATE organizations SET storefront_config = $1::jsonb, storefront_blocks = $2::jsonb, "updatedAt" = NOW()
           WHERE id = $3`,
          [JSON.stringify(updated), JSON.stringify(patch.blocks), org.id],
        );
      } else {
        await dataSource.query(
          `UPDATE organizations SET storefront_config = $1::jsonb, "updatedAt" = NOW()
           WHERE id = $2`,
          [JSON.stringify(updated), org.id],
        );
      }

      const channels = await fetchChannels(org.id);
      const data = buildSettingsData({ ...org, storefront_config: updated, storefront_blocks: patch.blocks ?? org.storefront_blocks }, channels);
      data.slug = slug;

      res.json({ success: true, data });
    } catch (e: any) {
      console.error('[StoreSettings] PATCH settings error:', e);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update settings' } });
    }
  });

  // ── GET /:slug/channels ────────────────────────────────────────────────────

  router.get('/:slug/channels', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const org = await resolveOrg(slug);
      if (!org) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      const channels = await fetchChannels(org.id);
      res.json({
        success: true,
        data: channels.map((ch) => ({
          id: ch.id,
          type: ch.channel_type as ChannelType,
          status: ch.status,
          config: ch.config ?? null,
          approvedAt: ch.approved_at ?? null,
          createdAt: ch.created_at,
        })),
      });
    } catch (e: any) {
      console.error('[StoreSettings] GET channels error:', e);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch channels' } });
    }
  });

  // ── PATCH /:slug/channels/:type ────────────────────────────────────────────

  router.patch('/:slug/channels/:type', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug, type } = req.params;
      const channelType = type.toUpperCase() as ChannelType;
      const userId = (req as any).user?.id;

      if (!VALID_CHANNEL_TYPES.includes(channelType)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_CHANNEL_TYPE', message: `type must be one of: ${VALID_CHANNEL_TYPES.join(', ')}` } });
        return;
      }

      const org = await resolveOrg(slug);
      if (!org) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !(await checkOwner(userId, org.id))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this store' } });
        return;
      }

      const config = req.body ?? {};
      if (typeof config !== 'object' || Array.isArray(config)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' } });
        return;
      }

      const validationError = validateChannelConfig(channelType, config);
      if (validationError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validationError } });
        return;
      }

      // Fetch existing channel row
      const rows: any[] = await dataSource.query(
        `SELECT id, config FROM organization_channels WHERE organization_id = $1 AND channel_type = $2 LIMIT 1`,
        [org.id, channelType],
      );

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: { code: 'CHANNEL_NOT_FOUND', message: `No ${channelType} channel registered for this store` } });
        return;
      }

      const existing = rows[0];
      // Merge config (shallow: top-level keys)
      const mergedConfig = { ...(existing.config ?? {}), ...config };

      await dataSource.query(
        `UPDATE organization_channels SET config = $1::jsonb, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(mergedConfig), existing.id],
      );

      res.json({
        success: true,
        data: {
          id: existing.id,
          type: channelType,
          config: mergedConfig,
        },
      });
    } catch (e: any) {
      console.error('[StoreSettings] PATCH channel error:', e);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update channel config' } });
    }
  });

  return router;
}
