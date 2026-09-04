/**
 * Platform Store Policy & Payment Config Routes
 *
 * WO-CORE-STORE-POLICY-SYSTEM-V1
 * WO-CORE-STORE-PAYMENT-CONFIG-V1
 *
 * Policy:
 *   GET  /api/v1/stores/:slug/policies — Public: Get active policies
 *   PUT  /api/v1/stores/:slug/policies — Owner only: Create/update policies
 *
 * Payment Config:
 *   GET  /api/v1/stores/:slug/payment-config — Owner only: Get config (secrets masked)
 *   PUT  /api/v1/stores/:slug/payment-config — Owner only: Create/update config
 *
 * B2C Channel:
 *   (RETIRED — WO-O4O-FINAL-CODE-ONLY-RETIREMENT-CLOSURE-V1 §13)
 *
 * Slug Management:
 *   GET  /api/v1/stores/:slug/slug/can-change — Owner only: Check if slug change is allowed
 *   PUT  /api/v1/stores/:slug/slug — Owner only: Change slug (1-time, records history)
 *   GET  /api/v1/stores/resolve/:slug — Public: Resolve slug (301 redirect for old slugs)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { StoreSlugService, normalizeSlug } from '@o4o/platform-core/store-identity';
import { StorePolicyService, PaymentConfigService } from '@o4o/platform-core/store-policy';
import { authenticate } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';
import { encrypt, decrypt, isEncryptionKeyConfigured } from '../../utils/crypto.js';
import { isStoreOwner } from './store-policy.ownership.js';

/**
 * Mask a string, showing only last 4 characters.
 */
function maskSecret(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
}

/**
 * Shared helper: resolve slug and verify ownership.
 * Returns null and sends error response if validation fails.
 */
async function resolveAndAuthorize(
  dataSource: DataSource,
  req: Request,
  res: Response,
): Promise<{ storeId: string; serviceKey: string; userId: string } | null> {
  const { slug } = req.params;
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id || authReq.authUser?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return null;
  }

  const slugService = new StoreSlugService(dataSource);
  const slugRecord = await slugService.findBySlug(slug);

  if (!slugRecord || !slugRecord.isActive) {
    res.status(404).json({
      success: false,
      error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
    });
    return null;
  }

  const isOwner = await isStoreOwner(dataSource, slugRecord.storeId, slugRecord.serviceKey, userId);
  if (!isOwner) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Not the owner of this store' },
    });
    return null;
  }

  return { storeId: slugRecord.storeId, serviceKey: slugRecord.serviceKey, userId };
}

