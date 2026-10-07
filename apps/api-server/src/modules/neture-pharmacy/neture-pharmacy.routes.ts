/**
 * Neture 약국 매장 commerce 라우트 — /api/v1/neture 아래 (DESIGN §3 · §4 · §8)
 *
 *   /pharmacy/membership                         내 매장(약국) 신청 · 내 상태       (로그인 · 신청은 Neture 가입 승인 필요)
 *   /pharmacy/service-access/:serviceKey         세미프랜차이즈 서비스 이용 자격    (로그인 · 본인 판정만)
 *   /pharmacy/...                                내 매장(약국)                    (로그인 + 매장 게이트 = 내 매장(약국) 신청 원장)
 *   /operator/pharmacy-memberships               내 매장(약국) 승인                (neture:operator · 신청자 Neture 승인 확인)
 *   /operator/semi-franchises/:key/...           담당 세미프랜차이즈 처리          (neture:operator ∧ 담당 관계)
 *   /admin/semi-franchises                       세미프랜차이즈 · 담당 지정        (neture:admin)
 *   /supplier/...                                공급 제안 · 이벤트 · 모집 신청    (ACTIVE 공급자)
 *
 * 권한은 API 에서 판정한다 — 화면 메뉴 숨김으로 대신하지 않는다.
 */
import { Router } from 'express';
import type { NextFunction, Request, RequestHandler, Response, Router as ExpressRouter } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';
import { createRequireStoreOwner } from '../../utils/store-owner.utils.js';
import { createRequireActiveSupplier } from '../neture/middleware/neture-identity.middleware.js';
import { checkoutService } from '../../services/checkout.service.js';
import { EventOfferService } from '../../routes/kpa/services/event-offer.service.js';
import { CheckoutFulfillmentBridgeService } from '../../services/neture/checkout-fulfillment-bridge.service.js';
import {
  cancelStoreOrderBeforePayment,
  isCancelStoreOrderFailure,
} from '../../services/checkout/store-order-cancel.service.js';
import logger from '../../utils/logger.js';
import {
  MEMBERSHIP_ACTIONS,
  NETURE_PHARMACY_SERVICE_KEY,
  NeturePharmacyError,
  SUPPLY_KINDS,
  type MembershipAction,
  type SupplyKind,
} from './constants.js';
import { PharmacyMembershipService } from './services/pharmacy-membership.service.js';
import { createPharmacyStoreProvisioner } from './services/pharmacy-store-provisioner.js';
import { SemiFranchiseService } from './services/semi-franchise.service.js';
import { getSupplyOption, listActiveSemiFranchiseKeys, listSupplyOptions } from './services/supply-access.js';
import { SupplyProposalService, type ProposalAction } from './services/supply-proposal.service.js';
import { SemiFranchiseEventService, type EventAction } from './services/semi-franchise-event.service.js';
import { SemiFranchiseRecruitmentService } from './services/semi-franchise-recruitment.service.js';
import { PharmacyCartService, isUuid } from './services/pharmacy-cart.service.js';
import { PharmacyPaymentService } from './services/pharmacy-payment.service.js';
import { SemiFranchiseContentService } from './services/semi-franchise-content.service.js';
import { resolveSemiFranchiseServiceAccess, SEMI_FRANCHISE_ACCESS_MESSAGES } from './services/semi-franchise-service-access.js';
import { semiFranchiseAccessKeyFor } from '../../common/auth/service-login-eligibility.policy.js';
import { AssetCopyService } from '@o4o/asset-copy-core';
import { NetureMainMembershipRequiredError } from '../neture/services/neture-main-membership.js';

type Req = Request & { user?: { id: string }; organizationId?: string; supplierId?: string };
type Handler = (req: Req, res: Response) => Promise<unknown>;

/** 응답 표준 { success, data } / { success:false, error, code } */
function handle(fn: Handler): RequestHandler {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const data = await fn(req as Req, res);
      if (!res.headersSent) res.json({ success: true, data });
    } catch (err) {
      if (err instanceof NeturePharmacyError) {
        res.status(err.httpStatus).json({ success: false, error: err.message, code: err.code });
        return;
      }
      if (err instanceof NetureMainMembershipRequiredError) {
        res.status(err.httpStatus).json({
          success: false,
          error: err.message,
          code: err.code,
          details: { netureMembershipStatus: err.membershipStatus },
        });
        return;
      }
      logger.error('[NeturePharmacy] request failed', {
        path: req.path,
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ success: false, error: '요청을 처리하지 못했습니다.', code: 'INTERNAL_ERROR' });
    }
  };
}

