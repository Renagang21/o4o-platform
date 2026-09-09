/**
 * Platform Hub Controller — Global Aggregation + Cross-Service Trigger Proxy
 *
 * WO-PLATFORM-GLOBAL-HUB-V1
 *
 * 플랫폼 통합 허브의 백엔드.
 * 모든 서비스 데이터를 집계하고, cross-service trigger를 프록시한다.
 *
 * Security:
 * - platform:super_admin 전용
 * - 서비스별 trigger는 화이트리스트 기반
 */

import { Router } from 'express';
import type { Request, Response, Router as ExpressRouter } from 'express';
import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import { isPlatformAdmin } from '../../utils/role.utils.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { ActionLogService } from '@o4o/action-log-core';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    name?: string;
    roles?: string[];
  };
};

// ─── Platform Admin Guard ───

function requirePlatformAdmin(req: Request, res: Response, next: () => void) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    return;
  }
  const roles: string[] = user.roles || [];
  if (!isPlatformAdmin(roles)) {
    res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'platform:super_admin required' });
    return;
  }
  next();
}

// ─── Service Summary Collectors ───

/**
 * WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 테이블명 교정
 *
 * 기존 쿼리는 `FROM kpa_member` · `FROM kpa_application` (**단수**) 였다. 실제 canonical 테이블은
 * `kpa_members` · `kpa_applications` (복수) 이며, 단수형은 저장소 전체에서 이 파일에만 존재했다
 * (`20260206190000-CreateKpaFoundationTables.ts` 가 생성하는 이름이 정본).
 *
 * 그 결과 **첫 쿼리에서 곧바로 throw** → 아래 catch → KPA 카드가 영구히
 * `error: 'unavailable'` · `riskLevel: 'unknown'` 으로 렌더됐다. 플랫폼 HUB 화면의 KPA 요약은
 * 한 번도 동작한 적이 없다.
 *
 * ⚠ **HTTP 는 200 이었다** — 서비스별 수집 실패를 카드 단위로 흡수하는 구조이기 때문이다.
 *   그래서 과거의 "조회 API 2xx 확인" 검증(WO-O4O-ADMIN-MENU-CONNECT-READY-ONLY-V1)을 그대로
 *   통과했다. 이 화면 계열은 **status code 가 아니라 카드별 `error` 필드로 검증**해야 한다.
 *
 * 근거: docs/investigations/IR-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-CENSUS-V1.md §5-4 #1
 */
async function getKpaSummary(ds: DataSource): Promise<Record<string, any>> {
  try {
    const [memberStats] = await ds.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as "activeMembers",
        COUNT(*) FILTER (WHERE status = 'pending') as "pendingMembers",
        COUNT(*) as "totalMembers"
      FROM kpa_members
    `);

    const [appStats] = await ds.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'submitted') as "pendingApplications",
        COUNT(*) as "totalApplications"
      FROM kpa_applications
    `);

    const [forumStats] = await ds.query(`
      SELECT COUNT(*) as "totalPosts"
      FROM forum_post
      WHERE status = 'publish' AND organization_id IS NULL
    `);

    return {
      service: 'kpa',
      label: 'KPA (약사회)',
      members: {
        total: parseInt(memberStats?.totalMembers || '0'),
        active: parseInt(memberStats?.activeMembers || '0'),
        pending: parseInt(memberStats?.pendingMembers || '0'),
      },
      applications: {
        total: parseInt(appStats?.totalApplications || '0'),
        pending: parseInt(appStats?.pendingApplications || '0'),
      },
      forum: {
        totalPosts: parseInt(forumStats?.totalPosts || '0'),
      },
      riskLevel: parseInt(memberStats?.pendingMembers || '0') > 10 ? 'warning'
        : parseInt(appStats?.pendingApplications || '0') > 5 ? 'warning' : 'healthy',
    };
  } catch (error) {
    logger.warn('[Platform Hub] KPA summary failed:', error);
    return { service: 'kpa', label: 'KPA (약사회)', error: 'unavailable', riskLevel: 'unknown' };
  }
}

