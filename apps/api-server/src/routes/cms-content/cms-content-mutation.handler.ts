/**
 * CMS Content Mutation Handler — Content create, update, status transition
 *
 * WO-O4O-CMS-CONTENT-ROUTES-SPLIT-V1
 * Extracted from cms-content.routes.ts
 *
 * WO-P3-CMS-ADMIN-CRUD-P0: CRUD endpoints for admin content management
 * WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: author_role, visibility_scope
 * WO-O4O-CMS-TRANSITION-CENTRALIZATION-V1: Centralized status transition
 *
 * Endpoints:
 *   POST  /contents           — Create new content (admin / service_admin)
 *   PUT   /contents/:id       — Update content (admin)
 *   PATCH /contents/:id/status — Change status (admin)
 */

import { Router, Response } from 'express';
import type { DataSource } from 'typeorm';
import { CmsContent, ContentType, ContentStatus } from '@o4o-apps/cms-core';
import { requireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import logger from '../../utils/logger.js';
import { CmsContentService, StatusValidationError, StatusTransitionError } from './cms-content.service.js';
import type { ContentAuthorRole, ContentVisibilityScope } from './cms-content-utils.js';
import {
  VALID_CONTENT_TYPES,
  isCmsPlatformAdmin,
  hasCmsServiceOperatorRole,
  canonicalizeCmsServiceKey,
  resolveCmsRolePrefix,
  isSameCmsService,
} from './cms-content-utils.js';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 — 회원 저작 capability (config 축, 서비스 분기 없음)
import {
  authorizeCmsMemberCreate,
  authorizeCmsMemberUpdate,
  authorizeCmsMemberTransition,
  normalizeCmsMemberSubType,
  type CmsMemberAuthoringCapability,
} from './cms-content-member-authoring.js';

/**
 * WO-O4O-GLYCOPHARM-OPERATOR-GUIDELINES-403-FIX-V1
 * WO-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1
 *
 * Authorize a CMS mutation request against a target serviceKey.
 *
 * Allowed:
 *   - platform:super_admin (any serviceKey)
 *   - `${rolePrefix}:admin` / `${rolePrefix}:operator` for the **same canonical service**
 *
 * ⚠️ `serviceKey` 는 CMS 원장 축(`kpa-society`)이고 role 은 role scope 축(`kpa`)이다.
 *    두 축을 문자열로 직접 이어붙이면(`${serviceKey}:operator`) KPA 는 항상 어긋나
 *    정상 운영자가 자기 콘텐츠를 못 고친다. security-core canonical SSOT 로 role 축에
 *    접어서 비교한다 — CMS 로컬 alias map 을 만들지 않는다.
 *
 * Returns { allowed, isPlatformAdmin } so callers can decide author_role / visibility_scope.
 * Checks JWT payload roles first, falls back to RoleAssignment table.
 */
async function authorizeCmsMutation(
  user: { id: string; roles?: string[] } | undefined,
  serviceKey: string | null | undefined,
): Promise<{ allowed: boolean; isPlatformAdmin: boolean }> {
  if (!user) return { allowed: false, isPlatformAdmin: false };

  // WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1:
  //   platform admin 판정을 read 측과 **한 벌**로 공유한다 (근거를 두 곳에 두지 않는다).
  const isPlatformAdmin = await isCmsPlatformAdmin(user, roleAssignmentService, (m) =>
    logger.warn('[CMS] Platform admin RoleAssignment check failed:', m),
  );

  if (isPlatformAdmin) return { allowed: true, isPlatformAdmin: true };

  // Service-scoped: requires serviceKey + matching service:operator|admin role
  if (!serviceKey) return { allowed: false, isPlatformAdmin: false };

  // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6:
  //   서비스 운영 권한 판정은 공통 helper 한 벌만 쓴다 (read 측과 동일 근거).
  // WO-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1:
  //   role 축으로 접는다 — 'kpa-society' → 'kpa', 'k-cosmetics' → 'cosmetics'.
  const hasServiceRole = await hasCmsServiceOperatorRole(
    user,
    resolveCmsRolePrefix(serviceKey),
    roleAssignmentService,
    (m) => logger.warn('[CMS] Service role RoleAssignment check failed:', m),
  );

  return { allowed: hasServiceRole, isPlatformAdmin: false };
}

export function createCmsContentMutationRoutes(deps: {
  dataSource: DataSource;
  cmsContentService: CmsContentService;
}): Router {
  const router = Router();
  const { dataSource, cmsContentService } = deps;

  /**
   * POST /cms/contents
   * Create new content (admin or service_admin)
   *
   * WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1:
   * - Admin: author_role='admin', any visibility_scope
   * - Service admin (e.g. glycopharm:admin): author_role='service_admin', visibility_scope='service'
   */
  router.post('/contents', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      const {
        serviceKey,
        organizationId,
        type,
        title,
        summary,
        body,
        bodyBlocks,
        attachments,
        imageUrl,
        linkUrl,
        linkText,
        sortOrder = 0,
        isPinned = false,
        isOperatorPicked = false,
        metadata = {},
        visibilityScope: reqVisibilityScope,
        // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6: 원장 하위 축 (KPA `sub_type` 대응). 회원 경로에서만 의미를 갖는다.
        subType: reqSubType,
      } = req.body;

      // WO-O4O-GLYCOPHARM-OPERATOR-GUIDELINES-403-FIX-V1
      // Authorize against target serviceKey (platform admin, or the service's operator|admin role)
      const { allowed, isPlatformAdmin } = await authorizeCmsMutation(user, serviceKey);

      // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6
      // operator/admin 인가에서 떨어지면 **회원 저작 capability** 를 본다.
      // capability 가 등록되지 않은 서비스(KPA/GP/KCos/Neture)는 종전과 완전히 동일한 403 이다.
      let memberCapability: CmsMemberAuthoringCapability | null = null;
      if (!allowed) {
        const memberDecision = authorizeCmsMemberCreate(user as any, serviceKey, type);
        if (!memberDecision.allowed) {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Admin, service admin, or service operator privileges required for this serviceKey',
            },
          });
          return;
        }
        memberCapability = memberDecision.capability;
      }

      // Validate required fields
      if (!type || !title) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'type and title are required' },
        });
        return;
      }

      // Supported content types
      if (!VALID_CONTENT_TYPES.includes(type)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Supported types: ${VALID_CONTENT_TYPES.join(', ')}` },
        });
        return;
      }

      // Determine author_role and visibility_scope
      // 회원 저작 행의 제작 주체·노출 축은 요청 본문이 아니라 capability 가 고정한다.
      const authorRole: ContentAuthorRole = memberCapability
        ? memberCapability.authorRole
        : isPlatformAdmin
          ? 'admin'
          : 'service_admin';
      const visibilityScope: ContentVisibilityScope = memberCapability
        ? memberCapability.visibilityScope
        : isPlatformAdmin
          ? (reqVisibilityScope || 'platform')
          : 'service';

      // Service admin must provide serviceKey
      if (!isPlatformAdmin && !serviceKey) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'serviceKey is required for service admin content' },
        });
        return;
      }

      const contentRepo = dataSource.getRepository(CmsContent);

      // WO-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1 §10:
      //   신규 row 는 항상 canonical service key 로 저장한다. 호출자가 role prefix 축
      //   ('kpa' / 'cosmetics') 를 보내도 legacy 값을 새로 만들지 않는다.
      const canonicalServiceKey: string | null = serviceKey
        ? canonicalizeCmsServiceKey(String(serviceKey))
        : null;

      const content = contentRepo.create({
        serviceKey: canonicalServiceKey,
        organizationId: organizationId || null,
        type: type as ContentType,
        title,
        summary: summary || null,
        body: body || null,
        bodyBlocks: bodyBlocks || null,
        attachments: attachments || null,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        linkText: linkText || null,
        status: 'draft' as ContentStatus,
        // 회원 저작 행은 진열 축(고정·운영자 픽·정렬)을 스스로 조작할 수 없다 — 운영자 축 전용이다.
        sortOrder: memberCapability ? 0 : sortOrder,
        isPinned: memberCapability ? false : isPinned,
        isOperatorPicked: memberCapability ? false : isOperatorPicked,
        // 회원 저작 행의 metadata 는 요청 본문을 그대로 받지 않는다 — 계약이 아는 키만 기록한다.
        metadata: memberCapability
          ? {
              creatorType: 'member',
              subType: normalizeCmsMemberSubType(memberCapability, reqSubType),
            }
          : { ...metadata, creatorType: 'operator' },
        createdBy: user.id,
      } as any);

      // Set new fields after create (until cms-core types are rebuilt)
      (content as any).authorRole = authorRole;
      (content as any).visibilityScope = visibilityScope;

      const saved = await contentRepo.save(content);

      res.status(201).json({
        success: true,
        data: saved,
      });
    } catch (error: any) {
      console.error('Failed to create CMS content:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PUT /cms/contents/:id
   * Update content (admin only)
   */
  router.put('/contents/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        serviceKey,
        type,
        title,
        summary,
        body,
        bodyBlocks,
        attachments,
        imageUrl,
        linkUrl,
        linkText,
        sortOrder,
        isPinned,
        isOperatorPicked,
        metadata,
      } = req.body;

      const contentRepo = dataSource.getRepository(CmsContent);

      const content = await contentRepo.findOne({
        where: { id },
      });

      if (!content) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' },
        });
        return;
      }

      // WO-O4O-GLYCOPHARM-OPERATOR-GUIDELINES-403-FIX-V1
      // Service-scoped authorization against the existing content's serviceKey.
      // Non-platform-admin callers cannot move content across services.
      const putAuth = await authorizeCmsMutation(req.user, content.serviceKey);

      // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6
      // 운영자 인가가 없으면 **작성자 본인의 community 콘텐츠**만 수정할 수 있다.
      // capability 미등록 서비스에서는 항상 false 이므로 기존 403 계약이 그대로 유지된다.
      const isMemberEdit = !putAuth.allowed && authorizeCmsMemberUpdate(req.user as any, content as any);
      if (!putAuth.allowed && !isMemberEdit) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin, service admin, or service operator privileges required for this content',
          },
        });
        return;
      }
      // 회원 수정은 서비스 경계·type·진열 축을 건드릴 수 없다 (본문 축만 수정한다).
      if (isMemberEdit && (
        (serviceKey !== undefined && !isSameCmsService(serviceKey, content.serviceKey)) ||
        (type !== undefined && type !== content.type) ||
        sortOrder !== undefined || isPinned !== undefined ||
        isOperatorPicked !== undefined || metadata !== undefined
      )) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Author may only edit content fields' },
        });
        return;
      }

      // Non-platform-admins may not change serviceKey (would escape their scope).
      // WO-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1 §11:
      //   alias 쌍('kpa' ↔ 'kpa-society')은 **같은 canonical service** 이므로
      //   ownership 이전이 아니다. 문자열 동등성으로 판정하지 않는다.
      const serviceKeyChanged =
        serviceKey !== undefined && !isSameCmsService(serviceKey, content.serviceKey);
      if (!putAuth.isPlatformAdmin && serviceKeyChanged) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot change serviceKey without platform admin role' },
        });
        return;
      }

      // Update fields if provided.
      // 같은 canonical service 를 가리키는 alias 재전송은 **쓰지 않는다** — legacy row 를
      // 이번 계약이 조용히 migration 하지 않기 위함이다 (WO §9: legacy row migration 0).
      if (serviceKeyChanged) {
        content.serviceKey = serviceKey ? canonicalizeCmsServiceKey(String(serviceKey)) : null;
      }
      if (type !== undefined) {
        // Supported content types
        if (!VALID_CONTENT_TYPES.includes(type)) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: `Supported types: ${VALID_CONTENT_TYPES.join(', ')}` },
          });
          return;
        }
        content.type = type as ContentType;
      }
      if (title !== undefined) content.title = title;
      if (summary !== undefined) content.summary = summary;
      if (body !== undefined) content.body = body;
      if (bodyBlocks !== undefined) (content as any).bodyBlocks = bodyBlocks;
      if (attachments !== undefined) (content as any).attachments = attachments;
      if (imageUrl !== undefined) content.imageUrl = imageUrl;
      if (linkUrl !== undefined) content.linkUrl = linkUrl;
      if (linkText !== undefined) content.linkText = linkText;
      if (sortOrder !== undefined) content.sortOrder = sortOrder;
      if (isPinned !== undefined) content.isPinned = isPinned;
      if (isOperatorPicked !== undefined) content.isOperatorPicked = isOperatorPicked;
      if (metadata !== undefined) content.metadata = metadata;

      const updated = await contentRepo.save(content);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Failed to update CMS content:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PATCH /cms/contents/:id/status
   * Change content status (admin only)
   *
   * Allowed transitions:
   * - draft -> published (sets publishedAt)
   * - published -> archived
   * - draft -> archived
   */
  // WO-O4O-CMS-TRANSITION-CENTRALIZATION-V1: delegated to CmsContentService
  router.patch('/contents/:id/status', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // WO-O4O-GLYCOPHARM-OPERATOR-GUIDELINES-403-FIX-V1
      // Load existing content to authorize against its serviceKey before transitioning.
      const contentRepo = dataSource.getRepository(CmsContent);
      const existing = await contentRepo.findOne({ where: { id } });
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' },
        });
        return;
      }
      const patchAuth = await authorizeCmsMutation(req.user, existing.serviceKey);

      // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6
      // 작성자 본인은 자기 community 콘텐츠에 대해 capability 가 정의한 **부분집합 전이**만 할 수 있다
      // (제출 draft→pending / 취소 pending→draft / 회수·삭제 draft|published→archived).
      // 최종 유효성은 그대로 서버 정본 `CMS_ALLOWED_TRANSITIONS` 가 재검증한다.
      const isMemberTransition =
        !patchAuth.allowed && authorizeCmsMemberTransition(req.user as any, existing as any, status);
      if (!patchAuth.allowed && !isMemberTransition) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin, service admin, or service operator privileges required for this content',
          },
        });
        return;
      }

      const updated = await cmsContentService.transitionContentStatus(id, status);

      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      if (error instanceof StatusValidationError) {
        res.status(400).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
        return;
      }
      if (error instanceof StatusTransitionError) {
        res.status(400).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
        return;
      }
      console.error('Failed to update CMS content status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
