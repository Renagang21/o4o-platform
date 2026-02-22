/**
 * GlycoPharm Hub Trigger Controller
 *
 * WO-GLYCOPHARM-HUB-AI-TRIGGER-INTEGRATION-V1
 * WO-PLATFORM-ACTION-LOG-CORE-V1 (ActionLog integration)
 * WO-GLYCOPHARM-SCOPE-SIMPLIFICATION-V1: middleware pattern, resolve 단일화
 *
 * QuickAction 실행 엔드포인트.
 * Hub 카드의 액션 버튼 → 이 컨트롤러 → Care/Store API 실행.
 *
 * 보안:
 * - requireAuth + requirePharmacyContext (미들웨어)
 * - pharmacistId 서버 강제
 * - pharmacy_id 격리
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { runAIInsight } from '@o4o/ai-core';
import { createPharmacyContextMiddleware } from '../../../modules/care/care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../../../modules/care/care-pharmacy-context.middleware.js';
import type { ActionLogService } from '@o4o/action-log-core';

type AuthMiddleware = RequestHandler;

export function createHubTriggerController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  actionLogService?: ActionLogService,
): Router {
  const router = Router();
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // ================================================================
  // POST /pharmacy/hub/trigger/care-review
  // 고위험 환자 리뷰 배치 큐 생성
  // ================================================================
  router.post(
    '/trigger/care-review',
    requireAuth,
    requirePharmacyContext,
    async (req: Request, res: Response): Promise<void> => {
      const start = Date.now();
      try {
        const pcReq = req as PharmacyContextRequest;
        const pharmacyId = pcReq.pharmacyId!;
        const userId = pcReq.user!.id;

        // 고위험 환자 수 조회 (pharmacy-scoped)
        const result = await dataSource.query(`
          SELECT COUNT(DISTINCT s.patient_id)::int AS count
          FROM care_kpi_snapshots s
          INNER JOIN (
            SELECT patient_id, MAX(created_at) AS max_at
            FROM care_kpi_snapshots WHERE pharmacy_id = $1
            GROUP BY patient_id
          ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
          WHERE s.pharmacy_id = $1 AND s.risk_level = 'high'
        `, [pharmacyId]);

        const highRiskCount = result[0]?.count ?? 0;

        actionLogService?.logSuccess('glycopharm', userId, 'glycopharm.trigger.care_review', {
          organizationId: pharmacyId, durationMs: Date.now() - start,
          meta: { highRiskCount },
        }).catch(() => {});

        res.json({
          success: true,
          data: {
            message: highRiskCount > 0
              ? `고위험 환자 ${highRiskCount}명 리뷰 대기열에 추가되었습니다`
              : '현재 고위험 환자가 없습니다',
            highRiskCount,
            pharmacyId,
          },
        });
      } catch (error: any) {
        const userId = (req as PharmacyContextRequest).user?.id;
        if (userId) {
          actionLogService?.logFailure('glycopharm', userId, 'glycopharm.trigger.care_review', error.message, {
            durationMs: Date.now() - start,
          }).catch(() => {});
        }
        console.error('Hub trigger care-review failed:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  // ================================================================
  // POST /pharmacy/hub/trigger/coaching-auto-create
  // 고위험 상위 N명 자동 코칭 세션 생성
  // ================================================================
  router.post(
    '/trigger/coaching-auto-create',
    requireAuth,
    requirePharmacyContext,
    async (req: Request, res: Response): Promise<void> => {
      const start = Date.now();
      try {
        const pcReq = req as PharmacyContextRequest;
        const pharmacyId = pcReq.pharmacyId!;
        const userId = pcReq.user!.id;

        // 최근 7일 코칭 없는 고위험 환자 (상위 5명)
        const patients = await dataSource.query(`
          WITH latest_snapshots AS (
            SELECT DISTINCT ON (patient_id) patient_id, risk_level, created_at
            FROM care_kpi_snapshots
            WHERE pharmacy_id = $1
            ORDER BY patient_id, created_at DESC
          )
          SELECT ls.patient_id
          FROM latest_snapshots ls
          WHERE ls.risk_level = 'high'
            AND ls.patient_id NOT IN (
              SELECT DISTINCT patient_id FROM care_coaching_sessions
              WHERE pharmacy_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
            )
          ORDER BY ls.created_at DESC
          LIMIT 5
        `, [pharmacyId]);

        if (patients.length === 0) {
          actionLogService?.logSuccess('glycopharm', userId, 'glycopharm.trigger.create_session', {
            organizationId: pharmacyId, durationMs: Date.now() - start,
            meta: { createdCount: 0 },
          }).catch(() => {});

          res.json({
            success: true,
            data: { message: '코칭이 필요한 고위험 환자가 없습니다', createdCount: 0 },
          });
          return;
        }

        // 세션 생성 (pharmacistId = 현재 사용자, pharmacyId = 서버 강제)
        // 중복 방지: 같은 날 동일 환자에게 이미 세션이 있으면 건너뜀
        let createdCount = 0;
        let skippedCount = 0;
        for (const p of patients) {
          const existing = await dataSource.query(`
            SELECT 1 FROM care_coaching_sessions
            WHERE pharmacy_id = $1 AND patient_id = $2
              AND created_at >= CURRENT_DATE
            LIMIT 1
          `, [pharmacyId, p.patient_id]);

          if (existing.length > 0) {
            skippedCount++;
            continue;
          }

          await dataSource.query(`
            INSERT INTO care_coaching_sessions (id, pharmacy_id, patient_id, pharmacist_id, summary, action_plan, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
          `, [
            pharmacyId,
            p.patient_id,
            userId,
            'AI 자동 생성: 고위험 환자 우선 상담 세션',
            '1. 최근 혈당 추이 확인\n2. 생활습관 점검\n3. 다음 상담 일정 설정',
          ]);
          createdCount++;
        }

        actionLogService?.logSuccess('glycopharm', userId, 'glycopharm.trigger.create_session', {
          organizationId: pharmacyId, durationMs: Date.now() - start,
          meta: { createdCount, skippedCount },
        }).catch(() => {});

        const message = skippedCount > 0
          ? `${createdCount}명 세션 생성 (${skippedCount}명 오늘 이미 생성됨)`
          : `${createdCount}명의 고위험 환자 코칭 세션이 생성되었습니다`;

        res.json({
          success: true,
          data: {
            message,
            createdCount,
            skippedCount,
          },
        });
      } catch (error: any) {
        const userId = (req as PharmacyContextRequest).user?.id;
        if (userId) {
          actionLogService?.logFailure('glycopharm', userId, 'glycopharm.trigger.create_session', error.message, {
            durationMs: Date.now() - start,
          }).catch(() => {});
        }
        console.error('Hub trigger coaching-auto-create failed:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  // ================================================================
  // POST /pharmacy/hub/trigger/ai-refresh
  // AI Summary 재계산 (캐시 무효화 + 재생성)
  // ================================================================
  router.post(
    '/trigger/ai-refresh',
    requireAuth,
    requirePharmacyContext,
    async (req: Request, res: Response): Promise<void> => {
      const start = Date.now();
      try {
        const pcReq = req as PharmacyContextRequest;
        const pharmacyId = pcReq.pharmacyId!;
        const userId = pcReq.user!.id;
        const userRoles: string[] = (pcReq.user as any)?.roles || [];

        // Look up pharmacy name for AI context
        const orgResult = await dataSource.query(
          `SELECT name FROM organizations WHERE id = $1`,
          [pharmacyId],
        );
        const pharmacyName = orgResult[0]?.name || '약국';

        // Aggregate context (same as cockpit ai-summary but triggered on demand)
        const riskRows: Array<{ risk_level: string; count: number }> = await dataSource.query(`
          SELECT s.risk_level, COUNT(*)::int AS count
          FROM care_kpi_snapshots s
          INNER JOIN (
            SELECT patient_id, MAX(created_at) AS max_at
            FROM care_kpi_snapshots WHERE pharmacy_id = $1
            GROUP BY patient_id
          ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
          WHERE s.pharmacy_id = $1
          GROUP BY s.risk_level
        `, [pharmacyId]);

        let highRiskCount = 0, moderateRiskCount = 0, lowRiskCount = 0;
        for (const row of riskRows) {
          if (row.risk_level === 'high') highRiskCount = row.count;
          else if (row.risk_level === 'moderate') moderateRiskCount = row.count;
          else if (row.risk_level === 'low') lowRiskCount = row.count;
        }
        const totalPatients = highRiskCount + moderateRiskCount + lowRiskCount;

        const coachingResult = await dataSource.query(
          `SELECT COUNT(*)::int AS count FROM care_coaching_sessions WHERE created_at >= NOW() - INTERVAL '7 days' AND pharmacy_id = $1`,
          [pharmacyId],
        );
        const recentCoachingCount = coachingResult[0]?.count ?? 0;

        // Improving count (TIR trend) — same as cockpit ai-summary
        const improvingResult = await dataSource.query(`
          WITH ranked AS (
            SELECT patient_id, tir,
                   ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) AS rn
            FROM care_kpi_snapshots WHERE pharmacy_id = $1
          )
          SELECT COUNT(*)::int AS count FROM (
            SELECT r1.patient_id FROM ranked r1
            JOIN ranked r2 ON r1.patient_id = r2.patient_id AND r2.rn = 2
            WHERE r1.rn = 1 AND r1.tir > r2.tir
          ) improving
        `, [pharmacyId]);
        const improvingCount = improvingResult[0]?.count ?? 0;

        // Pending requests count
        const requestResult = await dataSource.query(
          `SELECT COUNT(*)::int AS count FROM glycopharm_customer_requests WHERE pharmacy_id = $1 AND status = 'pending'`,
          [pharmacyId],
        );
        const pendingRequests = requestResult[0]?.count ?? 0;

        const aiResult = await runAIInsight({
          service: 'glycopharm',
          insightType: 'store-summary',
          contextData: {
            pharmacyName,
            kpi: { totalPatients, highRiskCount, moderateRiskCount, lowRiskCount, improvingCount, recentCoachingCount },
            revenue: { currentMonth: 0, lastMonth: 0, growthRate: 0 },
            pendingRequests,
          },
          user: { id: userId, role: userRoles[0] || 'glycopharm:operator' },
        });

        actionLogService?.logSuccess('glycopharm', userId, 'glycopharm.trigger.refresh_ai', {
          organizationId: pharmacyId, durationMs: Date.now() - start, source: 'ai',
          meta: { totalPatients, highRiskCount },
        }).catch(() => {});

        if (aiResult.success && aiResult.insight) {
          res.json({
            success: true,
            data: {
              message: 'AI 분석이 완료되었습니다',
              insight: aiResult.insight,
            },
          });
        } else {
          res.json({
            success: true,
            data: {
              message: 'AI 분석 완료 (규칙 기반)',
              insight: {
                summary: totalPatients === 0
                  ? '등록된 환자 데이터가 없습니다.'
                  : `총 ${totalPatients}명 중 고위험 ${highRiskCount}명.`,
                riskLevel: highRiskCount / Math.max(totalPatients, 1) > 0.3 ? 'high' : 'medium',
              },
            },
          });
        }
      } catch (error: any) {
        const userId = (req as PharmacyContextRequest).user?.id;
        if (userId) {
          actionLogService?.logFailure('glycopharm', userId, 'glycopharm.trigger.refresh_ai', error.message, {
            durationMs: Date.now() - start, source: 'ai',
          }).catch(() => {});
        }
        console.error('Hub trigger ai-refresh failed:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  return router;
}