export function createStorePolicyRoutes(dataSource: DataSource): Router {
  const router = Router();

  // ==========================================================================
  // Policy Endpoints
  // ==========================================================================

  /**
   * GET /api/v1/stores/:slug/policies — Public
   */
  router.get('/:slug/policies', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;

      const slugService = new StoreSlugService(dataSource);
      const slugRecord = await slugService.findBySlug(slug);

      if (!slugRecord || !slugRecord.isActive) {
        // WO-STORE-SLUG-REDIRECT-LAYER-V1: old slug → 301 redirect
        const redirect = await slugService.findOldSlugRedirect(slug);
        if (redirect) {
          const newPath = req.originalUrl.replace(
            `/${encodeURIComponent(slug)}`,
            `/${encodeURIComponent(redirect.newSlug)}`,
          );
          res.redirect(301, newPath);
          return;
        }
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      const policyService = new StorePolicyService(dataSource);
      const policy = await policyService.getActivePolicy(slugRecord.storeId, slugRecord.serviceKey);

      if (!policy) {
        res.json({
          success: true,
          data: {
            termsOfService: null,
            privacyPolicy: null,
            refundPolicy: null,
            shippingPolicy: null,
            version: 0,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          termsOfService: policy.termsOfService,
          privacyPolicy: policy.privacyPolicy,
          refundPolicy: policy.refundPolicy,
          shippingPolicy: policy.shippingPolicy,
          version: policy.version,
          updatedAt: policy.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('[StorePolicyRoutes] GET /:slug/policies error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch store policies' },
      });
    }
  });

  /**
   * PUT /api/v1/stores/:slug/policies — Owner only
   */
  router.put('/:slug/policies', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = await resolveAndAuthorize(dataSource, req, res);
      if (!ctx) return;

      const { termsOfService, privacyPolicy, refundPolicy, shippingPolicy } = req.body;

      const policyService = new StorePolicyService(dataSource);
      const newPolicy = await policyService.upsertPolicy({
        storeId: ctx.storeId,
        serviceKey: ctx.serviceKey as any,
        termsOfService,
        privacyPolicy,
        refundPolicy,
        shippingPolicy,
      });

      res.json({
        success: true,
        data: {
          termsOfService: newPolicy.termsOfService,
          privacyPolicy: newPolicy.privacyPolicy,
          refundPolicy: newPolicy.refundPolicy,
          shippingPolicy: newPolicy.shippingPolicy,
          version: newPolicy.version,
          updatedAt: newPolicy.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('[StorePolicyRoutes] PUT /:slug/policies error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update store policies' },
      });
    }
  });

  // ==========================================================================
  // Payment Config Endpoints
  // ==========================================================================

  /**
   * GET /api/v1/stores/:slug/payment-config — Owner only
   * Secrets are masked in response.
   */
  router.get('/:slug/payment-config', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = await resolveAndAuthorize(dataSource, req, res);
      if (!ctx) return;

      const configService = new PaymentConfigService(dataSource);
      const config = await configService.getActiveConfig(ctx.storeId, ctx.serviceKey as any);

      if (!config) {
        res.json({
          success: true,
          data: null,
        });
        return;
      }

      // Decrypt for masking
      let decryptedKey: string | null = null;
      let decryptedSecret: string | null = null;
      try {
        if (config.apiKey) decryptedKey = decrypt(config.apiKey);
        if (config.apiSecret) decryptedSecret = decrypt(config.apiSecret);
      } catch {
        // If decryption fails, show fully masked
      }

      res.json({
        success: true,
        data: {
          provider: config.provider,
          mode: config.mode,
          merchantId: maskSecret(config.merchantId),
          apiKey: maskSecret(decryptedKey),
          apiSecret: maskSecret(decryptedSecret),
          isActive: config.isActive,
          version: config.version,
          updatedAt: config.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('[StorePolicyRoutes] GET /:slug/payment-config error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payment config' },
      });
    }
  });

  /**
   * PUT /api/v1/stores/:slug/payment-config — Owner only
   * apiKey/apiSecret are encrypted before storage.
   */
  router.put('/:slug/payment-config', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = await resolveAndAuthorize(dataSource, req, res);
      if (!ctx) return;

      const { provider, mode, merchantId, apiKey, apiSecret } = req.body;

      // Validate required fields
      if (!provider || !merchantId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'provider and merchantId are required' },
        });
        return;
      }

      const VALID_PROVIDERS = ['inicis', 'toss', 'nicepay', 'kakaopay'];
      if (!VALID_PROVIDERS.includes(provider)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PROVIDER', message: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` },
        });
        return;
      }

      const VALID_MODES = ['test', 'live'];
      if (mode && !VALID_MODES.includes(mode)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_MODE', message: 'mode must be test or live' },
        });
        return;
      }

      // Encrypt sensitive fields
      // WO-O4O-ENCRYPTION-KEY-CANONICAL-ROLLOUT-V1 §5 — 키 미설정 시 약한 키로 저장하지 않고 거부한다
      if ((apiKey || apiSecret) && !isEncryptionKeyConfigured()) {
        res.status(503).json({
          success: false,
          error: {
            code: 'ENCRYPTION_KEY_NOT_CONFIGURED',
            message: '서버에 암호화 키가 설정되지 않아 결제 credential 을 저장할 수 없습니다',
          },
        });
        return;
      }
      const encryptedKey = apiKey ? encrypt(apiKey) : null;
      const encryptedSecret = apiSecret ? encrypt(apiSecret) : null;

      const configService = new PaymentConfigService(dataSource);
      const newConfig = await configService.upsertConfig({
        storeId: ctx.storeId,
        serviceKey: ctx.serviceKey as any,
        provider,
        mode: mode || 'test',
        merchantId,
        apiKey: encryptedKey,
        apiSecret: encryptedSecret,
      });

      res.json({
        success: true,
        data: {
          provider: newConfig.provider,
          mode: newConfig.mode,
          merchantId: maskSecret(newConfig.merchantId),
          apiKey: maskSecret(apiKey),
          apiSecret: maskSecret(apiSecret),
          isActive: newConfig.isActive,
          version: newConfig.version,
          updatedAt: newConfig.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('[StorePolicyRoutes] PUT /:slug/payment-config error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update payment config' },
      });
    }
  });

  // ==========================================================================
  // B2C Channel Activation — RETIRED
  // WO-O4O-FINAL-CODE-ONLY-RETIREMENT-CLOSURE-V1 §13:
  // POST /:slug/channels/b2c/activate · /deactivate 는 은퇴했다.
  // 매장 소비자 commerce 는 O4O 범위 밖(O4O-STORE-COMMERCE-BOUNDARY-V1)이며,
  // organization_channels 의 기존 B2C row 는 DB 변경 없이 그대로 둔다.
  // ==========================================================================

  // ==========================================================================
  // Slug Management
  // ==========================================================================

  /**
   * GET /api/v1/stores/:slug/slug/can-change — Owner only
   * Check if the store can still change its slug (1-time policy).
   */
  router.get('/:slug/slug/can-change', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = await resolveAndAuthorize(dataSource, req, res);
      if (!ctx) return;

      const slugService = new StoreSlugService(dataSource);
      const canChange = await slugService.canChangeSlug(ctx.storeId);

      res.json({
        success: true,
        data: { canChange },
      });
    } catch (error: any) {
      console.error('[StorePolicyRoutes] GET /:slug/slug/can-change error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to check slug change eligibility' },
      });
    }
  });

  /**
   * PUT /api/v1/stores/:slug/slug — Owner only
   * Change the store's slug. Allowed only once.
   * Old slug is recorded in history for 301 redirect support.
   *
   * Body: { newSlug: string }
   */
  router.put('/:slug/slug', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = await resolveAndAuthorize(dataSource, req, res);
      if (!ctx) return;

      const { newSlug } = req.body;
      if (!newSlug || typeof newSlug !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'newSlug is required' },
        });
        return;
      }

      const slugService = new StoreSlugService(dataSource);

      // Check availability first (for better error message)
      const normalized = normalizeSlug(newSlug);
      const availability = await slugService.checkAvailability(normalized);
      if (!availability.available) {
        res.status(400).json({
          success: false,
          error: {
            code: 'SLUG_NOT_AVAILABLE',
            message: `'${newSlug}' is not available: ${availability.reason}`,
            reason: availability.reason,
          },
        });
        return;
      }

      // Attempt the change (enforces 1-time policy internally)
      const updated = await slugService.changeSlug({
        storeId: ctx.storeId,
        serviceKey: ctx.serviceKey as any,
        newSlug,
        changedBy: ctx.userId,
      });

      // WO-O4O-STORE-SLUG-CANONICAL-CONTRACT-HARDENING-V1 §5:
      //   public store slug 의 SSOT 는 `platform_store_slugs` 하나다.
      //   여기서 `cosmetics.cosmetics_stores.slug` 를 mirror 로 갱신하던 코드는
      //     (1) `ctx.storeId`(= organizations.id)를 store 테이블 PK 와 대조해 **항상 0 row**
      //         만 갱신했고(무의미한 write),
      //     (2) SSOT 를 이원화해 값이 갈라질 수 있었다.
      //   → mirror write 를 중단한다. 레거시 컬럼 자체의 제거/migration 은 별도 WO.

      res.json({
        success: true,
        data: {
          slug: updated.slug,
          previousSlug: req.params.slug,
        },
      });
    } catch (error: any) {
      // Handle 1-time policy violation
      if (error.message?.includes('already changed')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'SLUG_CHANGE_EXHAUSTED',
            message: 'Slug 변경은 1회만 가능합니다. 이미 변경된 매장입니다.',
          },
        });
        return;
      }

      console.error('[StorePolicyRoutes] PUT /:slug/slug error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to change slug' },
      });
    }
  });

  /**
   * GET /api/v1/stores/resolve/:slug — Public
   * Resolve a slug. If it's an old slug, returns redirect info.
   *
   * Responses:
   * - 200 { found: true, slug, serviceKey } — Current active slug
   * - 301 { redirect: true, newSlug, location } — Old slug, redirect to new one
   * - 404 { found: false } — Unknown slug
   */
  router.get('/resolve/:slug', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const slugService = new StoreSlugService(dataSource);

      // Check if it's a current slug
      const current = await slugService.findBySlug(slug);
      if (current && current.isActive) {
        res.json({
          success: true,
          data: { found: true, slug: current.slug, serviceKey: current.serviceKey },
        });
        return;
      }

      // Check if it's an old slug with redirect
      const redirect = await slugService.findOldSlugRedirect(slug);
      if (redirect) {
        res.status(301).json({
          success: true,
          data: {
            redirect: true,
            newSlug: redirect.newSlug,
            serviceKey: redirect.serviceKey,
          },
        });
        return;
      }

      res.status(404).json({
        success: false,
        error: { code: 'SLUG_NOT_FOUND', message: 'Slug not found' },
      });
    } catch (error: any) {
      console.error('[StorePolicyRoutes] GET /resolve/:slug error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve slug' },
      });
    }
  });

  return router;
}