function uuidParam(req: Req, name: string): string {
  const v = req.params[name];
  if (!isUuid(v)) throw new NeturePharmacyError(404, 'NOT_FOUND', '대상을 찾을 수 없습니다.');
  return v;
}

function actionParam<T extends string>(req: Req, allowed: readonly T[]): T {
  const a = req.params.action as T;
  if (!allowed.includes(a)) throw new NeturePharmacyError(400, 'INVALID_ACTION', '처리할 수 없는 동작입니다.');
  return a;
}

export function createNeturePharmacyRoutes(dataSource: DataSource): ExpressRouter {
  const router: ExpressRouter = Router();
  const membership = new PharmacyMembershipService(dataSource, createPharmacyStoreProvisioner(dataSource));
  const semiFranchises = new SemiFranchiseService(dataSource);
  const proposals = new SupplyProposalService(dataSource);
  const events = new SemiFranchiseEventService(dataSource);
  const recruitments = new SemiFranchiseRecruitmentService(dataSource);
  const cart = new PharmacyCartService(dataSource, new EventOfferService(dataSource), (dto) => checkoutService.createOrder(dto));
  const payments = new PharmacyPaymentService(dataSource, new CheckoutFulfillmentBridgeService(dataSource));
  const contents = new SemiFranchiseContentService(dataSource, async (input) => {
    const { snapshot } = await new AssetCopyService(dataSource).copyResolved(input);
    return { snapshotId: snapshot.id };
  });

  const store = [requireAuth, createRequireStoreOwner(dataSource, 'kpa')] as RequestHandler[];
  const operator = [requireAuth, requireNetureScope('neture:operator') as RequestHandler];
  const admin = [requireAuth, requireNetureScope('neture:admin') as RequestHandler];
  const supplier = [requireAuth, createRequireActiveSupplier(dataSource) as RequestHandler];
  const org = (req: Req) => req.organizationId as string;

  // ─── 내 매장(약국) 신청 (매장 게이트 이전) ─────────────────────────────────────────
  router.get('/pharmacy/membership', requireAuth, handle(async (req) => membership.findMine(req.user!.id)));
  router.post('/pharmacy/membership', requireAuth, handle(async (req, res) => {
    res.status(201);
    return membership.apply(req.user!.id, req.body ?? {});
  }));
  // 세미프랜차이즈로 이용하는 서비스 호스트(pharmacy.neture.co.kr = kpa-society)의 화면 게이트용 — 로그인 · handoff 와 같은 판정.
  router.get('/pharmacy/service-access/:serviceKey', requireAuth, handle(async (req) => {
    const semiFranchiseKey = semiFranchiseAccessKeyFor(req.params.serviceKey);
    if (!semiFranchiseKey) {
      return { semiFranchiseKey: null, allowed: false, pharmacyMembershipStatus: null, semiFranchiseMembershipStatus: null, next: null, message: null };
    }
    const access = await resolveSemiFranchiseServiceAccess(dataSource, req.user!.id, semiFranchiseKey);
    return { ...access, message: access.next ? SEMI_FRANCHISE_ACCESS_MESSAGES[access.next] : null };
  }));

  // ─── 내 매장 (내 매장(약국) 신청 active) ───────────────────────────────────────────
  router.get('/pharmacy/store/context', ...store, handle(async (req) => ({
    organizationId: org(req),
    semiFranchiseKeys: await listActiveSemiFranchiseKeys(dataSource, org(req)),
    paymentMode: payments.mode(),
  })));

  router.get('/pharmacy/semi-franchises', ...store, handle(async (req) => semiFranchises.listForPharmacy(org(req))));
  router.post('/pharmacy/semi-franchises/:key/apply', ...store, handle(async (req) =>
    semiFranchises.apply(org(req), req.user!.id, req.params.key)));
  router.post('/pharmacy/semi-franchises/:key/withdraw', ...store, handle(async (req) =>
    semiFranchises.withdraw(org(req), req.params.key)));

  router.get('/pharmacy/store/supply-options', ...store, handle(async (req) => listSupplyOptions(dataSource, org(req), {
    source: typeof req.query.source === 'string' ? req.query.source : undefined,
    q: typeof req.query.q === 'string' ? req.query.q : undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  })));
  router.get('/pharmacy/store/supply-options/:kind/:id', ...store, handle(async (req) => {
    const kind = SUPPLY_KINDS.find((k) => k === req.params.kind) as SupplyKind | undefined;
    if (!kind) throw new NeturePharmacyError(404, 'SUPPLY_OPTION_NOT_AVAILABLE', '이용할 수 없는 공급 옵션입니다.');
    const option = await getSupplyOption(dataSource, org(req), kind, uuidParam(req, 'id'));
    if (!option) throw new NeturePharmacyError(404, 'SUPPLY_OPTION_NOT_AVAILABLE', '이용할 수 없는 공급 옵션입니다.');
    return option;
  }));

  // 세미프랜차이즈 콘텐츠 자료함 — 가입(active) 세미프랜차이즈의 게시 콘텐츠 · 내 매장 사본
  router.get('/pharmacy/store/contents', ...store, handle(async (req) => contents.pharmacyList(org(req), {
    sfKey: typeof req.query.sf === 'string' ? req.query.sf : undefined,
    q: typeof req.query.q === 'string' ? req.query.q : undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 30,
  })));
  router.get('/pharmacy/store/contents/:id', ...store, handle(async (req) => contents.pharmacyGet(org(req), uuidParam(req, 'id'))));
  router.post('/pharmacy/store/contents/:id/copy', ...store, handle(async (req, res) => {
    res.status(201);
    return contents.pharmacyCopy(org(req), req.user!.id, uuidParam(req, 'id'));
  }));

  router.get('/pharmacy/recruitments', ...store, handle(async (req) => recruitments.pharmacyBrowse(org(req))));
  router.post('/pharmacy/recruitments/:id/apply', ...store, handle(async (req) =>
    recruitments.pharmacyApply(org(req), req.user!.id, uuidParam(req, 'id'))));

  router.get('/pharmacy/cart', ...store, handle(async (req) => cart.list(req.user!.id, org(req))));
  router.post('/pharmacy/cart/items', ...store, handle(async (req) => cart.add(req.user!.id, org(req), req.body ?? {})));
  router.patch('/pharmacy/cart/items/:id', ...store, handle(async (req) =>
    cart.updateQuantity(req.user!.id, org(req), uuidParam(req, 'id'), req.body?.quantity)));
  router.delete('/pharmacy/cart/items/:id', ...store, handle(async (req) => cart.remove(req.user!.id, org(req), uuidParam(req, 'id'))));
  router.post('/pharmacy/cart/checkout', ...store, handle(async (req) => cart.checkout(req.user!.id, org(req), req.body ?? {})));

  router.get('/pharmacy/orders', ...store, handle(async (req) => dataSource.query(
    `SELECT id, "orderNumber", status::text AS status, "paymentStatus"::text AS "paymentStatus",
            "totalAmount", "shippingFee", "createdAt", "paidAt", "supplierId", items,
            metadata->>'paymentGroupId' AS "paymentGroupId", metadata->>'receiverKey' AS "receiverKey",
            COALESCE((metadata->>'testPayment')::boolean, false) AS "testPayment"
       FROM checkout_orders
      WHERE "buyerId" = $1 AND "sellerOrganizationId" = $2 AND metadata->>'serviceKey' = $3
      ORDER BY "createdAt" DESC LIMIT 200`,
    [req.user!.id, org(req), NETURE_PHARMACY_SERVICE_KEY],
  )));
  router.post('/pharmacy/orders/:id/cancel', ...store, handle(async (req) => {
    const result = await cancelStoreOrderBeforePayment(dataSource, {
      orderId: uuidParam(req, 'id'),
      buyerId: req.user!.id,
      serviceKeys: [NETURE_PHARMACY_SERVICE_KEY],
      reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined,
    });
    if (isCancelStoreOrderFailure(result)) throw new NeturePharmacyError(result.httpStatus, result.code, result.message);
    return result;
  }));

  router.post('/pharmacy/payments/prepare', ...store, handle(async (req) => {
    const groupId = req.body?.paymentGroupId;
    if (!isUuid(groupId)) throw new NeturePharmacyError(400, 'INVALID_REQUEST', 'paymentGroupId 가 필요합니다.');
    return payments.prepare(req.user!.id, groupId);
  }));
  router.post('/pharmacy/payments/confirm', ...store, handle(async (req) => {
    const { paymentId, paymentGroupId } = req.body ?? {};
    if (!isUuid(paymentId) || !isUuid(paymentGroupId)) {
      throw new NeturePharmacyError(400, 'INVALID_REQUEST', 'paymentId · paymentGroupId 가 필요합니다.');
    }
    return payments.confirm(req.user!.id, { paymentId, paymentGroupId });
  }));

  // ─── Neture 운영자 — 내 매장(약국) 신청 ────────────────────────────────────────────
  router.get('/operator/pharmacy-memberships', ...operator, handle(async (req) => membership.list({
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    q: typeof req.query.q === 'string' ? req.query.q : undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  })));
  router.post('/operator/pharmacy-memberships/:id/:action', ...operator, handle(async (req) =>
    membership.decide(req.user!.id, uuidParam(req, 'id'), actionParam<MembershipAction>(req, MEMBERSHIP_ACTIONS), req.body?.reason)));

  // ─── 담당 세미프랜차이즈 운영자 ───────────────────────────────────────────
  router.get('/operator/semi-franchises', ...operator, handle(async (req) => semiFranchises.listAssigned(req.user!.id)));
  const sfOf = (req: Req) => semiFranchises.requireOperatorOf(req.user!.id, req.params.key);

  router.get('/operator/semi-franchises/:key/memberships', ...operator, handle(async (req) =>
    semiFranchises.listMemberships(await sfOf(req), req.query.status as string | undefined)));
  router.post('/operator/semi-franchises/:key/memberships/:id/:action', ...operator, handle(async (req) =>
    semiFranchises.decideMembership(await sfOf(req), req.user!.id, uuidParam(req, 'id'),
      actionParam<MembershipAction>(req, MEMBERSHIP_ACTIONS), req.body?.reason)));

  router.get('/operator/semi-franchises/:key/supply-proposals', ...operator, handle(async (req) =>
    proposals.operatorList(await sfOf(req), req.query.status as string | undefined)));
  router.post('/operator/semi-franchises/:key/supply-proposals/:id/:action', ...operator, handle(async (req) =>
    proposals.operatorDecide(await sfOf(req), req.user!.id, uuidParam(req, 'id'),
      actionParam<ProposalAction>(req, ['approve', 'reject', 'end']), req.body?.reason)));

  router.get('/operator/semi-franchises/:key/events', ...operator, handle(async (req) =>
    events.operatorList(await sfOf(req), req.query.status as string | undefined)));
  router.post('/operator/semi-franchises/:key/events/:id/:action', ...operator, handle(async (req) =>
    events.operatorDecide(await sfOf(req), req.user!.id, uuidParam(req, 'id'),
      actionParam<EventAction>(req, ['approve', 'reject', 'cancel']), req.body?.reason)));

  router.get('/operator/semi-franchises/:key/recruitments', ...operator, handle(async (req) =>
    recruitments.operatorList(await sfOf(req), req.query.status as string | undefined)));
  router.post('/operator/semi-franchises/:key/recruitments/:id/:action', ...operator, handle(async (req) =>
    recruitments.operatorDecide(await sfOf(req), req.user!.id, uuidParam(req, 'id'),
      actionParam<'approve' | 'reject'>(req, ['approve', 'reject']), req.body?.note)));

  router.get('/operator/semi-franchises/:key/contents', ...operator, handle(async (req) =>
    contents.operatorList(await sfOf(req), req.query.status as string | undefined)));
  router.get('/operator/semi-franchises/:key/contents/:id', ...operator, handle(async (req) =>
    contents.operatorGet(await sfOf(req), uuidParam(req, 'id'))));
  router.post('/operator/semi-franchises/:key/contents', ...operator, handle(async (req, res) => {
    const sf = await sfOf(req);
    res.status(201);
    return contents.operatorCreate(sf, req.user!.id, req.body ?? {});
  }));
  router.patch('/operator/semi-franchises/:key/contents/:id', ...operator, handle(async (req) =>
    contents.operatorUpdate(await sfOf(req), req.user!.id, uuidParam(req, 'id'), req.body ?? {})));
  router.post('/operator/semi-franchises/:key/contents/:id/:action', ...operator, handle(async (req) =>
    contents.operatorSetStatus(await sfOf(req), req.user!.id, uuidParam(req, 'id'),
      actionParam<'publish' | 'archive'>(req, ['publish', 'archive']))));

  // ─── Neture 관리자 ────────────────────────────────────────────────────────
  router.get('/admin/semi-franchises', ...admin, handle(async () => semiFranchises.listAll()));
  router.post('/admin/semi-franchises', ...admin, handle(async (req, res) => {
    res.status(201);
    return semiFranchises.create(req.body ?? {});
  }));
  router.patch('/admin/semi-franchises/:key', ...admin, handle(async (req) => semiFranchises.update(req.params.key, req.body ?? {})));
  router.post('/admin/semi-franchises/:key/operators/:userId', ...admin, handle(async (req) =>
    semiFranchises.assignOperator(req.params.key, uuidParam(req, 'userId'), req.user!.id)));
  router.delete('/admin/semi-franchises/:key/operators/:userId', ...admin, handle(async (req) =>
    semiFranchises.revokeOperator(req.params.key, uuidParam(req, 'userId'))));

  // ─── 공급자 ───────────────────────────────────────────────────────────────
  router.get('/supplier/semi-franchises', ...supplier, handle(async () => dataSource.query(
    `SELECT key, name FROM semi_franchises WHERE status = 'active' ORDER BY (key = 'pharmacy') DESC, name`,
  )));
  router.get('/supplier/supply-proposals', ...supplier, handle(async (req) => proposals.supplierList(req.supplierId!)));
  router.post('/supplier/supply-proposals', ...supplier, handle(async (req, res) => {
    if (!isUuid(req.body?.offerId)) throw new NeturePharmacyError(400, 'INVALID_REQUEST', 'offerId 가 필요합니다.');
    if (req.body?.targetOrganizationId && !isUuid(req.body.targetOrganizationId)) {
      throw new NeturePharmacyError(400, 'INVALID_TARGET', '대상 약국을 찾을 수 없습니다.');
    }
    res.status(201);
    return proposals.supplierCreate(req.supplierId!, req.user!.id, req.body);
  }));
  router.post('/supplier/supply-proposals/:id/end', ...supplier, handle(async (req) =>
    proposals.supplierEnd(req.supplierId!, uuidParam(req, 'id'))));

  router.get('/supplier/semi-franchise-events', ...supplier, handle(async (req) => events.supplierList(req.supplierId!)));
  router.post('/supplier/semi-franchise-events', ...supplier, handle(async (req, res) => {
    if (!isUuid(req.body?.offerId)) throw new NeturePharmacyError(400, 'INVALID_REQUEST', 'offerId 가 필요합니다.');
    res.status(201);
    return events.supplierCreate(req.supplierId!, req.user!.id, req.body);
  }));
  router.post('/supplier/semi-franchise-events/:id/cancel', ...supplier, handle(async (req) =>
    events.supplierCancel(req.supplierId!, uuidParam(req, 'id'))));

  router.get('/supplier/semi-franchise-recruitments', ...supplier, handle(async (req) => recruitments.supplierList(req.user!.id)));
  router.post('/supplier/semi-franchise-recruitments', ...supplier, handle(async (req, res) => {
    if (!isUuid(req.body?.masterId)) throw new NeturePharmacyError(400, 'INVALID_REQUEST', 'masterId 가 필요합니다.');
    res.status(201);
    return recruitments.supplierCreate(req.user!.id, [req.supplierId!], req.body);
  }));

  return router;
}