async function getNetureSummary(ds: DataSource): Promise<Record<string, any>> {
  try {
    const [supplierStats] = await ds.query(`
      SELECT
        COUNT(*) as "totalSuppliers",
        COUNT(*) FILTER (WHERE status = 'ACTIVE') as "activeSuppliers"
      FROM neture_suppliers
    `);

    // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals
    const [requestStats] = await ds.query(`
      SELECT
        COUNT(*) as "totalRequests",
        COUNT(*) FILTER (WHERE approval_status = 'pending') as "pendingRequests",
        COUNT(*) FILTER (WHERE approval_status = 'approved') as "approvedRequests"
      FROM product_approvals
      WHERE approval_type = 'private'
    `);

    const totalReq = parseInt(requestStats?.totalRequests || '0');
    const approvedReq = parseInt(requestStats?.approvedRequests || '0');
    const approvalRate = totalReq > 0 ? Math.round((approvedReq / totalReq) * 100) : 100;

    return {
      service: 'neture',
      label: 'Neture (공급자)',
      suppliers: {
        total: parseInt(supplierStats?.totalSuppliers || '0'),
        active: parseInt(supplierStats?.activeSuppliers || '0'),
      },
      requests: {
        total: totalReq,
        pending: parseInt(requestStats?.pendingRequests || '0'),
        approvalRate,
      },
      riskLevel: approvalRate < 50 ? 'critical'
        : parseInt(requestStats?.pendingRequests || '0') > 5 ? 'warning' : 'healthy',
    };
  } catch (error) {
    logger.warn('[Platform Hub] Neture summary failed:', error);
    return { service: 'neture', label: 'Neture (공급자)', error: 'unavailable', riskLevel: 'unknown' };
  }
}

// getGlycopharmSummary() — REMOVED (WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1)

// ─── Trigger Proxy ───

const TRIGGER_WHITELIST: Record<string, Record<string, string>> = {
  neture: {
    'neture.trigger.review_pending': 'review-pending',
    'neture.trigger.auto_product': 'auto-product',
    'neture.trigger.copy_best_content': 'copy-best-content',
    'neture.trigger.refresh_settlement': 'refresh-settlement',
    'neture.trigger.refresh_ai': 'ai-refresh',
    'neture.trigger.approve_supplier': 'approve-supplier',
    'neture.trigger.manage_partnership': 'manage-partnership',
    'neture.trigger.audit_review': 'audit-review',
  },
};

const SERVICE_TRIGGER_PATHS: Record<string, string> = {
  neture: '/api/v1/neture/hub/trigger',
};

// ─── Controller Factory ───

