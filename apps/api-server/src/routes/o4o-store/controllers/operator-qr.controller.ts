/**
 * Operator QR Controller — Operator HUB QR Template Write API
 *
 * WO-O4O-KPA-OPERATOR-QR-PUBLISHING-PHASE2-BACKEND-V1 (2026-05-24)
 *
 * 운영자가 매장 HUB 에 게시할 QR "템플릿" 을 작성/수정/게시하는 backend write API.
 * 운영자 단계에서는 slug / organization_id / scan tracking 모두 없음 — 실제 QR 발급은
 * 매장 가져가기 시점에 기존 store_qr_codes (Phase 3-B) 에서 일어남.
 *
 * 본 controller 는 operator-pop.controller.ts (WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1)
 * 패턴 mirror — operator_qr_templates / store_pops 의 author_role / service_key / status
 * 흐름이 동일하기 때문. 추가로 target_type ('url' | 'content') 별 validation 포함.
 *
 * 권한:
 *   - {service}:operator
 *   - {service}:admin
 *   - platform:admin
 *   - platform:super_admin
 *   (supplier / store_owner / member / pharmacist 차단 — 비로그인 차단)
 *
 * 서버 강제 저장 (body 무시):
 *   - author_role = 'operator'
 *   - service_key = controller 주입 serviceKey
 *   - 신규 status = 'draft'
 *
 * target validation (작업 2):
 *   - target_type='url'     → target_url 필수, content_kind/content_ref 저장 안 함
 *   - target_type='content' → target_content_kind + target_content_ref 필수,
 *                             target_url 저장 안 함
 *   - 허용 content kind: 'blog' | 'cms' | 'pop' (1차)
 *
 * 라우트 (router 내부, 외부 mount: /api/v1/{serviceKey}/operator/qr):
 *   - GET    /templates             — 목록 (draft + published + archived)
 *   - GET    /templates/:id         — 단일 조회
 *   - POST   /templates             — 생성 (draft 로)
 *   - PUT    /templates/:id         — 수정 (target validation 재적용)
 *   - PATCH  /templates/:id/publish — 발행 (queryQr HUB 노출 시작 — Phase 2)
 *   - PATCH  /templates/:id/archive — 보관
 *   - DELETE /templates/:id         — 삭제
 *
 * 대상 서비스: KPA 우선 (본 Phase 2 의 mount). 구조상 3 서비스 확장 가능.
 * 제외: Neture (매장 기능 없음)
 *
 * 참조:
 *   - docs/investigations/IR-O4O-KPA-OPERATOR-HUB-QR-BUSINESS-DEFINITION-V1.md
 *   - apps/api-server/src/routes/o4o-store/controllers/operator-pop.controller.ts (mirror 원본)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OperatorQrTemplate } from '../entities/operator-qr-template.entity.js';
import type {
  OperatorQrTemplateStatus,
  OperatorQrTemplateAuthorRole,
  OperatorQrTemplateTargetType,
  OperatorQrTemplateContentKind,
} from '../entities/operator-qr-template.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';
import type { PrefixedRole } from '../../../types/roles.js';

const ALLOWED_TARGET_TYPES: ReadonlyArray<OperatorQrTemplateTargetType> = ['url', 'content'];
const ALLOWED_CONTENT_KINDS: ReadonlyArray<OperatorQrTemplateContentKind> = ['blog', 'cms', 'pop'];

/**
 * Operator 게시 허용 역할 — serviceKey 기반 동적 구성.
 */
function buildAllowedRoles(serviceKey: string): PrefixedRole[] {
  return [
    `${serviceKey}:admin` as PrefixedRole,
    `${serviceKey}:operator` as PrefixedRole,
    'platform:admin',
    'platform:super_admin',
  ];
}

/**
 * target_type 별 입력값 정규화 + 검증.
 *
 * target_type='url':
 *   - target_url 필수 (trim 후 길이 > 0)
 *   - content_kind / content_ref 는 undefined 로 강제 (저장 안 함)
 *
 * target_type='content':
 *   - target_content_kind 필수 (ALLOWED_CONTENT_KINDS 화이트리스트)
 *   - target_content_ref 필수 (trim 후 길이 > 0)
 *   - target_url 는 undefined 로 강제
 *
 * 실패 시 { ok: false, message } 반환. 성공 시 { ok: true, normalized: {...} }.
 */
