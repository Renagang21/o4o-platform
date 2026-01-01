/**
 * GlucoseView Pharmacist Controller
 *
 * Phase C-3: Pharmacist Membership - 약사 회원 API
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { PharmacistService } from '../services/pharmacist.service.js';
import type {
  RegisterPharmacistRequestDto,
  UpdatePharmacistRequestDto,
  ApprovePharmacistRequestDto,
} from '../dto/index.js';

export function createPharmacistController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  requireAdmin: RequestHandler
): Router {
  const router = Router();
  const pharmacistService = new PharmacistService(dataSource);

  /**
   * POST /pharmacists/register
   * 약사 회원가입 (공개)
   */
  const register: RequestHandler = async (req: Request, res: Response) => {
    try {
      const data: RegisterPharmacistRequestDto = req.body;

      // 필수 필드 검증
      if (!data.license_number || !data.real_name || !data.display_name ||
          !data.phone || !data.email || !data.password ||
          !data.chapter_id || !data.pharmacy_name) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '모든 필수 항목을 입력해주세요.',
          },
        });
        return;
      }

      // 비밀번호 길이 검증
      if (data.password.length < 8) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '비밀번호는 8자 이상이어야 합니다.',
          },
        });
        return;
      }

      const pharmacist = await pharmacistService.register(data);

      res.status(201).json({
        data: pharmacist,
        message: '회원가입이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
      });
    } catch (error: any) {
      if (error.message.includes('이미')) {
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message,
          },
        });
        return;
      }
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '회원가입 중 오류가 발생했습니다.',
        },
      });
    }
  };

  /**
   * GET /pharmacists/me
   * 내 약사 프로필 조회 (인증 필요)
   */
  const getMyProfile: RequestHandler = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '인증이 필요합니다.',
          },
        });
        return;
      }

      const pharmacist = await pharmacistService.getByUserId(userId);

      if (!pharmacist) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '약사 프로필을 찾을 수 없습니다.',
          },
        });
        return;
      }

      res.json({ data: pharmacist });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '프로필 조회 중 오류가 발생했습니다.',
        },
      });
    }
  };

  /**
   * PUT /pharmacists/me
   * 내 약사 프로필 수정 (인증 필요)
   */
  const updateMyProfile: RequestHandler = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '인증이 필요합니다.',
          },
        });
        return;
      }

      const data: UpdatePharmacistRequestDto = req.body;
      const pharmacist = await pharmacistService.updatePharmacist(userId, data);

      res.json({ data: pharmacist });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '프로필 수정 중 오류가 발생했습니다.',
        },
      });
    }
  };

  /**
   * GET /pharmacists
   * 약사 목록 조회 (관리자용)
   */
  const listPharmacists: RequestHandler = async (req: Request, res: Response) => {
    try {
      const query = {
        search: req.query.search as string | undefined,
        branch_id: req.query.branch_id as string | undefined,
        chapter_id: req.query.chapter_id as string | undefined,
        approval_status: req.query.approval_status as 'pending' | 'approved' | 'rejected' | undefined,
        role: req.query.role as 'pharmacist' | 'admin' | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const result = await pharmacistService.listPharmacists(query);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '약사 목록 조회 중 오류가 발생했습니다.',
        },
      });
    }
  };

  /**
   * POST /pharmacists/:id/approve
   * 약사 승인/거절 (관리자용)
   */
  const approvePharmacist: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminUserId = (req as any).user?.id;
      const data: ApprovePharmacistRequestDto = req.body;

      if (!data.action || !['approve', 'reject'].includes(data.action)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'action은 approve 또는 reject이어야 합니다.',
          },
        });
        return;
      }

      if (data.action === 'reject' && !data.rejection_reason) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '거절 사유를 입력해주세요.',
          },
        });
        return;
      }

      const pharmacist = await pharmacistService.approveOrReject(id, data, adminUserId);

      res.json({
        data: pharmacist,
        message: data.action === 'approve' ? '승인되었습니다.' : '거절되었습니다.',
      });
    } catch (error: any) {
      if (error.message.includes('찾을 수 없')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      if (error.message.includes('이미 처리')) {
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message,
          },
        });
        return;
      }
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '승인/거절 처리 중 오류가 발생했습니다.',
        },
      });
    }
  };

  // 라우트 등록
  // 공개 API
  router.post('/register', register);

  // 인증 필요 API
  router.get('/me', requireAuth, getMyProfile);
  router.put('/me', requireAuth, updateMyProfile);

  // 관리자 API
  router.get('/', requireAuth, requireAdmin, listPharmacists);
  router.post('/:id/approve', requireAuth, requireAdmin, approvePharmacist);

  return router;
}
