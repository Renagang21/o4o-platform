import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SpotPricePolicyService } from '../services/spot-price-policy.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

/**
 * WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1
 *
 * 공급자 스팟 가격 정책 CRUD API.
 * 마운트: /api/v1/neture/supplier/spot-policies
 */
export function createSpotPricePolicyRouter(dataSource: DataSource): Router {
  const router = Router();
  const service = new SpotPricePolicyService(dataSource);

  // POST /spot-policies — 정책 생성
  router.post('/spot-policies', authenticate, async (req, res) => {
    try {
      const supplierId = (req as any).user?.supplierId;
      if (!supplierId) {
        res.status(403).json({ success: false, error: 'Supplier access required' });
        return;
      }

      const { offerId, policyName, spotPrice, startAt, endAt } = req.body;
      if (!offerId || !policyName || !spotPrice || !startAt || !endAt) {
        res.status(400).json({ success: false, error: 'Missing required fields: offerId, policyName, spotPrice, startAt, endAt' });
        return;
      }

      const policy = await service.create({
        offerId,
        supplierId,
        policyName,
        spotPrice: Number(spotPrice),
        startAt,
        endAt,
      });

      res.json({ success: true, data: policy });
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      if (msg === 'OFFER_NOT_FOUND_OR_NOT_OWNED') {
        res.status(404).json({ success: false, error: '상품을 찾을 수 없거나 권한이 없습니다' });
        return;
      }
      if (msg === 'END_BEFORE_START' || msg === 'INVALID_DATE') {
        res.status(400).json({ success: false, error: '날짜가 올바르지 않습니다' });
        return;
      }
      if (msg === 'INVALID_PRICE') {
        res.status(400).json({ success: false, error: '가격은 0보다 커야 합니다' });
        return;
      }
      console.error('[SpotPricePolicy] create error:', error);
      res.status(500).json({ success: false, error: 'Failed to create spot price policy' });
    }
  });

  // GET /spot-policies/offer/:offerId — 상품별 정책 목록
  router.get('/spot-policies/offer/:offerId', authenticate, async (req, res) => {
    try {
      const supplierId = (req as any).user?.supplierId;
      if (!supplierId) {
        res.status(403).json({ success: false, error: 'Supplier access required' });
        return;
      }

      const policies = await service.listByOffer(req.params.offerId, supplierId);
      res.json({ success: true, data: policies });
    } catch (error) {
      console.error('[SpotPricePolicy] list error:', error);
      res.status(500).json({ success: false, error: 'Failed to list spot price policies' });
    }
  });

  // GET /spot-policies/:id — 단건 조회
  router.get('/spot-policies/:id', authenticate, async (req, res) => {
    try {
      const supplierId = (req as any).user?.supplierId;
      if (!supplierId) {
        res.status(403).json({ success: false, error: 'Supplier access required' });
        return;
      }

      const policy = await service.getById(req.params.id, supplierId);
      if (!policy) {
        res.status(404).json({ success: false, error: 'Policy not found' });
        return;
      }
      res.json({ success: true, data: policy });
    } catch (error) {
      console.error('[SpotPricePolicy] get error:', error);
      res.status(500).json({ success: false, error: 'Failed to get spot price policy' });
    }
  });

  // PATCH /spot-policies/:id — 정책 수정 (DRAFT만)
  router.patch('/spot-policies/:id', authenticate, async (req, res) => {
    try {
      const supplierId = (req as any).user?.supplierId;
      if (!supplierId) {
        res.status(403).json({ success: false, error: 'Supplier access required' });
        return;
      }

      const { policyName, spotPrice, startAt, endAt } = req.body;
      const policy = await service.update(req.params.id, supplierId, {
        policyName,
        spotPrice: spotPrice != null ? Number(spotPrice) : undefined,
        startAt,
        endAt,
      });
      res.json({ success: true, data: policy });
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      if (msg === 'NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Policy not found' });
        return;
      }
      if (msg === 'ONLY_DRAFT_EDITABLE') {
        res.status(400).json({ success: false, error: '초안 상태에서만 수정할 수 있습니다' });
        return;
      }
      if (msg === 'END_BEFORE_START' || msg === 'INVALID_DATE') {
        res.status(400).json({ success: false, error: '날짜가 올바르지 않습니다' });
        return;
      }
      if (msg === 'INVALID_PRICE') {
        res.status(400).json({ success: false, error: '가격은 0보다 커야 합니다' });
        return;
      }
      console.error('[SpotPricePolicy] update error:', error);
      res.status(500).json({ success: false, error: 'Failed to update spot price policy' });
    }
  });

  // PATCH /spot-policies/:id/status — 상태 변경
  router.patch('/spot-policies/:id/status', authenticate, async (req, res) => {
    try {
      const supplierId = (req as any).user?.supplierId;
      if (!supplierId) {
        res.status(403).json({ success: false, error: 'Supplier access required' });
        return;
      }

      const { status } = req.body;
      if (!status || !['ACTIVE', 'CANCELLED'].includes(status)) {
        res.status(400).json({ success: false, error: 'status must be ACTIVE or CANCELLED' });
        return;
      }

      const policy = await service.changeStatus(req.params.id, supplierId, status);
      res.json({ success: true, data: policy });
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      if (msg === 'NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Policy not found' });
        return;
      }
      if (msg === 'ONLY_DRAFT_ACTIVATABLE') {
        res.status(400).json({ success: false, error: '초안 상태에서만 활성화할 수 있습니다' });
        return;
      }
      if (msg === 'ALREADY_ACTIVE_EXISTS') {
        res.status(409).json({ success: false, error: '이미 활성화된 스팟 정책이 있습니다. 기존 정책을 취소하고 활성화하세요.' });
        return;
      }
      if (msg === 'ALREADY_CANCELLED') {
        res.status(400).json({ success: false, error: '이미 취소된 정책입니다' });
        return;
      }
      console.error('[SpotPricePolicy] status change error:', error);
      res.status(500).json({ success: false, error: 'Failed to change policy status' });
    }
  });

  return router;
}