type TargetValidationResult =
  | {
      ok: true;
      normalized: {
        targetType: OperatorQrTemplateTargetType;
        targetUrl?: string;
        targetContentKind?: OperatorQrTemplateContentKind;
        targetContentRef?: string;
      };
    }
  | { ok: false; message: string };

function validateAndNormalizeTarget(input: any): TargetValidationResult {
  const { targetType, targetUrl, targetContentKind, targetContentRef } = input ?? {};

  if (!targetType || !ALLOWED_TARGET_TYPES.includes(targetType)) {
    return { ok: false, message: `targetType must be one of: ${ALLOWED_TARGET_TYPES.join(', ')}` };
  }

  if (targetType === 'url') {
    if (typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
      return { ok: false, message: 'targetUrl is required when targetType is "url"' };
    }
    return {
      ok: true,
      normalized: {
        targetType: 'url',
        targetUrl: targetUrl.trim(),
        targetContentKind: undefined,
        targetContentRef: undefined,
      },
    };
  }

  // targetType === 'content'
  if (!targetContentKind || !ALLOWED_CONTENT_KINDS.includes(targetContentKind)) {
    return {
      ok: false,
      message: `targetContentKind must be one of: ${ALLOWED_CONTENT_KINDS.join(', ')}`,
    };
  }
  if (typeof targetContentRef !== 'string' || targetContentRef.trim().length === 0) {
    return { ok: false, message: 'targetContentRef is required when targetType is "content"' };
  }
  return {
    ok: true,
    normalized: {
      targetType: 'content',
      targetUrl: undefined,
      targetContentKind: targetContentKind as OperatorQrTemplateContentKind,
      targetContentRef: targetContentRef.trim(),
    },
  };
}

