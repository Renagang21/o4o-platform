/**
 * Admin Ops Metrics Routes
 *
 * WO-NEXT-OPS-METRICS-P0: Unified operations metrics for platform-wide health monitoring
 *
 * This is NOT an analytics dashboard - it's an operational judgment tool.
 * Purpose: Allow operators to quickly determine if intervention is needed.
 *
 * Endpoints:
 * - GET /api/v1/admin/ops/metrics - Get platform-wide operational metrics
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { CmsContent, CmsContentSlot } from '@o4o-apps/cms-core';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';


// Critical slot keys that should have content
const CRITICAL_SLOT_KEYS = ['home-hero', 'intranet-hero', 'dashboard-banner', 'store-tv-loop'];

/**
 * Create Admin Ops Metrics routes
 */
export function createAdminOpsMetricsRoutes(dataSource: DataSource): Router {
  const router = Router();

  // WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1 (회귀 복구)
  //   이 router 는 인증을 상위 `/api/v1/admin` blanket 에 의존하고 있었다.
  //   blanket 이 자기 prefix 로 한정된 뒤로는 req.user 가 비어 requireAdmin 이
  //   requireAuth 로 위임 → 인증만 하고 next() 하면서 역할 검사가 건너뛰어졌다.
  //   자기 router 에서 인증을 명시해 requireAdmin 이 실제로 역할을 검사하게 한다.
  router.use(authenticate);

  /**
   * GET /admin/ops/metrics
   * Get platform-wide operational metrics for quick health assessment
   *
   * Returns aggregated counts and status indicators for:
   * - Services (active count)
   * - Channels (online/offline/maintenance/unknown)
   * - CMS (locked slots, empty critical areas, expired content)
   * - Operations status (automated vs manual attention needed)
   */
  router.get('/metrics', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      // thresholdSec 은 응답에 그대로 되돌려준다(요청 파라미터 echo). 기존 계약 유지.
      const { thresholdSec = '120' } = req.query as { thresholdSec?: string };

      const contentRepo = dataSource.getRepository(CmsContent);
      const slotRepo = dataSource.getRepository(CmsContentSlot);

      // ================================================================
      // 1. [RETIRED] CHANNEL METRICS — 제거됨
      // ================================================================
      // WO-O4O-POST-RETIREMENT-MAIN-BASELINE-HOUSEKEEPING-V1
      //   CMS Channel 축(channels / channel_heartbeats)은 은퇴했다
      //   (WO-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-AND-TABLET-SCREENSET-CANONICALIZATION-V1).
      //   table 은 보존 중이지만 runtime 접근은 하지 않는다 —
      //   "테이블이 남아 있다는 이유로 runtime 접근을 허용하지 않는다."
      //   여기서 읽던 channels/heartbeat 는 프로덕션 0행이라 항상 0 을 보고하고 있었다.
      //   canonical 재생 경로: docs/baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md

      //   응답 shape 은 그대로 둔다(소비 UI 계약 유지). 값은 은퇴 이전에도 프로덕션에서
      //   항상 0 이었으므로 이 변경으로 응답이 달라지지 않는다.
      const channelStatusCounts = {
        total: 0,
        online: 0,
        offline: 0,
        maintenance: 0,
        unknown: 0,
      } as const;

      // [RETIRED SOURCE] services 목록은 channels[].serviceKey 에서 파생됐다.
      //   그 축이 은퇴해 유효한 출처가 없다. 새 출처를 임의로 만들지 않는다(별도 판단 필요).
      const serviceKeys = new Set<string>();

      // ================================================================
      // 2. CMS METRICS
      // ================================================================

      // Count locked slots
      const lockedSlotsCount = await slotRepo.count({
        where: { isLocked: true },
      });

      // Find empty critical slots (critical slot keys without active content)
      const allSlots = await slotRepo.find({
        where: { isActive: true },
        relations: ['content'],
      });

      const slotKeysByContent = new Map<string, boolean>();
      for (const slot of allSlots) {
        if (slot.content && slot.content.status === 'published') {
          slotKeysByContent.set(slot.slotKey, true);
        }
      }

      let emptyCriticalSlotsCount = 0;
      for (const criticalKey of CRITICAL_SLOT_KEYS) {
        if (!slotKeysByContent.has(criticalKey)) {
          emptyCriticalSlotsCount++;
        }
      }

      // Count expired content (status = published but expiresAt < now)
      const now = new Date();
      const allContents = await contentRepo.find({
        where: { status: 'published' },
      });

      let expiredContentsCount = 0;
      for (const content of allContents) {
        if (content.expiresAt && content.expiresAt < now) {
          expiredContentsCount++;
        }
      }

      // Count draft-only areas (slots with only draft content)
      const draftOnlyAreasCount = 0; // Simplified for P0

      // ================================================================
      // 3. OPERATIONS STATUS INDICATORS
      // ================================================================

      // [RETIRED SOURCE] automated / manualAttention / contractControlled 는
      //   channels 를 순회하며 heartbeat + slot 콘텐츠로 판정하던 값이다.
      //   Channel 축 은퇴로 출처가 사라졌다. 은퇴 이전에도 channels 0행이라 셋 다 항상 0 이었다.
      //   대체 출처는 임의로 정하지 않는다(별도 판단 필요).
      const automatedCount = 0;
      const manualAttentionCount = 0;
      const contractControlledCount = 0;

      // ================================================================
      // 4. BUILD RESPONSE
      // ================================================================
      const response = {
        success: true,
        data: {
          services: {
            total: serviceKeys.size,
            active: serviceKeys.size, // For now, assume all are active
            list: Array.from(serviceKeys),
          },
          channels: channelStatusCounts,
          cms: {
            lockedSlots: lockedSlotsCount,
            emptyCriticalSlots: emptyCriticalSlotsCount,
            expiredContents: expiredContentsCount,
            draftOnlyAreas: draftOnlyAreasCount,
            criticalSlotKeys: CRITICAL_SLOT_KEYS,
          },
          opsStatus: {
            automated: automatedCount,
            manualAttention: manualAttentionCount,
            contractControlled: contractControlledCount,
          },
          health: {
            // Overall health indicator
            status: getOverallHealthStatus(channelStatusCounts, emptyCriticalSlotsCount, expiredContentsCount),
            indicators: {
              channelsHealthy: channelStatusCounts.offline === 0 && channelStatusCounts.unknown === 0,
              cmsHealthy: emptyCriticalSlotsCount === 0 && expiredContentsCount === 0,
              noManualAttentionNeeded: manualAttentionCount === 0,
            },
          },
          lastUpdatedAt: new Date().toISOString(),
        },
        thresholdSec: parseInt(thresholdSec as string, 10),
      };

      res.json(response);
    } catch (error: any) {
      console.error('Failed to get ops metrics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}

/**
 * Determine overall health status based on metrics
 */
function getOverallHealthStatus(
  channelCounts: { total: number; online: number; offline: number; maintenance: number; unknown: number },
  emptyCritical: number,
  expiredContents: number
): 'healthy' | 'warning' | 'critical' {
  // Critical: Any offline channels or empty critical slots
  if (channelCounts.offline > 0 || emptyCritical > 0) {
    return 'critical';
  }

  // Warning: Unknown channels or expired content
  if (channelCounts.unknown > 0 || expiredContents > 0) {
    return 'warning';
  }

  return 'healthy';
}