export function createPlatformHubController(dataSource: DataSource): ExpressRouter {
  const router: ExpressRouter = Router();
  const actionLogService = new ActionLogService(dataSource);

  /**
   * GET /api/v1/platform/hub/summary
   * 전체 서비스 집계 반환
   */
  router.get('/summary', requireAuth, requirePlatformAdmin, async (_req: Request, res: Response) => {
    try {
      const [kpaResult, netureResult] = await Promise.allSettled([
        getKpaSummary(dataSource),
        getNetureSummary(dataSource),
      ]);

      const kpa = kpaResult.status === 'fulfilled' ? kpaResult.value
        : { service: 'kpa', label: 'KPA (약사회)', error: 'unavailable', riskLevel: 'unknown' };
      const neture = netureResult.status === 'fulfilled' ? netureResult.value
        : { service: 'neture', label: 'Neture (공급자)', error: 'unavailable', riskLevel: 'unknown' };
      // Compute global risk level
      const riskLevels = [kpa.riskLevel, neture.riskLevel];
      const globalRisk = riskLevels.includes('critical') ? 'critical'
        : riskLevels.includes('warning') ? 'warning'
        : riskLevels.includes('unknown') ? 'partial' : 'healthy';

      // Build top action queue (priority-sorted)
      const actions: Array<{ service: string; actionKey: string; priority: number; label: string }> = [];

      // Neture pending requests
      if (neture.requests?.pending > 0) {
        actions.push({
          service: 'neture',
          actionKey: 'neture.trigger.review_pending',
          priority: 0.85 + Math.min(neture.requests.pending * 0.01, 0.1),
          label: `대기 요청 ${neture.requests.pending}건 — 검토 필요`,
        });
      }

      // KPA pending applications
      if (kpa.applications?.pending > 0) {
        actions.push({
          service: 'kpa',
          actionKey: 'kpa.process.pending_approvals',
          priority: 0.80 + Math.min(kpa.applications.pending * 0.01, 0.1),
          label: `회원 신청 ${kpa.applications.pending}건 — 승인 필요`,
        });
      }

      // KPA pending members
      if (kpa.members?.pending > 0) {
        actions.push({
          service: 'kpa',
          actionKey: 'kpa.process.pending_approvals',
          priority: 0.75,
          label: `가입 대기 ${kpa.members.pending}명`,
        });
      }

      // Neture low approval rate
      if (neture.requests?.approvalRate < 50 && neture.requests?.total > 0) {
        actions.push({
          service: 'neture',
          actionKey: 'neture.trigger.approve_supplier',
          priority: 0.70,
          label: `승인율 ${neture.requests.approvalRate}% — 검토 권장`,
        });
      }

      // Sort by priority descending, take top 5
      actions.sort((a, b) => b.priority - a.priority);

      res.json({
        success: true,
        data: {
          globalRisk,
          services: { kpa, neture },
          topActions: actions.slice(0, 5),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('[Platform Hub] Summary aggregation error:', error);
      res.status(500).json({ success: false, error: 'AGGREGATION_FAILED' });
    }
  });

  /**
   * POST /api/v1/platform/hub/trigger
   * Cross-service trigger proxy
   *
   * Body: { service: string, actionKey: string }
   */
  router.post('/trigger', requireAuth, requirePlatformAdmin, async (req: Request, res: Response) => {
    const start = Date.now();
    const userId = (req as AuthenticatedRequest).user?.id;

    try {
      const { service, actionKey } = req.body;

      if (!service || !actionKey) {
        res.status(400).json({ success: false, message: 'service and actionKey required' });
        return;
      }

      // Whitelist check
      const serviceActions = TRIGGER_WHITELIST[service];
      if (!serviceActions) {
        res.status(400).json({ success: false, message: `Unknown service: ${service}` });
        return;
      }

      const endpoint = serviceActions[actionKey];
      if (!endpoint) {
        res.status(400).json({ success: false, message: `Action not allowed: ${actionKey}` });
        return;
      }

      const basePath = SERVICE_TRIGGER_PATHS[service];
      if (!basePath) {
        res.status(400).json({ success: false, message: `No trigger path for service: ${service}` });
        return;
      }

      // Internal proxy call
      const port = process.env.PORT || 3000;
      const internalUrl = `http://localhost:${port}${basePath}/${endpoint}`;

      const proxyHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (req.headers.authorization) {
        proxyHeaders['Authorization'] = req.headers.authorization;
      }
      if (req.headers.cookie) {
        proxyHeaders['Cookie'] = req.headers.cookie;
      }

      const proxyRes = await fetch(internalUrl, {
        method: 'POST',
        headers: proxyHeaders,
      });

      const result = await proxyRes.json();
      const durationMs = Date.now() - start;
      const isSuccess = proxyRes.status >= 200 && proxyRes.status < 400;

      // Log the cross-service trigger execution
      if (userId) {
        if (isSuccess) {
          actionLogService.logSuccess('platform', userId, actionKey, {
            source: 'platform', durationMs,
            meta: { service, endpoint, proxyStatus: proxyRes.status },
          }).catch(() => {});
        } else {
          actionLogService.logFailure('platform', userId, actionKey, `Proxy returned ${proxyRes.status}`, {
            source: 'platform', durationMs,
            meta: { service, endpoint, proxyStatus: proxyRes.status },
          }).catch(() => {});
        }
      }

      res.status(proxyRes.status).json({
        ...result,
        _proxy: { service, actionKey, endpoint },
      });
    } catch (error: any) {
      if (userId) {
        actionLogService.logFailure('platform', userId, req.body?.actionKey || 'unknown', error.message, {
          source: 'platform', durationMs: Date.now() - start,
        }).catch(() => {});
      }
      logger.error('[Platform Hub] Trigger proxy error:', error);
      res.status(500).json({ success: false, message: 'Trigger proxy failed' });
    }
  });

  return router;
}