export function createOperatorQrController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string,
): Router {
  const router = Router();
  const qrRepo = dataSource.getRepository(OperatorQrTemplate);
  const allowedRoles = buildAllowedRoles(serviceKey);

  /**
   * Operator/admin 권한 inline guard — operator-pop.controller.ts 동일 패턴.
   */
  function requireOperator(req: Request, res: Response): string | null {
    const authReq = req as unknown as AuthRequest;
    const userId = authReq.user?.id || (authReq as any).authUser?.id;
    const roles = (authReq.user?.roles as string[] | undefined) ?? [];

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      });
      return null;
    }
    if (!hasAnyServiceRole(roles, allowedRoles)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Operator or administrator role required for ${serviceKey}`,
        },
      });
      return null;
    }
    return userId;
  }

  // ============================================================================
  // GET /templates — 목록 (draft + published + archived)
  // ============================================================================
  router.get('/templates', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const statusFilter = req.query.status as string | undefined;

      const where: any = {
        serviceKey,
        authorRole: 'operator' as OperatorQrTemplateAuthorRole,
      };
      if (statusFilter && ['draft', 'published', 'archived'].includes(statusFilter)) {
        where.status = statusFilter as OperatorQrTemplateStatus;
      }

      const [templates, total] = await qrRepo.findAndCount({
        where,
        order: { updatedAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      res.json({
        success: true,
        data: templates,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // GET /templates/:id — 단일 조회
  // ============================================================================
  router.get('/templates/:id', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const template = await qrRepo.findOne({
        where: {
          id,
          serviceKey,
          authorRole: 'operator' as OperatorQrTemplateAuthorRole,
        },
      });
      if (!template) {
        res.status(404).json({
          success: false,
          error: { code: 'TEMPLATE_NOT_FOUND', message: 'Operator QR template not found' },
        });
        return;
      }
      res.json({ success: true, data: template });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // POST /templates — 생성 (draft)
  //
  // 서버 강제: author_role='operator', service_key=serviceKey, status='draft'
  // body: { title, description?, targetType, targetUrl?, targetContentKind?, targetContentRef? }
  // target validation 은 validateAndNormalizeTarget 가 수행 (작업 2).
  // ============================================================================
  router.post('/templates', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { title, description } = req.body ?? {};

      if (typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'title is required' },
        });
        return;
      }

      const targetResult = validateAndNormalizeTarget(req.body);
      if (!targetResult.ok) {
        // narrowing 우회: discriminated union 의 ok=false 분기 message 명시 cast
        const failure = targetResult as { ok: false; message: string };
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: failure.message },
        });
        return;
      }

      // 서버 강제 저장 — body 의 author_role / service_key / slug / organization_id 는 무시
      const template = qrRepo.create({
        serviceKey,
        authorRole: 'operator' as OperatorQrTemplateAuthorRole,
        title: title.trim(),
        description: typeof description === 'string' ? description : undefined,
        status: 'draft' as OperatorQrTemplateStatus,
        ...targetResult.normalized,
      });

      const saved = await qrRepo.save(template);
      res.status(201).json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // PUT /templates/:id — 수정
  //
  // 강제 보호: author_role / service_key 는 body 로 변경 불가.
  // body 변경 허용: title, description, targetType, targetUrl, targetContentKind, targetContentRef
  // target validation 재적용 (변경 시 정합 보장).
  // ============================================================================
  router.put('/templates/:id', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const { title, description } = req.body ?? {};

      const template = await qrRepo.findOne({
        where: {
          id,
          serviceKey,
          authorRole: 'operator' as OperatorQrTemplateAuthorRole,
        },
      });
      if (!template) {
        res.status(404).json({
          success: false,
          error: { code: 'TEMPLATE_NOT_FOUND', message: 'Operator QR template not found' },
        });
        return;
      }

      // target_* 필드 중 하나라도 body 에 있으면 전체 재검증 (정합 보호).
      const hasTargetUpdate =
        'targetType' in (req.body ?? {})
        || 'targetUrl' in (req.body ?? {})
        || 'targetContentKind' in (req.body ?? {})
        || 'targetContentRef' in (req.body ?? {});

      if (hasTargetUpdate) {
        // 부분 변경 시 누락 필드는 기존 값으로 fallback 후 validation
        const merged = {
          targetType: req.body.targetType ?? template.targetType,
          targetUrl: 'targetUrl' in req.body ? req.body.targetUrl : template.targetUrl,
          targetContentKind:
            'targetContentKind' in req.body
              ? req.body.targetContentKind
              : template.targetContentKind,
          targetContentRef:
            'targetContentRef' in req.body
              ? req.body.targetContentRef
              : template.targetContentRef,
        };
        const targetResult = validateAndNormalizeTarget(merged);
        if (!targetResult.ok) {
          // narrowing 우회: 위 POST 와 동일 cast 패턴
          const failure = targetResult as { ok: false; message: string };
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: failure.message },
          });
          return;
        }
        template.targetType = targetResult.normalized.targetType;
        template.targetUrl = targetResult.normalized.targetUrl;
        template.targetContentKind = targetResult.normalized.targetContentKind;
        template.targetContentRef = targetResult.normalized.targetContentRef;
      }

      if (typeof title === 'string' && title.trim().length > 0) {
        template.title = title.trim();
      }
      if (description !== undefined) {
        template.description = typeof description === 'string' ? description : undefined;
      }

      const saved = await qrRepo.save(template);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // PATCH /templates/:id/publish — 발행 (queryQr HUB 노출 시작)
  // ============================================================================
  router.patch('/templates/:id/publish', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const template = await qrRepo.findOne({
        where: {
          id,
          serviceKey,
          authorRole: 'operator' as OperatorQrTemplateAuthorRole,
        },
      });
      if (!template) {
        res.status(404).json({
          success: false,
          error: { code: 'TEMPLATE_NOT_FOUND', message: 'Operator QR template not found' },
        });
        return;
      }
      if (template.status === 'published') {
        res.status(400).json({
          success: false,
          error: { code: 'ALREADY_PUBLISHED', message: 'Template is already published' },
        });
        return;
      }
      template.status = 'published';
      template.publishedAt = new Date();
      const saved = await qrRepo.save(template);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // PATCH /templates/:id/archive — 보관 (HUB 미노출)
  // ============================================================================
  router.patch('/templates/:id/archive', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const template = await qrRepo.findOne({
        where: {
          id,
          serviceKey,
          authorRole: 'operator' as OperatorQrTemplateAuthorRole,
        },
      });
      if (!template) {
        res.status(404).json({
          success: false,
          error: { code: 'TEMPLATE_NOT_FOUND', message: 'Operator QR template not found' },
        });
        return;
      }
      template.status = 'archived';
      const saved = await qrRepo.save(template);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // DELETE /templates/:id — 삭제
  // ============================================================================
  router.delete('/templates/:id', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const template = await qrRepo.findOne({
        where: {
          id,
          serviceKey,
          authorRole: 'operator' as OperatorQrTemplateAuthorRole,
        },
      });
      if (!template) {
        res.status(404).json({
          success: false,
          error: { code: 'TEMPLATE_NOT_FOUND', message: 'Operator QR template not found' },
        });
        return;
      }
      await qrRepo.remove(template);
      res.json({ success: true, data: { id, deleted: true } });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  return router;
}
