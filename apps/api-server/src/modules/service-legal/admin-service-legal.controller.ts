/**
 * Admin Service Legal Controller
 *
 * WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1
 *
 * service admin(+ platformBypass 서비스의 platform:super_admin)이 법정정보/정책 문서를
 * 입력·수정한다. Mount: /api/v1/admin/services
 *
 *   GET  /:serviceKey/legal-profile            — 조회 (operator 이상)
 *   PUT  /:serviceKey/legal-profile            — upsert (admin)
 *   GET  /:serviceKey/policies                 — 목록 (operator 이상)
 *   GET  /:serviceKey/policies/:id             — 단건 (operator 이상)
 *   POST /:serviceKey/policies                 — 등록 draft (admin)
 *   PUT  /:serviceKey/policies/:id             — 수정 (admin)
 *   PATCH /:serviceKey/policies/:id/publish    — 게시/해제 (admin)
 *
 * 핵심:
 *   - 권한: requireServiceLegalScope — serviceKey 별 security-core config 적용
 *     (KPA platformBypass=false 자동 준수). service admin 은 자기 서비스만.
 *   - 실값 자동 생성/placeholder seed 금지. 빈 문자열은 null 로 저장.
 *   - 변경 시 ActionLogService(action_logs) 에 best-effort audit (entityType/before/after/changeReason 는 meta).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { ActionLogService } from '@o4o/action-log-core';
import { authenticate } from '../../middleware/auth.middleware.js';
import { ServiceLegalProfile } from './entities/ServiceLegalProfile.entity.js';
import { ServicePolicyDocument } from './entities/ServicePolicyDocument.entity.js';
import { toAdminLegalProfile, toAdminPolicyDocument } from './service-legal.mapper.js';
import {
  requireServiceLegalScope,
  isSupportedPolicyDocumentType,
} from './service-legal-scope.js';
import logger from '../../utils/logger.js';

/** camelCase 입력 → ServiceLegalProfile 컬럼 매핑 (mass-assignment 방지 화이트리스트). */
const PROFILE_FIELD_MAP: Record<string, keyof ServiceLegalProfile> = {
  companyName: 'company_name',
  representativeName: 'representative_name',
  businessRegistrationNumber: 'business_registration_number',
  ecommerceRegistrationNumber: 'ecommerce_registration_number',
  ecommerceRegistrationAgency: 'ecommerce_registration_agency',
  businessAddress: 'business_address',
  customerServicePhone: 'customer_service_phone',
  customerServiceEmail: 'customer_service_email',
  privacyOfficerName: 'privacy_officer_name',
  privacyOfficerEmail: 'privacy_officer_email',
  privacyOfficerPhone: 'privacy_officer_phone',
  hostingProvider: 'hosting_provider',
  businessInfoVerificationUrl: 'business_info_verification_url',
  mailOrderBrokerNotice: 'mail_order_broker_notice',
  purchaseSafetyServiceInfo: 'purchase_safety_service_info',
  additionalLegalNotice: 'additional_legal_notice',
};

/** 빈 문자열/공백 → null (placeholder 미저장). 그 외 trim. */
function normalizeStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

