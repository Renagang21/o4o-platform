/**
 * CMS Content Query Handler — Read-only content endpoints
 *
 * WO-O4O-CMS-CONTENT-ROUTES-SPLIT-V1
 * Extracted from cms-content.routes.ts
 *
 * Endpoints:
 *   GET /stats       — Content statistics (for dashboards)
 *   GET /contents    — List contents (with filters, including authorRole)
 *   GET /contents/:id — Get single content
 */

import { Router, Request, Response } from 'express';
import { In, type DataSource } from 'typeorm';
import { CmsContent, ContentType, ContentStatus } from '@o4o-apps/cms-core';
import { optionalAuth } from '../../middleware/auth.middleware.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import logger from '../../utils/logger.js';
import {
  mapCmsAuthorRole,
  mapCmsVisibilityScope,
  mapCmsStatus,
} from '@o4o/types';
import {
  resolveCmsReadScope,
  hasCmsServiceOperatorRole,
  CMS_SERVICE_KEY_REQUIRED_ERROR,
} from './cms-content-utils.js';
import { loadCmsEngagement } from './cms-content-engagement.js';

/**
 * WO-O4O-CMS-CONTENT-DETAIL-SERVICE-SCOPE-GUARD-V1:
 *   상세 조회에 잘못된 형식의 id 가 오면 Postgres 가 `invalid input syntax for type uuid` 로 던져
 *   500 + DB 원문이 그대로 노출됐다. 형식 검증 후 **기존 canonical 404** 로 정규화한다
 *   (존재 여부를 구분해 노출하지 않는 기존 정책과 동일한 응답).
 *   기존 컨트롤러들과 같은 관례를 쓴다 (BranchServiceMembershipController 등).
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createCmsContentQueryRoutes(deps: {
  dataSource: DataSource;
}): Router {
  const router = Router();
  const { dataSource } = deps;

  /**
   * WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1:
   *   공통 read 경계 판정. `serviceKey` 가 경계이며, 생략은 **PLATFORM_ADMIN 역할**로만 허용된다.
   *   (파라미터 생략을 관리자 모드로 해석하지 않는다 — CHECK §6)
   */
  const readScope = (req: Request, serviceKey: unknown) =>
    resolveCmsReadScope({
      user: (req as any).user,
      serviceKey,
      roleChecker: roleAssignmentService,
      onError: (m) => logger.warn('[CMS] Platform admin RoleAssignment check failed:', m),
    });

  /**
   * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 — 회원 저작 콘텐츠의 비공개 행 가시성.
   *
   *   공통 CMS 에 `authorRole='community'` 행이 생기면, 인증만 하면 `?status=draft` 로
   *   **남의 초안**을 읽을 수 있게 된다. 회원 저작을 여는 것과 같은 변경에서 닫는다.
   *
   *   판정: platform admin 또는 해당 서비스 운영자면 종전대로 전부 본다.
   *         그 외에는 community 행 중 `published` 가 아닌 것은 **작성자 본인만** 본다.
   *
   *   community 행이 없는 서비스(KPA/GP/KCos/Neture)에는 해당 조건이 걸릴 대상이 없어
   *   기존 read 결과가 그대로다 (behavior 변화 0).
   */
  const communityReadRestriction = async (
    req: Request,
    serviceKey: unknown,
  ): Promise<{ restrict: boolean; selfId: string | null }> => {
    const user = (req as any).user;
    if (!user) return { restrict: false, selfId: null }; // 비인증은 이미 published 로 고정된다
    const key = typeof serviceKey === 'string' && serviceKey.trim() ? serviceKey.trim() : null;
    const privileged =
      (await resolveCmsReadScope({
        user,
        serviceKey: undefined,
        roleChecker: roleAssignmentService,
        onError: (m) => logger.warn('[CMS] Platform admin RoleAssignment check failed:', m),
      })).ok ||
      (await hasCmsServiceOperatorRole(user, key, roleAssignmentService, (m) =>
        logger.warn('[CMS] Service role RoleAssignment check failed:', m),
      ));
    return { restrict: !privileged, selfId: user.id ?? null };
  };

  /**
   * GET /cms/stats
   * Get content statistics for dashboards
   *
   * Query params:
   * - serviceKey: Filter by service (glycopharm, kpa, etc.)
   * - organizationId: Filter by organization
   */
  router.get('/stats', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceKey, organizationId } = req.query;
      const contentRepo = dataSource.getRepository(CmsContent);

      // WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1:
      //   집계도 read 다. serviceKey 없이 전 서비스를 합산하던 동작을 닫는다 (CHECK §8).
      const scope = await readScope(req, serviceKey);
      if (!scope.ok) {
        res.status(400).json(CMS_SERVICE_KEY_REQUIRED_ERROR);
        return;
      }

      // Build base where clause for scope
      const baseWhere: any = {};
      if (scope.serviceKeys) {
        baseWhere.serviceKey = In(scope.serviceKeys);
      }
      if (organizationId) {
        baseWhere.organizationId = organizationId as string;
      }

      // Get counts by type
      const [
        heroTotal,
        heroActive,
        noticeTotal,
        noticeActive,
        newsTotal,
        newsActive,
        featuredTotal,
        featuredOperatorPicked,
        promoTotal,
        promoActive,
        eventTotal,
        eventActive,
      ] = await Promise.all([
        // Hero
        contentRepo.count({ where: { ...baseWhere, type: 'hero' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'hero', status: 'published' } }),
        // Notice
        contentRepo.count({ where: { ...baseWhere, type: 'notice' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'notice', status: 'published' } }),
        // News
        contentRepo.count({ where: { ...baseWhere, type: 'news' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'news', status: 'published' } }),
        // Featured
        contentRepo.count({ where: { ...baseWhere, type: 'featured' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'featured', isOperatorPicked: true } }),
        // Promo
        contentRepo.count({ where: { ...baseWhere, type: 'promo' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'promo', status: 'published' } }),
        // Event
        contentRepo.count({ where: { ...baseWhere, type: 'event' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'event', status: 'published' } }),
      ]);

      // WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1: pending count across all types
      const pendingTotal = await contentRepo.count({
        where: { ...baseWhere, status: 'pending' as any },
      });

      // Calculate combined stats
      const eventNoticeTotal = noticeTotal + eventTotal;
      const eventNoticeActive = noticeActive + eventActive;

      res.json({
        success: true,
        data: {
          hero: { total: heroTotal, active: heroActive },
          notice: { total: noticeTotal, active: noticeActive },
          news: { total: newsTotal, active: newsActive },
          featured: { total: featuredTotal, operatorPicked: featuredOperatorPicked },
          promo: { total: promoTotal, active: promoActive },
          event: { total: eventTotal, active: eventActive },
          // Combined for Glycopharm dashboard compatibility
          eventNotice: { total: eventNoticeTotal, active: eventNoticeActive },
          // WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1
          pendingApproval: pendingTotal,
        },
        scope: {
          serviceKey: serviceKey || null,
          serviceKeys: scope.serviceKeys,
          crossService: scope.crossService,
          organizationId: organizationId || null,
        },
      });
    } catch (error: any) {
      console.error('Failed to get CMS content stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /cms/contents
   * List content items with filters
   *
   * Query params:
   * - serviceKey: Filter by service
   * - organizationId: Filter by organization
   * - type: Filter by content type (hero, notice, news, etc.)
   * - status: Filter by status (draft, published, archived)
   * - isPinned: Filter pinned items
   * - authorRole: Filter by author role (admin, service_admin, supplier, community)
   * - visibilityScope: Filter by visibility scope (platform, service, organization)
   * - limit: Max items to return (default: 20)
   * - offset: Pagination offset (default: 0)
   */
  router.get('/contents', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        serviceKey,
        organizationId,
        type,
        status,
        isPinned,
        authorRole,
        visibilityScope,
        limit = '20',
        offset = '0',
        search,
        // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6: 회원의 "내 콘텐츠" 축. 인증 사용자 본인 행만 좁힌다.
        mine,
        // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6: 원장 하위 축 (콘텐츠 / 자료실). metadata.subType 에 기록된다.
        subType,
      } = req.query;

      const contentRepo = dataSource.getRepository(CmsContent);

      // WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1:
      //   목록이 serviceKey 없이 전 서비스를 반환하던 동작을 닫는다.
      //   상세(:id)와 **같은 경계**여야 list/detail invariant 가 성립한다 (CHECK §7).
      const scope = await readScope(req, serviceKey);
      if (!scope.ok) {
        res.status(400).json(CMS_SERVICE_KEY_REQUIRED_ERROR);
        return;
      }

      // Build where clause
      const where: any = {};
      if (scope.serviceKeys) {
        where.serviceKey = In(scope.serviceKeys);
      }
      if (organizationId) {
        where.organizationId = organizationId as string;
      }
      if (type) {
        where.type = type as ContentType;
      }
      // WO-O4O-CMS-PUBLIC-VISIBILITY-HARDENING-V1:
      // 비인증 사용자는 published만 조회 가능
      if (!(req as any).user) {
        where.status = 'published';
      } else if (status) {
        where.status = status as ContentStatus;
      }
      if (isPinned === 'true') {
        where.isPinned = true;
      }
      // WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: author_role + visibility_scope filters
      if (authorRole) {
        where.authorRole = authorRole as string;
      }
      if (visibilityScope) {
        where.visibilityScope = visibilityScope as string;
      }

      // WO-O4O-KPA-CONTENT-HUB-LIST-UX-REFINE-V1: search 지원
      const takeVal = parseInt(limit as string, 10);
      const skipVal = parseInt(offset as string, 10);

      const { restrict, selfId } = await communityReadRestriction(req, serviceKey);
      if (mine === 'true' && !selfId) {
        res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required for mine=true' },
        });
        return;
      }

      /*
       * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6:
       *   추가 조건(회원 가시성 제한 · subType · mine · search)이 하나라도 걸릴 때만
       *   QueryBuilder 로 간다. 아무것도 걸리지 않으면 **기존 findAndCount 경로 그대로**다
       *   — 기존 4서비스의 목록 쿼리·정렬·페이지네이션이 한 글자도 달라지지 않는다.
       *   `restrict` 가 false 인 경우 가시성 조건은 정의상 no-op 이므로 생략해도 동치다.
       */
      const hasSearch = typeof search === 'string' && !!search.trim();
      const hasSubType = typeof subType === 'string' && !!subType.trim();
      const needsQueryBuilder = restrict || hasSearch || hasSubType || mine === 'true';

      let contents: CmsContent[];
      let total: number;

      if (!needsQueryBuilder) {
        [contents, total] = await contentRepo.findAndCount({
          where,
          order: { isPinned: 'DESC', sortOrder: 'ASC', createdAt: 'DESC' },
          take: takeVal,
          skip: skipVal,
        });
      } else {
      const qb = contentRepo.createQueryBuilder('c');
      Object.entries(where).forEach(([key, val]) => {
        // serviceKey 는 alias 집합이라 `= :key` 로 바인딩하면 안 된다 (FindOperator 가 그대로 들어간다).
        if (key === 'serviceKey') return;
        qb.andWhere(`c."${key}" = :${key}`, { [key]: val });
      });
      if (scope.serviceKeys) {
        qb.andWhere('c."serviceKey" IN (:...scopeServiceKeys)', {
          scopeServiceKeys: scope.serviceKeys,
        });
      }
      if (hasSearch) {
        qb.andWhere('(c.title ILIKE :search OR c.summary ILIKE :search)', {
          search: `%${(search as string).trim()}%`,
        });
      }

      if (hasSubType) {
        qb.andWhere(`c."metadata"->>'subType' = :subType`, { subType: (subType as string).trim() });
      }

      if (restrict) {
        // community 행은 published 이거나 본인 것만 보인다. 그 외 authorRole 은 종전 그대로.
        qb.andWhere(
          `(c."authorRole" IS DISTINCT FROM 'community' OR c."status" = 'published'${
            selfId ? ' OR c."createdBy" = :selfId' : ''
          })`,
          selfId ? { selfId } : {},
        );
      }
      if (mine === 'true') {
        qb.andWhere('c."createdBy" = :mineId', { mineId: selfId });
      }

      qb.orderBy('c."isPinned"', 'DESC')
        .addOrderBy('c."sortOrder"', 'ASC')
        .addOrderBy('c."createdAt"', 'DESC')
        .take(takeVal)
        .skip(skipVal);

      [contents, total] = await qb.getManyAndCount();
      }

      // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 (audit #28):
      //   추천/조회수는 별도 축(`cms_content_recommendations`, `cms_contents."viewCount"`)이라
      //   entity(cms-core 는 동결) 에 없다. 한 번의 raw 조회로 붙인다.
      //   조회가 불가능하면 `null` 이 돌아오고 **필드를 생략**한다 — 0 으로 위장하지 않는다.
      const engagement = await loadCmsEngagement(
        dataSource,
        contents.map(c => c.id),
        (req as any).user?.id ?? null,
      );

      res.json({
        success: true,
        data: contents.map(content => {
          const authorRole = (content as any).authorRole ?? 'admin';
          const visibilityScope = (content as any).visibilityScope ?? 'platform';
          return {
            id: content.id,
            type: content.type,
            title: content.title,
            summary: content.summary,
            imageUrl: content.imageUrl,
            linkUrl: content.linkUrl,
            linkText: content.linkText,
            status: content.status,
            publishedAt: content.publishedAt,
            isPinned: content.isPinned,
            isOperatorPicked: content.isOperatorPicked,
            sortOrder: content.sortOrder,
            authorRole,
            visibilityScope,
            createdAt: content.createdAt,
            // ContentMeta (WO-CONTENT-META-API-ENRICHMENT-V1)
            producer: mapCmsAuthorRole(authorRole),
            producerRef: (content as any).createdBy ?? '',
            visibility: mapCmsVisibilityScope(visibilityScope),
            serviceKey: (content as any).serviceKey ?? undefined,
            contentType: 'cms_block' as const,
            metaStatus: mapCmsStatus(content.status as any),
            ...(engagement?.get(content.id) ?? {}),
          };
        }),
        pagination: {
          total,
          limit: takeVal,
          offset: skipVal,
        },
      });
    } catch (error: any) {
      console.error('Failed to list CMS contents:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /cms/contents/:id
   * Get single content by ID
   */
  router.get('/contents/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      // WO-O4O-CMS-CONTENT-DETAIL-SERVICE-SCOPE-GUARD-V1:
      //   목록(GET /contents)과 **동일한 기존 query 계약**(`serviceKey`)을 상세에서도 인정한다.
      //   신규 파라미터·헤더를 만들지 않는다. 주어지면 DB 조회 자체를 그 서비스로 제한한다.
      // WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1:
      //   opt-in 이던 이 경계를 **강제**로 전환한다. 생략은 PLATFORM_ADMIN 역할로만 허용된다.
      const { serviceKey } = req.query;
      const contentRepo = dataSource.getRepository(CmsContent);

      // 잘못된 UUID 는 DB 까지 보내지 않고 canonical 404 로 응답한다 (DB 오류 원문 노출 금지).
      if (!UUID_REGEX.test(id)) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' },
        });
        return;
      }

      const scope = await readScope(req, serviceKey);
      if (!scope.ok) {
        res.status(400).json(CMS_SERVICE_KEY_REQUIRED_ERROR);
        return;
      }

      const detailWhere: Record<string, unknown> = { id };
      if (scope.serviceKeys) {
        detailWhere.serviceKey = In(scope.serviceKeys);
      }

      const content = await contentRepo.findOne({
        where: detailWhere,
      });

      // WO-O4O-CMS-PUBLIC-VISIBILITY-HARDENING-V1:
      // 비인증 사용자에게 미게시 콘텐츠는 404 반환 (존재 노출 방지)
      if (!content || (!(req as any).user && content.status !== 'published')) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' },
        });
        return;
      }

      // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6: 목록과 **같은 경계**를 상세에도 적용한다 (list/detail invariant).
      if ((content as any).authorRole === 'community' && content.status !== 'published') {
        const { restrict, selfId } = await communityReadRestriction(req, serviceKey);
        if (restrict && (content as any).createdBy !== selfId) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Content not found' },
          });
          return;
        }
      }

      const authorRole = (content as any).authorRole ?? 'admin';
      const visibilityScope = (content as any).visibilityScope ?? 'platform';
      const detailEngagement = await loadCmsEngagement(
        dataSource,
        [content.id],
        (req as any).user?.id ?? null,
      );
      res.json({
        success: true,
        data: {
          ...content,
          ...(detailEngagement?.get(content.id) ?? {}),
          // ContentMeta (WO-CONTENT-META-API-ENRICHMENT-V1)
          producer: mapCmsAuthorRole(authorRole),
          producerRef: (content as any).createdBy ?? '',
          visibility: mapCmsVisibilityScope(visibilityScope),
          serviceKey: (content as any).serviceKey ?? undefined,
          contentType: 'cms_block' as const,
          metaStatus: mapCmsStatus(content.status as any),
        },
      });
    } catch (error: any) {
      console.error('Failed to get CMS content:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
