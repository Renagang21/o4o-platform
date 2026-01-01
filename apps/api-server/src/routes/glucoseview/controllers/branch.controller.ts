/**
 * GlucoseView Branch Controller
 *
 * Phase C-3: Pharmacist Membership - 지부/분회 API
 * 공개 API (인증 불필요)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { BranchService } from '../services/branch.service.js';

export function createBranchController(dataSource: DataSource): Router {
  const router = Router();
  const branchService = new BranchService(dataSource);

  /**
   * GET /branches
   * 지부 목록 조회 (공개)
   */
  const listBranches: RequestHandler = async (req: Request, res: Response) => {
    try {
      const includeChapters = req.query.include_chapters === 'true';
      const activeOnly = req.query.active_only !== 'false';

      const branches = await branchService.listBranches({
        include_chapters: includeChapters,
        active_only: activeOnly,
      });

      res.json({ data: branches });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '지부 목록 조회 중 오류가 발생했습니다.',
        },
      });
    }
  };

  /**
   * GET /branches/:id
   * 지부 상세 조회 (공개)
   */
  const getBranch: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const branch = await branchService.getBranchById(id);

      if (!branch) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '지부를 찾을 수 없습니다.',
          },
        });
        return;
      }

      res.json({ data: branch });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '지부 조회 중 오류가 발생했습니다.',
        },
      });
    }
  };

  /**
   * GET /chapters
   * 분회 목록 조회 (공개)
   */
  const listChapters: RequestHandler = async (req: Request, res: Response) => {
    try {
      const branchId = req.query.branch_id as string | undefined;
      const search = req.query.search as string | undefined;
      const activeOnly = req.query.active_only !== 'false';

      const chapters = await branchService.listChapters({
        branch_id: branchId,
        search,
        active_only: activeOnly,
      });

      res.json({ data: chapters });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '분회 목록 조회 중 오류가 발생했습니다.',
        },
      });
    }
  };

  /**
   * GET /chapters/:id
   * 분회 상세 조회 (공개)
   */
  const getChapter: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const chapter = await branchService.getChapterById(id);

      if (!chapter) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '분회를 찾을 수 없습니다.',
          },
        });
        return;
      }

      res.json({ data: chapter });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '분회 조회 중 오류가 발생했습니다.',
        },
      });
    }
  };

  // 라우트 등록
  router.get('/branches', listBranches);
  router.get('/branches/:id', getBranch);
  router.get('/chapters', listChapters);
  router.get('/chapters/:id', getChapter);

  return router;
}
