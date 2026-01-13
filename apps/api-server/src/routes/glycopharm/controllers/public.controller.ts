/**
 * Public Controller - 인증 불필요 공개 API
 *
 * Work Order: WO-GP-HOME-RESTRUCTURE-V1 (Phase 6)
 *
 * 엔드포인트:
 * - GET /api/v1/glycopharm/public/now-running - 진행 중인 Trial/Event/Campaign
 * - GET /api/v1/glycopharm/public/notices - 운영 공지
 *
 * 특징:
 * - 인증 불필요 (공개 페이지용)
 * - Home 화면 렌더링에 사용
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

// ============================================================================
// Types
// ============================================================================

interface NowRunningItem {
  id: string;
  type: 'trial' | 'event' | 'campaign';
  title: string;
  supplier?: string;
  deadline?: string;
  participants?: number;
  link: string;
}

interface Notice {
  id: string;
  title: string;
  date: string;
  isPinned: boolean;
  link: string;
}

// ============================================================================
// Static Data (추후 DB 연동 예정)
// ============================================================================

const staticNowRunning: NowRunningItem[] = [
  {
    id: '1',
    type: 'trial',
    title: '당뇨병 환자용 신규 영양제 Trial',
    supplier: '글루코헬스',
    deadline: '2026.01.31',
    participants: 23,
    link: '/pharmacy/market-trial',
  },
  {
    id: '2',
    type: 'event',
    title: '혈당관리 앱 연동 이벤트',
    supplier: 'GlucoseView',
    deadline: '2026.02.15',
    link: '/pharmacy/market-trial',
  },
  {
    id: '3',
    type: 'campaign',
    title: '당뇨인의 날 캠페인',
    deadline: '2026.03.14',
    link: '/forum-ext',
  },
];

const staticNotices: Notice[] = [
  {
    id: '1',
    title: '[공지] GlycoPharm 서비스 업데이트 안내 (v2.0)',
    date: '2026.01.06',
    isPinned: true,
    link: '/forum-ext',
  },
  {
    id: '2',
    title: '[안내] Market Trial 참여 가이드',
    date: '2026.01.05',
    isPinned: true,
    link: '/forum-ext',
  },
  {
    id: '3',
    title: '1월 Signage 콘텐츠 업데이트',
    date: '2026.01.03',
    isPinned: false,
    link: '/forum-ext',
  },
  {
    id: '4',
    title: '협력 공급사 추가 안내',
    date: '2026.01.02',
    isPinned: false,
    link: '/forum-ext',
  },
];

// ============================================================================
// Controller Factory
// ============================================================================

export function createPublicController(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /now-running
   * 현재 진행 중인 Trial/Event/Campaign 목록
   */
  router.get('/now-running', async (_req: Request, res: Response) => {
    try {
      // TODO: DB 연동 시 실제 데이터 조회
      // const items = await dataSource.manager.find(NowRunningEntity, {
      //   where: { isActive: true },
      //   order: { deadline: 'ASC' },
      //   take: 5,
      // });

      res.json({
        success: true,
        data: staticNowRunning,
        meta: {
          total: staticNowRunning.length,
          source: 'static', // 'database' when DB connected
        },
      });
    } catch (error: any) {
      console.error('Failed to get now-running items:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch now-running items',
        },
      });
    }
  });

  /**
   * GET /notices
   * 운영 공지 목록
   */
  router.get('/notices', async (_req: Request, res: Response) => {
    try {
      // TODO: DB 연동 시 실제 데이터 조회
      // const notices = await dataSource.manager.find(NoticeEntity, {
      //   where: { isPublic: true },
      //   order: { isPinned: 'DESC', date: 'DESC' },
      //   take: 10,
      // });

      // 고정 공지를 먼저, 그 다음 날짜순
      const sortedNotices = [...staticNotices].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      res.json({
        success: true,
        data: sortedNotices,
        meta: {
          total: sortedNotices.length,
          pinnedCount: sortedNotices.filter((n) => n.isPinned).length,
          source: 'static', // 'database' when DB connected
        },
      });
    } catch (error: any) {
      console.error('Failed to get notices:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch notices',
        },
      });
    }
  });

  /**
   * GET /health
   * Public API 헬스체크
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      service: 'glycopharm-public',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