export function createAdminServiceLegalController(dataSource: DataSource): Router {
  const router = Router();
  const profileRepo = dataSource.getRepository(ServiceLegalProfile);
  const policyRepo = dataSource.getRepository(ServicePolicyDocument);
  const actionLog = new ActionLogService(dataSource);

  /** best-effort audit — 실패해도 본 작업을 실패시키지 않는다. */
  async function audit(
    serviceKey: string,
    userId: string | null,
    actionKey: string,
    meta: Record<string, any>,
  ) {
    try {
      await actionLog.logSuccess(serviceKey, userId, actionKey, { source: 'manual', meta });
    } catch (err) {
      logger.warn('[ServiceLegal Admin] audit log failed (best-effort):', err);
    }
  }

  // ── Legal Profile ──

  router.get(
    '/:serviceKey/legal-profile',
    authenticate,
    requireServiceLegalScope('operator'),
    async (req: Request, res: Response) => {
      try {
        const profile = await profileRepo.findOne({ where: { service_key: req.params.serviceKey } });
        res.json({ success: true, data: profile ? toAdminLegalProfile(profile) : null });
      } catch (error) {
        logger.error('[ServiceLegal Admin] get profile error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '법정정보 조회 실패' } });
      }
    },
  );

  router.put(
    '/:serviceKey/legal-profile',
    authenticate,
    requireServiceLegalScope('admin'),
    async (req: Request, res: Response) => {
      const serviceKey = req.params.serviceKey;
      const userId = (req as any).user?.id ?? null;
      try {
        let profile = await profileRepo.findOne({ where: { service_key: serviceKey } });
        const before = profile ? toAdminLegalProfile(profile) : null;
        if (!profile) {
          profile = profileRepo.create({ service_key: serviceKey });
        }

        // 화이트리스트 필드만 반영. 빈 문자열 → null (placeholder 미저장).
        for (const [inputKey, column] of Object.entries(PROFILE_FIELD_MAP)) {
          if (Object.prototype.hasOwnProperty.call(req.body, inputKey)) {
            (profile as any)[column] = normalizeStr(req.body[inputKey]);
          }
        }
        if (typeof req.body.isActive === 'boolean') {
          profile.is_active = req.body.isActive;
        }
        profile.updated_by = userId;

        const saved = await profileRepo.save(profile);
        const after = toAdminLegalProfile(saved);
        await audit(serviceKey, userId, 'service_legal:profile_update', {
          entityType: 'service_legal_profile',
          entityId: saved.id,
          before,
          after,
        });
        res.json({ success: true, data: after });
      } catch (error) {
        logger.error('[ServiceLegal Admin] put profile error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '법정정보 저장 실패' } });
      }
    },
  );

  // ── Policy Documents ──

  router.get(
    '/:serviceKey/policies',
    authenticate,
    requireServiceLegalScope('operator'),
    async (req: Request, res: Response) => {
      try {
        const where: any = { service_key: req.params.serviceKey };
        if (typeof req.query.documentType === 'string') where.document_type = req.query.documentType;
        if (typeof req.query.status === 'string') where.status = req.query.status;
        const docs = await policyRepo.find({
          where,
          order: { document_type: 'ASC', updated_at: 'DESC' },
        });
        res.json({ success: true, data: docs.map(toAdminPolicyDocument) });
      } catch (error) {
        logger.error('[ServiceLegal Admin] list policies error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '정책 문서 목록 조회 실패' } });
      }
    },
  );

  router.get(
    '/:serviceKey/policies/:id',
    authenticate,
    requireServiceLegalScope('operator'),
    async (req: Request, res: Response) => {
      try {
        const doc = await policyRepo.findOne({ where: { id: req.params.id, service_key: req.params.serviceKey } });
        if (!doc) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '문서를 찾을 수 없습니다.' } });
        }
        res.json({ success: true, data: toAdminPolicyDocument(doc) });
      } catch (error) {
        logger.error('[ServiceLegal Admin] get policy error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '정책 문서 조회 실패' } });
      }
    },
  );

  router.post(
    '/:serviceKey/policies',
    authenticate,
    requireServiceLegalScope('admin'),
    async (req: Request, res: Response) => {
      const serviceKey = req.params.serviceKey;
      const userId = (req as any).user?.id ?? null;
      const { documentType, title, slug, content, version, effectiveDate, changeReason } = req.body;
      if (!documentType || !isSupportedPolicyDocumentType(String(documentType))) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_DOCUMENT_TYPE', message: '유효하지 않은 문서 유형입니다.' },
        });
      }
      const cleanTitle = normalizeStr(title);
      if (!cleanTitle) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'title 은 필수입니다.' },
        });
      }
      try {
        const doc = policyRepo.create({
          service_key: serviceKey,
          document_type: String(documentType),
          title: cleanTitle,
          slug: normalizeStr(slug),
          content: typeof content === 'string' ? content : '',
          version: Number.isInteger(version) && version > 0 ? version : 1,
          status: 'draft',
          effective_date: effectiveDate ? new Date(effectiveDate) : null,
          change_reason: normalizeStr(changeReason),
          created_by: userId,
          updated_by: userId,
        });
        const saved = await policyRepo.save(doc);
        await audit(serviceKey, userId, 'service_legal:policy_create', {
          entityType: 'service_policy_document',
          entityId: saved.id,
          documentType: saved.document_type,
          changeReason: saved.change_reason,
          after: toAdminPolicyDocument(saved),
        });
        res.status(201).json({ success: true, data: toAdminPolicyDocument(saved) });
      } catch (error) {
        logger.error('[ServiceLegal Admin] create policy error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '정책 문서 등록 실패' } });
      }
    },
  );

  router.put(
    '/:serviceKey/policies/:id',
    authenticate,
    requireServiceLegalScope('admin'),
    async (req: Request, res: Response) => {
      const serviceKey = req.params.serviceKey;
      const userId = (req as any).user?.id ?? null;
      try {
        const doc = await policyRepo.findOne({ where: { id: req.params.id, service_key: serviceKey } });
        if (!doc) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '문서를 찾을 수 없습니다.' } });
        }
        const before = toAdminPolicyDocument(doc);
        const { title, slug, content, version, effectiveDate, changeReason } = req.body;
        if (title !== undefined) {
          const cleanTitle = normalizeStr(title);
          if (!cleanTitle) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title 은 비울 수 없습니다.' } });
          }
          doc.title = cleanTitle;
        }
        if (slug !== undefined) doc.slug = normalizeStr(slug);
        if (typeof content === 'string') doc.content = content;
        if (Number.isInteger(version) && version > 0) doc.version = version;
        if (effectiveDate !== undefined) doc.effective_date = effectiveDate ? new Date(effectiveDate) : null;
        if (changeReason !== undefined) doc.change_reason = normalizeStr(changeReason);
        doc.updated_by = userId;

        const saved = await policyRepo.save(doc);
        const after = toAdminPolicyDocument(saved);
        await audit(serviceKey, userId, 'service_legal:policy_update', {
          entityType: 'service_policy_document',
          entityId: saved.id,
          before,
          after,
          changeReason: saved.change_reason,
        });
        res.json({ success: true, data: after });
      } catch (error) {
        logger.error('[ServiceLegal Admin] update policy error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '정책 문서 수정 실패' } });
      }
    },
  );

  /**
   * PATCH /:serviceKey/policies/:id/publish — { action: 'publish' | 'unpublish' }
   * publish 시 같은 (serviceKey, documentType) 의 기존 published 문서를 draft 로 내리고 본 문서를 게시.
   */
  router.patch(
    '/:serviceKey/policies/:id/publish',
    authenticate,
    requireServiceLegalScope('admin'),
    async (req: Request, res: Response) => {
      const serviceKey = req.params.serviceKey;
      const userId = (req as any).user?.id ?? null;
      const { action } = req.body;
      if (!action || !['publish', 'unpublish'].includes(action)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: "action 은 publish 또는 unpublish 여야 합니다." } });
      }
      try {
        const doc = await policyRepo.findOne({ where: { id: req.params.id, service_key: serviceKey } });
        if (!doc) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '문서를 찾을 수 없습니다.' } });
        }
        const before = toAdminPolicyDocument(doc);

        if (action === 'publish') {
          // 같은 유형의 기존 published 문서 → draft
          await policyRepo
            .createQueryBuilder()
            .update(ServicePolicyDocument)
            .set({ status: 'draft', updated_at: () => 'now()' })
            .where('service_key = :serviceKey AND document_type = :dt AND status = :s AND id != :id', {
              serviceKey,
              dt: doc.document_type,
              s: 'published',
              id: doc.id,
            })
            .execute();

          doc.status = 'published';
          doc.published_at = new Date();
          doc.published_by = userId;
          doc.updated_by = userId;
        } else {
          doc.status = 'draft';
          doc.updated_by = userId;
        }

        const saved = await policyRepo.save(doc);
        const after = toAdminPolicyDocument(saved);
        await audit(serviceKey, userId, `service_legal:policy_${action}`, {
          entityType: 'service_policy_document',
          entityId: saved.id,
          documentType: saved.document_type,
          before,
          after,
        });
        res.json({ success: true, data: after });
      } catch (error) {
        logger.error('[ServiceLegal Admin] publish policy error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '정책 문서 게시 처리 실패' } });
      }
    },
  );

  return router;
}
