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
 *   - organizations.template_profile   (VARCHAR, deprecated fallback — 아래 참조)
 *   - organization_channels            (rows, channel list)
 *
 * WO-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1:
 *   PATCH 에 optional `applyTemplateDefaults` 추가(additive, 미전송 시 기존 동작 불변).
 *   true 면 대상 템플릿의 기본 blocks 를 서버에서 생성해 storefront_blocks 에 반영한다.
 *   또한 template 이 변경되면 template_profile 을 같은 값으로 동기화한다 —
 *   공개 매장 홈이 storefront_blocks 부재 시 template_profile 로 기본 blocks 를 만들기 때문에,
 *   두 필드가 갈라지면 canonical 화면의 템플릿 선택이 매장 홈에 반영되지 않는다.
 *   template_profile 은 소비처 전환이 끝날 때까지 호환 필드로 동기화만 유지한다(삭제 아님).
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import {
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
// WO-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1:
//   템플릿 기본 blocks 생성 + 저장 시 blocks 결정 규칙을 순수 모듈로 분리(단위 테스트 대상).
import {
  generateDefaultBlocks,
  normalizeTemplate,
  resolveTemplateAndBlocks,
} from '../store-settings-template.js';

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
      // WO-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1: 명시 신호만 신뢰(휴리스틱 금지)
      if (patch.applyTemplateDefaults !== undefined && typeof patch.applyTemplateDefaults !== 'boolean') {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'applyTemplateDefaults must be boolean' } });
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

      // WO-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1:
      //   저장 전 상태(현재 template/blocks)를 기준으로 최종 template·blocks 를 결정한다.
      //   applyTemplateDefaults=true 인 경우에만 요청 blocks 대신 템플릿 기본 blocks 를 쓴다.
      const current = buildSettingsData(org, []);
      const resolved = resolveTemplateAndBlocks({
        currentTemplate: current.settings.template,
        currentBlocks: current.settings.blocks,
        patchTemplate: patch.template,
        patchBlocks: patch.blocks,
        applyTemplateDefaults: patch.applyTemplateDefaults,
      });

      if (patch.template !== undefined) updated.template = resolved.template;
      if (patch.theme !== undefined) updated.theme = patch.theme;
      if (resolved.blocksChanged) {
        // blocks = full replace
        updated.blocks = resolved.blocks;
      }
      // WO-O4O-STORE-HOME-DESIGN-UNUSED-FIELDS-CLEANUP-V1:
      //   components/customizations 고아 필드 제거 — 수용/병합 로직 삭제(미참조·데이터 0).

      // Write storefront_config (+ storefront_blocks / template_profile 동기화)
      const setClauses: string[] = ['storefront_config = $1::jsonb'];
      const params: any[] = [JSON.stringify(updated)];
      if (resolved.blocksChanged) {
        params.push(JSON.stringify(resolved.blocks));
        setClauses.push(`storefront_blocks = $${params.length}::jsonb`);
      }
      if (patch.template !== undefined) {
        // 공개 매장 홈의 blocks 부재 fallback 이 template_profile 이므로 canonical 과 일치시킨다.
        params.push(resolved.template);
        setClauses.push(`template_profile = $${params.length}`);
      }
      setClauses.push('"updatedAt" = NOW()');
      params.push(org.id);
      await dataSource.query(
        `UPDATE organizations SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
        params,
      );

      const channels = await fetchChannels(org.id);
      const data = buildSettingsData(
        {
          ...org,
          storefront_config: updated,
          storefront_blocks: resolved.blocksChanged ? resolved.blocks : org.storefront_blocks,
          template_profile: patch.template !== undefined ? resolved.template : org.template_profile,
        },
        channels,
      );
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
