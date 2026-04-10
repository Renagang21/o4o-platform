/**
 * Pharmacy Info Controller
 *
 * WO-KPA-PHARMACY-INFO-EDIT-FLOW-V1
 *
 * GET  /pharmacy/info — 약국 기본 정보 조회 (fallback: kpa_pharmacy_requests → users."businessInfo")
 * PUT  /pharmacy/info — 약국 기본 정보 수정 (organizations 테이블 SSOT)
 *
 * 인증: requireAuth + store owner 체크
 * 조직: organization_members 기반 자동 결정
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import { KpaAuditLog } from '../../kpa/entities/kpa-audit-log.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';
import type { StoreAddress } from '../../../types/store-address.js';

type AuthMiddleware = RequestHandler;

interface PharmacyInfoResponse {
  organizationId: string;
  name: string;
  phone: string | null;
  businessNumber: string | null;
  address: string | null;
  addressDetail: StoreAddress | null;
  taxInvoiceEmail: string | null;
  ownerPhone: string | null;
  storeSlug: string | null;
}

function composeAddress(detail: StoreAddress | null | undefined): string | null {
  if (!detail?.baseAddress) return null;
  const parts = [detail.baseAddress, detail.detailAddress].filter(Boolean);
  return parts.join(' ').trim() || null;
}

function sanitizePhone(value: string | undefined | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits || null;
}

export function createPharmacyInfoController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const auditRepo = dataSource.getRepository(KpaAuditLog);
  const requireStoreOwner = createRequireStoreOwner(dataSource);

  // ─── GET /info — 약국 기본 정보 조회 ─────────────────────
  router.get('/info', requireAuth, requireStoreOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.id;

    if (!organizationId) {
      res.json({ success: true, data: null, message: 'No organization associated' });
      return;
    }

    const org = await orgRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      res.status(404).json({ success: false, error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found' } });
      return;
    }

    const meta = (org.metadata as Record<string, any>) || {};

    // Build response from organizations table
    const data: PharmacyInfoResponse = {
      organizationId: org.id,
      name: org.name,
      phone: org.phone || null,
      businessNumber: org.business_number || null,
      address: org.address || null,
      addressDetail: (org.address_detail as StoreAddress) || null,
      taxInvoiceEmail: meta.taxInvoiceEmail || null,
      ownerPhone: meta.ownerPhone || null,
      storeSlug: org.code || null,
    };

    // Fallback: if key fields are empty, try kpa_pharmacy_requests
    const needsFallback = !data.phone && !data.addressDetail && !data.businessNumber;
    if (needsFallback && userId) {
      try {
        const [request] = await dataSource.query(
          `SELECT pharmacy_name, business_number, pharmacy_phone, owner_phone, tax_invoice_email
           FROM kpa_pharmacy_requests
           WHERE user_id = $1 AND status = 'approved'
           ORDER BY approved_at DESC NULLS LAST
           LIMIT 1`,
          [userId]
        );
        if (request) {
          if (!data.phone && request.pharmacy_phone) data.phone = request.pharmacy_phone;
          if (!data.businessNumber && request.business_number) data.businessNumber = request.business_number;
          if (!data.ownerPhone && request.owner_phone) data.ownerPhone = request.owner_phone;
          if (!data.taxInvoiceEmail && request.tax_invoice_email) data.taxInvoiceEmail = request.tax_invoice_email;
        }
      } catch { /* table may not exist — graceful degradation */ }

      // Further fallback: users."businessInfo" JSONB
      if (!data.phone || !data.addressDetail) {
        try {
          const [user] = await dataSource.query(
            `SELECT "businessInfo" FROM users WHERE id = $1`,
            [userId]
          );
          const biz = user?.businessInfo;
          if (biz) {
            if (!data.phone && biz.phone) data.phone = biz.phone;
            if (!data.addressDetail && biz.storeAddress) {
              data.addressDetail = {
                zipCode: biz.storeAddress.zipCode || undefined,
                baseAddress: biz.storeAddress.baseAddress || '',
                detailAddress: biz.storeAddress.detailAddress || undefined,
              };
              if (!data.address) {
                data.address = composeAddress(data.addressDetail);
              }
            }
          }
        } catch { /* graceful degradation */ }
      }
    }

    res.json({ success: true, data });
  }));

  // ─── PUT /info — 약국 기본 정보 수정 ─────────────────────
  router.put('/info', requireAuth, requireStoreOwner, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;

    if (!organizationId) {
      res.status(403).json({ success: false, error: { code: 'NO_ORGANIZATION', message: 'No organization associated' } });
      return;
    }

    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ success: false, error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' } });
      return;
    }

    // Validation
    const errors: string[] = [];

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 200) {
      errors.push('name: 약국명은 2~200자 필수');
    }

    if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
      const digits = sanitizePhone(body.phone);
      if (digits && digits.length > 20) errors.push('phone: 전화번호는 20자 이내');
    }

    if (body.addressDetail) {
      if (typeof body.addressDetail !== 'object') {
        errors.push('addressDetail: 올바른 주소 형식이 아닙니다');
      } else if (!body.addressDetail.baseAddress || typeof body.addressDetail.baseAddress !== 'string') {
        errors.push('addressDetail.baseAddress: 기본주소는 필수');
      }
    }

    if (body.taxInvoiceEmail !== undefined && body.taxInvoiceEmail !== null && body.taxInvoiceEmail !== '') {
      if (!/^\S+@\S+\.\S+$/.test(body.taxInvoiceEmail)) {
        errors.push('taxInvoiceEmail: 올바른 이메일 형식이 아닙니다');
      }
    }

    if (body.ownerPhone !== undefined && body.ownerPhone !== null && body.ownerPhone !== '') {
      const digits = sanitizePhone(body.ownerPhone);
      if (digits && digits.length > 20) errors.push('ownerPhone: 연락처는 20자 이내');
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: errors.join('; ') } });
      return;
    }

    // Read-modify-write
    const org = await orgRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      res.status(404).json({ success: false, error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found' } });
      return;
    }

    org.name = body.name.trim();
    org.phone = sanitizePhone(body.phone);

    if (body.addressDetail) {
      (org as any).address_detail = {
        zipCode: body.addressDetail.zipCode || undefined,
        baseAddress: body.addressDetail.baseAddress,
        detailAddress: body.addressDetail.detailAddress || undefined,
        region: body.addressDetail.region || undefined,
      };
      org.address = composeAddress(body.addressDetail);
    }

    // Merge taxInvoiceEmail & ownerPhone into metadata
    const existingMeta = (org.metadata as Record<string, any>) || {};
    org.metadata = {
      ...existingMeta,
      taxInvoiceEmail: body.taxInvoiceEmail || null,
      ownerPhone: sanitizePhone(body.ownerPhone),
    };

    await orgRepo.save(org);

    // Audit log
    try {
      const log = auditRepo.create({
        operator_id: user.id,
        operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'store_owner',
        action_type: 'PHARMACY_INFO_UPDATED' as any,
        target_type: 'content' as any,
        target_id: organizationId,
        metadata: { updatedFields: Object.keys(body) },
      });
      await auditRepo.save(log);
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write pharmacy info audit:', e);
    }

    const meta = org.metadata as Record<string, any>;
    res.json({
      success: true,
      data: {
        organizationId: org.id,
        name: org.name,
        phone: org.phone,
        businessNumber: org.business_number || null,
        address: org.address,
        addressDetail: (org as any).address_detail || null,
        taxInvoiceEmail: meta?.taxInvoiceEmail || null,
        ownerPhone: meta?.ownerPhone || null,
        storeSlug: org.code || null,
      } satisfies PharmacyInfoResponse,
    });
  }));

  return router;
}
