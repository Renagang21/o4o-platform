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
import { createRequireStoreOwner, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';
import type { StoreAddress } from '../../../types/store-address.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';

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
  ceoName: string | null;
  contactName: string | null;
  managerPhone: string | null;
  storeSlug: string | null;
  // WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1:
  //   사업자등록증 P2/P4 fields — users.businessInfo JSONB SSOT (organizations.metadata 와 dual-write 안 함)
  businessType: string | null;
  businessItem: string | null;
  businessEntityType: string | null;
  businessStartDate: string | null;
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
  requireAuth: AuthMiddleware,
  // WO-O4O-STORE-OWNER-BACKCOMPAT-CALLERS-MIGRATION-V1:
  //   serviceKey 명시 시 service_memberships(active) 검사 + 해당 서비스 store_owner role 만 허용.
  serviceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const auditRepo = dataSource.getRepository(KpaAuditLog);
  const requireStoreOwner = createRequireStoreOwner(dataSource, serviceKey);

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

    // Resolve slug from platform_store_slugs (SSOT)
    const slugService = new StoreSlugService(dataSource);
    const slugRecord = await slugService.findByStoreId(organizationId, 'kpa');

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
      ceoName: meta.ceoName || null,
      contactName: meta.contactName || null,
      managerPhone: meta.managerPhone || null,
      storeSlug: slugRecord?.slug ?? null,
      // WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1:
      //   P2/P4 fields — users.businessInfo SSOT 에서 항상 별도 조회 (아래 블록)
      businessType: null,
      businessItem: null,
      businessEntityType: null,
      businessStartDate: null,
    };

    // WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1:
    //   P2/P4 fields 는 users.businessInfo JSONB 가 SSOT. needsFallback 과 무관하게
    //   항상 조회한다 (organizations.metadata 와 dual-write 안 함 — drift 방지).
    if (userId) {
      try {
        const [user] = await dataSource.query(
          `SELECT "businessInfo" FROM users WHERE id = $1`,
          [userId]
        );
        const biz = user?.businessInfo;
        if (biz) {
          data.businessType = biz.businessType || null;
          data.businessItem = biz.businessItem || null;
          data.businessEntityType = biz.businessEntityType || null;
          data.businessStartDate = biz.businessStartDate || null;
        }
      } catch { /* graceful degradation */ }
    }

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
            // WO-O4O-KPA-STORE-INFO-PHARMACY-OWNER-DATA-FIX-V1:
            //   pharmacy_phone (metadata 하위) 우선, 없으면 대표 phone
            const bizPhone = (biz.metadata?.pharmacy_phone as string | undefined) || biz.phone || null;
            if (!data.phone && bizPhone) data.phone = bizPhone;
            if (!data.ceoName && biz.ceoName) data.ceoName = biz.ceoName;
            if (!data.contactName && biz.contactName) data.contactName = biz.contactName;
            if (!data.managerPhone && biz.managerPhone) data.managerPhone = biz.managerPhone;
            // 누락 필드 보완: taxInvoiceEmail, businessNumber
            if (!data.taxInvoiceEmail && biz.taxInvoiceEmail) data.taxInvoiceEmail = biz.taxInvoiceEmail;
            if (!data.businessNumber && biz.businessNumber) data.businessNumber = biz.businessNumber;
            // 주소: 구조화 주소 우선, 없으면 레거시 address/address2
            if (!data.addressDetail && biz.storeAddress) {
              data.addressDetail = {
                zipCode: biz.storeAddress.zipCode || undefined,
                baseAddress: biz.storeAddress.baseAddress || '',
                detailAddress: biz.storeAddress.detailAddress || undefined,
              };
              if (!data.address) {
                data.address = composeAddress(data.addressDetail);
              }
            } else if (!data.addressDetail && !data.address && biz.address) {
              // 레거시 address/address2 평문 → address 필드로 fallback
              data.address = [biz.address, biz.address2].filter(Boolean).join(' ').trim() || null;
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

    if (body.ceoName !== undefined && body.ceoName !== null && body.ceoName !== '') {
      if (typeof body.ceoName !== 'string' || body.ceoName.trim().length > 50) {
        errors.push('ceoName: 대표자명은 50자 이내');
      }
    }

    if (body.contactName !== undefined && body.contactName !== null && body.contactName !== '') {
      if (typeof body.contactName !== 'string' || body.contactName.trim().length > 50) {
        errors.push('contactName: 담당자명은 50자 이내');
      }
    }

    if (body.managerPhone !== undefined && body.managerPhone !== null && body.managerPhone !== '') {
      const digits = sanitizePhone(body.managerPhone);
      if (digits && digits.length > 20) errors.push('managerPhone: 담당자 전화는 20자 이내');
    }

    // WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1: P2/P4 fields validation (모두 optional)
    const VALID_ENTITY_TYPES = ['individual', 'corporation', 'simple_taxpayer', 'general_taxpayer', 'tax_exempt', 'non_profit', 'other'];
    if (body.businessType !== undefined && body.businessType !== null && body.businessType !== '') {
      if (typeof body.businessType !== 'string' || body.businessType.length > 100) errors.push('businessType: 업태는 100자 이내');
    }
    if (body.businessItem !== undefined && body.businessItem !== null && body.businessItem !== '') {
      if (typeof body.businessItem !== 'string' || body.businessItem.length > 100) errors.push('businessItem: 종목은 100자 이내');
    }
    if (body.businessEntityType !== undefined && body.businessEntityType !== null && body.businessEntityType !== '') {
      if (!VALID_ENTITY_TYPES.includes(body.businessEntityType)) errors.push('businessEntityType: 알 수 없는 사업자 유형');
    }
    if (body.businessStartDate !== undefined && body.businessStartDate !== null && body.businessStartDate !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.businessStartDate)) errors.push('businessStartDate: YYYY-MM-DD 형식이어야 합니다');
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

    // Merge taxInvoiceEmail, ownerPhone, ceoName, managerPhone into metadata
    const existingMeta = (org.metadata as Record<string, any>) || {};
    org.metadata = {
      ...existingMeta,
      taxInvoiceEmail: body.taxInvoiceEmail || null,
      ownerPhone: sanitizePhone(body.ownerPhone),
      ceoName: body.ceoName?.trim() || null,
      contactName: body.contactName?.trim() || null,
      managerPhone: sanitizePhone(body.managerPhone),
    };

    await orgRepo.save(org);

    // WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1:
    //   P2/P4 fields (businessType / businessItem / businessEntityType / businessStartDate) 만
    //   users.businessInfo JSONB 에 별도 저장 (organizations.metadata 와 dual-write 안 함).
    //   payload 에 포함된 키만 merge — 미포함 키는 변경 없음.
    const bizPatch: Record<string, any> = {};
    if (body.businessType !== undefined) bizPatch.businessType = body.businessType?.trim() || null;
    if (body.businessItem !== undefined) bizPatch.businessItem = body.businessItem?.trim() || null;
    if (body.businessEntityType !== undefined) bizPatch.businessEntityType = body.businessEntityType || null;
    if (body.businessStartDate !== undefined) bizPatch.businessStartDate = body.businessStartDate || null;

    let savedBiz: Record<string, any> = {};
    if (Object.keys(bizPatch).length > 0) {
      try {
        await dataSource.query(
          `UPDATE users
             SET "businessInfo" = COALESCE("businessInfo", '{}'::jsonb) || $2::jsonb,
                 "updatedAt" = NOW()
           WHERE id = $1`,
          [user.id, JSON.stringify(bizPatch)]
        );
      } catch (e) {
        console.error('[Pharmacy Info] Failed to update users.businessInfo P2/P4 fields:', e);
      }
    }
    try {
      const [row] = await dataSource.query(`SELECT "businessInfo" FROM users WHERE id = $1`, [user.id]);
      savedBiz = (row?.businessInfo as Record<string, any>) || {};
    } catch { /* graceful */ }

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

    // Resolve slug from platform_store_slugs (SSOT)
    const slugService = new StoreSlugService(dataSource);
    const slugRecord = await slugService.findByStoreId(organizationId, 'kpa');

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
        ceoName: meta?.ceoName || null,
        contactName: meta?.contactName || null,
        managerPhone: meta?.managerPhone || null,
        storeSlug: slugRecord?.slug ?? null,
        businessType: savedBiz.businessType || null,
        businessItem: savedBiz.businessItem || null,
        businessEntityType: savedBiz.businessEntityType || null,
        businessStartDate: savedBiz.businessStartDate || null,
      } satisfies PharmacyInfoResponse,
    });
  }));

  return router;
}
