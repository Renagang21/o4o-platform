/**
 * Store Paid Feature Entitlement routes
 * WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1
 *
 * V1: read-only. 매장/조직별 이용권 조회 + 활성 판정.
 * Mount: /api/v1/store-entitlements
 *
 * 주의: V1 은 결제/발급(write) 미포함. 메뉴 잠금/오픈은 후속
 *   WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1 에서 이 API 를 소비한다.
 */
import { Router } from 'express';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { PaymentCoreService } from '@o4o/payment-core';
import { requireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';
import logger from '../../utils/logger.js';
import { isStoreOwner, type StoreOwnerServiceKey } from '../../utils/store-owner.utils.js';
import { TypeORMPaymentRepository } from '../../services/payment/adapters/TypeORMPaymentRepository.js';
import { TossPaymentProviderAdapter } from '../../services/payment/adapters/TossPaymentProviderAdapter.js';
import { EventHubPaymentPublisher } from '../../services/payment/adapters/EventHubPaymentPublisher.js';
import { StorePaidFeatureEntitlementService } from './store-paid-feature-entitlement.service.js';
import {
  STORE_PAID_FEATURE_PLAN_CODES,
  type StorePaidFeaturePlanCode,
} from './store-paid-feature-entitlement.entity.js';
import {
  STORE_SERVICE_SUBSCRIPTION_PAYMENT_TYPE,
  assertEnabledPlan,
  getStoreServiceSubscriptionPlan,
  listStoreServiceSubscriptionPlans,
} from './store-service-subscription-plan-catalog.js';

/** Store feature 이용권의 serviceKey 축 = store_owner role-prefix (kpa|glycopharm|cosmetics). */
const STORE_OWNER_SERVICE_KEYS: StoreOwnerServiceKey[] = ['kpa', 'glycopharm', 'cosmetics'];

// ── WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1 (가격/기간/표시명은 plan catalog SSOT) ──
// WO-O4O-STORE-SERVICE-SUBSCRIPTION-PLAN-CATALOG-V1: 하드코딩 제거 → store-service-subscription-plan-catalog
const STORE_SUBSCRIPTION_SOURCE_SERVICE = 'store-service-subscription';
const STORE_SUBSCRIPTION_PAYMENT_TYPE = STORE_SERVICE_SUBSCRIPTION_PAYMENT_TYPE;
const SUBSCRIPTION_ORDER_PREFIX = 'o4o_sub_';

export function createStoreEntitlementRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new StorePaidFeatureEntitlementService(dataSource);

  // WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1: PaymentCore 재사용(소비자 checkout/B2B 와 분리)
  const paymentRepository = new TypeORMPaymentRepository(dataSource);
  const paymentService = new PaymentCoreService(
    paymentRepository,
    new TossPaymentProviderAdapter(),
    new EventHubPaymentPublisher(),
  );

  // GET /store-entitlements?organizationId=&serviceKey=
  // 조직(+서비스)의 모든 이용권 행. serviceKey 미지정 시 전체.
  router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const organizationId = String(req.query.organizationId || '').trim();
      const serviceKey = req.query.serviceKey ? String(req.query.serviceKey).trim() : undefined;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId is required',
          code: 'MISSING_ORGANIZATION_ID',
        });
      }
      const data = await service.listEntitlements(organizationId, serviceKey);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('[StoreEntitlement] list error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /store-entitlements/active?organizationId=&serviceKey=
  // 현재 활성 이용권만.
  router.get('/active', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const organizationId = String(req.query.organizationId || '').trim();
      const serviceKey = String(req.query.serviceKey || '').trim();
      if (!organizationId || !serviceKey) {
        return res.status(400).json({
          success: false,
          error: 'organizationId and serviceKey are required',
          code: 'MISSING_PARAMS',
        });
      }
      const data = await service.getActiveEntitlements(organizationId, serviceKey);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('[StoreEntitlement] active error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /store-entitlements/check?organizationId=&serviceKey=&planCode=
  // 특정 플랜 활성 보유 여부 (메뉴 게이트 판정).
  router.get('/check', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const organizationId = String(req.query.organizationId || '').trim();
      const serviceKey = String(req.query.serviceKey || '').trim();
      const planCode = String(req.query.planCode || '').trim() as StorePaidFeaturePlanCode;
      if (!organizationId || !serviceKey || !planCode) {
        return res.status(400).json({
          success: false,
          error: 'organizationId, serviceKey, planCode are required',
          code: 'MISSING_PARAMS',
        });
      }
      if (!STORE_PAID_FEATURE_PLAN_CODES.includes(planCode)) {
        return res.status(400).json({
          success: false,
          error: `unknown planCode: ${planCode}`,
          code: 'UNKNOWN_PLAN_CODE',
        });
      }
      const active = await service.hasActiveEntitlement(organizationId, serviceKey, planCode);
      return res.json({ success: true, data: { organizationId, serviceKey, planCode, active } });
    } catch (error) {
      logger.error('[StoreEntitlement] check error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /store-entitlements/me/check?serviceKey=&planCode=
  // self-scoped — 호출자(store_owner)의 organizationId 를 auth 에서 해석하여 활성 보유 여부 판정.
  // 매장 프론트(/store)는 organizationId 를 보유하지 않으므로 이 엔드포인트로 메뉴 게이트를 판정한다.
  router.get('/me/check', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      }
      const serviceKey = String(req.query.serviceKey || '').trim() as StoreOwnerServiceKey;
      const planCode = String(req.query.planCode || '').trim() as StorePaidFeaturePlanCode;
      if (!serviceKey || !planCode) {
        return res.status(400).json({ success: false, error: 'serviceKey and planCode are required', code: 'MISSING_PARAMS' });
      }
      if (!STORE_OWNER_SERVICE_KEYS.includes(serviceKey)) {
        return res.status(400).json({ success: false, error: `unknown serviceKey: ${serviceKey}`, code: 'UNKNOWN_SERVICE_KEY' });
      }
      if (!STORE_PAID_FEATURE_PLAN_CODES.includes(planCode)) {
        return res.status(400).json({ success: false, error: `unknown planCode: ${planCode}`, code: 'UNKNOWN_PLAN_CODE' });
      }

      const { isOwner, organizationId } = await isStoreOwner(dataSource, userId, serviceKey);
      // 조직을 해석할 수 없으면(비-owner 또는 org 미연결) 이용권 없음으로 간주.
      const active =
        isOwner && organizationId
          ? await service.hasActiveEntitlement(organizationId, serviceKey, planCode)
          : false;

      return res.json({ success: true, data: { serviceKey, planCode, active } });
    } catch (error) {
      logger.error('[StoreEntitlement] me/check error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // ====================================================================
  // WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1
  //   매장 경영자 부가서비스 구독 결제(STORE_SERVICE_SUBSCRIPTION). 1회 결제형 30일 이용권.
  //   소비자→매장 결제(STORE_SALE_PAYMENT, 410) / Neture B2B 와 완전 분리. PaymentCore 재사용.
  // ====================================================================

  /** 호출자(store_owner)의 store 권한 해석 — { organizationId } 또는 에러. */
  async function resolveOwnerStore(
    userId: string,
    serviceKey: StoreOwnerServiceKey,
  ): Promise<{ organizationId: string } | { error: { status: number; code: string; message: string } }> {
    const { isOwner, organizationId } = await isStoreOwner(dataSource, userId, serviceKey);
    if (!isOwner || !organizationId) {
      return { error: { status: 403, code: 'NOT_STORE_OWNER', message: '해당 매장의 경영자 권한이 없습니다.' } };
    }
    return { organizationId };
  }

  // POST /store-entitlements/subscriptions/prepare — 구독 결제 세션 생성
  router.post('/subscriptions/prepare', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });

      const serviceKey = String(req.body?.serviceKey || '').trim() as StoreOwnerServiceKey;
      const planCode = String(req.body?.planCode || '').trim() as StorePaidFeaturePlanCode;
      const successUrl = String(req.body?.successUrl || '').trim();
      const failUrl = String(req.body?.failUrl || '').trim();

      if (!STORE_OWNER_SERVICE_KEYS.includes(serviceKey)) {
        return res.status(400).json({ success: false, error: `unknown serviceKey: ${serviceKey}`, code: 'UNKNOWN_SERVICE_KEY' });
      }
      if (!successUrl || !failUrl) {
        return res.status(400).json({ success: false, error: 'successUrl and failUrl are required', code: 'MISSING_PARAMS' });
      }
      // 가격/기간/표시명은 전적으로 서버 catalog 기준. client amount 는 수신/신뢰하지 않는다.
      const planResult = assertEnabledPlan(planCode);
      if ('error' in planResult) {
        return res.status(planResult.error.status).json({ success: false, error: planResult.error.message, code: planResult.error.code });
      }
      const { plan } = planResult;

      const resolved = await resolveOwnerStore(userId, serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });
      const { organizationId } = resolved;

      const orderId = `${SUBSCRIPTION_ORDER_PREFIX}${organizationId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const payment = await paymentService.prepare({
        orderId,
        orderName: plan.name,
        amount: plan.amount,
        currency: plan.currency,
        successUrl,
        failUrl,
        sourceService: STORE_SUBSCRIPTION_SOURCE_SERVICE,
        metadata: {
          paymentType: STORE_SUBSCRIPTION_PAYMENT_TYPE,
          planCode: plan.planCode,
          planName: plan.name,
          organizationId,
          serviceCode: serviceKey,
          amount: plan.amount,
          currency: plan.currency,
          durationDays: plan.durationDays,
          priceSource: plan.priceSource,
        },
      });

      logger.info('[StoreSubscription] prepared', { paymentId: payment.id, organizationId, serviceKey, planCode: plan.planCode, amount: plan.amount });
      return res.status(201).json({
        success: true,
        data: {
          paymentId: payment.id,
          transactionId: payment.transactionId,
          orderId,
          amount: plan.amount,
          currency: plan.currency,
          clientKey: (payment.metadata as Record<string, unknown>)?.clientKey,
          isTestMode: (payment.metadata as Record<string, unknown>)?.isTestMode,
          plan: {
            planCode: plan.planCode,
            name: plan.name,
            durationDays: plan.durationDays,
            amount: plan.amount,
            currency: plan.currency,
          },
        },
      });
    } catch (error) {
      logger.error('[StoreSubscription] prepare error:', error);
      return res.status(500).json({ success: false, error: 'Failed to prepare subscription payment', code: 'PAYMENT_PREPARE_ERROR' });
    }
  });

  // POST /store-entitlements/subscriptions/confirm — 결제 승인 + 이용권 ACTIVE 생성/연장
  router.post('/subscriptions/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });

      const paymentId = String(req.body?.paymentId || '').trim();
      const paymentKey = String(req.body?.paymentKey || '').trim();
      const orderId = String(req.body?.orderId || '').trim();
      const serviceKey = String(req.body?.serviceKey || '').trim() as StoreOwnerServiceKey;
      if (!paymentId || !paymentKey || !orderId) {
        return res.status(400).json({ success: false, error: 'paymentId, paymentKey, orderId are required', code: 'MISSING_PARAMS' });
      }
      if (!STORE_OWNER_SERVICE_KEYS.includes(serviceKey)) {
        return res.status(400).json({ success: false, error: `unknown serviceKey: ${serviceKey}`, code: 'UNKNOWN_SERVICE_KEY' });
      }

      const resolved = await resolveOwnerStore(userId, serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });
      const { organizationId } = resolved;

      // 결제 레코드 + metadata 재검증(권한·타입·소유 store)
      const record = await paymentRepository.findById(paymentId);
      if (!record) return res.status(404).json({ success: false, error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' });
      const md = (record.metadata as Record<string, unknown>) || {};
      const planCode = String(md.planCode || '') as StorePaidFeaturePlanCode;
      if (md.paymentType !== STORE_SUBSCRIPTION_PAYMENT_TYPE) {
        return res.status(400).json({ success: false, error: 'Not a store subscription payment', code: 'INVALID_PAYMENT_TYPE' });
      }
      if (md.organizationId !== organizationId) {
        return res.status(403).json({ success: false, error: '결제 대상 매장과 권한이 일치하지 않습니다.', code: 'STORE_MISMATCH' });
      }
      const planResult = assertEnabledPlan(planCode);
      if ('error' in planResult) {
        return res.status(planResult.error.status).json({ success: false, error: planResult.error.message, code: planResult.error.code });
      }
      const { plan } = planResult;
      // 결제 금액 위변조 방어: 결제 레코드 amount 가 현재 catalog amount 와 일치해야 한다.
      if (typeof record.amount === 'number' && record.amount !== plan.amount) {
        logger.warn('[StoreSubscription] amount mismatch', { paymentId, recordAmount: record.amount, catalogAmount: plan.amount });
        return res.status(400).json({ success: false, error: '결제 금액이 plan 가격과 일치하지 않습니다.', code: 'PLAN_AMOUNT_MISMATCH' });
      }

      // PaymentCore.confirm — 상태머신이 중복 confirm 을 차단(CREATED→CONFIRMING→PAID 1회).
      // 이미 PAID(재시도) 인 경우엔 이용권 보장(activateOrExtend idempotent)으로 복구.
      let confirmedOk = false;
      try {
        const confirmed = await paymentService.confirm(paymentId, paymentKey, orderId);
        confirmedOk = confirmed.status === 'PAID';
      } catch (err) {
        const fresh = await paymentRepository.findById(paymentId);
        if (fresh?.status === 'PAID') {
          confirmedOk = true; // 이미 승인됨 — 이용권만 보장
        } else {
          logger.error('[StoreSubscription] confirm failed:', err);
          return res.status(400).json({ success: false, error: '결제 승인에 실패했습니다.', code: 'PAYMENT_CONFIRM_FAILED' });
        }
      }
      if (!confirmedOk) {
        return res.status(400).json({ success: false, error: '결제가 완료되지 않았습니다.', code: 'PAYMENT_NOT_PAID' });
      }

      const { entitlement, applied } = await service.activateOrExtend({
        organizationId,
        serviceKey,
        planCode,
        durationDays: plan.durationDays,
        paymentId,
      });

      logger.info('[StoreSubscription] confirmed + entitlement', { paymentId, organizationId, serviceKey, planCode, applied, endsAt: entitlement.endsAt });
      return res.json({
        success: true,
        data: { serviceKey, planCode, status: entitlement.status, startsAt: entitlement.startsAt, endsAt: entitlement.endsAt, applied },
      });
    } catch (error) {
      logger.error('[StoreSubscription] confirm error:', error);
      return res.status(500).json({ success: false, error: 'Failed to confirm subscription payment', code: 'PAYMENT_CONFIRM_ERROR' });
    }
  });

  // ── WO-O4O-STORE-SERVICE-SUBSCRIPTION-PLAN-CATALOG-V1: plan catalog 조회(frontend 가격 표시용) ──

  // GET /store-entitlements/subscriptions/plans — 판매 활성 plan 목록
  router.get('/subscriptions/plans', requireAuth, async (_req: AuthRequest, res: Response) => {
    return res.json({ success: true, data: { plans: listStoreServiceSubscriptionPlans() } });
  });

  // GET /store-entitlements/subscriptions/plans/:planCode — 단일 plan
  router.get('/subscriptions/plans/:planCode', requireAuth, async (req: AuthRequest, res: Response) => {
    const plan = getStoreServiceSubscriptionPlan(String(req.params.planCode || ''));
    if (!plan || !plan.enabled) {
      return res.status(404).json({ success: false, error: 'Plan not found', code: 'PLAN_NOT_FOUND' });
    }
    return res.json({ success: true, data: plan });
  });

  return router;
}
