/**
 * Join Inquiry Controller
 *
 * WO-KPA-JOIN-CONVERSION-V1
 *
 * 지부/분회/약국 참여 문의 API
 *
 * Public API:
 * - POST /api/v1/join/inquiry - 문의 제출 (인증 불필요)
 *
 * Admin API:
 * - GET /api/v1/kpa/join-inquiries - 문의 목록 (관리자)
 * - GET /api/v1/kpa/join-inquiries/:id - 문의 상세 (관리자)
 * - PATCH /api/v1/kpa/join-inquiries/:id - 문의 업데이트 (관리자)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { KpaJoinInquiry, JoinInquiryType, JoinInquiryStatus } from '../entities/kpa-join-inquiry.entity.js';
import logger from '../../../utils/logger.js';

const TYPE_LABELS: Record<JoinInquiryType, string> = {
  branch: '지부 도입',
  division: '분회 참여',
  pharmacy: '약국 참여',
};

/**
 * 공개 라우터 생성 (POST /api/v1/join/inquiry)
 */
export function createJoinInquiryPublicRoutes(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(KpaJoinInquiry);

  /**
   * POST /inquiry - 문의 제출 (인증 불필요)
   */
  router.post('/inquiry', async (req: Request, res: Response) => {
    try {
      const { type, contact, message } = req.body;

      // 유효성 검사: type
      if (!type || !['branch', 'division', 'pharmacy'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 문의 유형입니다.',
          code: 'INVALID_TYPE',
        });
      }

      // 유효성 검사: contact (필수)
      if (!contact || typeof contact !== 'string' || !contact.trim()) {
        return res.status(400).json({
          success: false,
          error: '연락처를 입력해주세요.',
          code: 'MISSING_CONTACT',
        });
      }

      const trimmedContact = contact.trim();

      // 연락처 형식 검사 (이메일 또는 전화번호)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[\d\-+() ]{8,20}$/;

      if (!emailRegex.test(trimmedContact) && !phoneRegex.test(trimmedContact)) {
        return res.status(400).json({
          success: false,
          error: '올바른 이메일 또는 전화번호를 입력해주세요.',
          code: 'INVALID_CONTACT_FORMAT',
        });
      }

      // 문의 저장
      const inquiry = repo.create({
        type: type as JoinInquiryType,
        contact: trimmedContact,
        message: message?.trim() || null,
        status: 'new',
        ip_address: req.ip || req.socket.remoteAddress || null,
        user_agent: req.headers['user-agent'] || null,
        referrer: req.headers.referer || null,
      });

      await repo.save(inquiry);

      logger.info(`KPA Join inquiry submitted: ${inquiry.id} (${type}) - ${trimmedContact}`);

      return res.status(201).json({
        success: true,
        data: {
          id: inquiry.id,
          message: '문의가 접수되었습니다. 확인 후 안내드리겠습니다.',
        },
      });
    } catch (error) {
      logger.error('Failed to submit join inquiry:', error);
      return res.status(500).json({
        success: false,
        error: '문의 접수 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
}

/**
 * 관리자 라우터 생성 (/api/v1/kpa/join-inquiries)
 */
export function createJoinInquiryAdminRoutes(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  requireScope: (scope: string) => RequestHandler
): Router {
  const router = Router();
  const repo = dataSource.getRepository(KpaJoinInquiry);

  // 인증 및 권한 필수
  router.use(requireAuth);
  router.use(requireScope('kpa:admin'));

  /**
   * GET / - 문의 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        type,
        status,
        page = 1,
        limit = 20,
        sort = 'created_at',
        order = 'DESC',
      } = req.query;

      const qb = repo.createQueryBuilder('inquiry');

      if (type && ['branch', 'division', 'pharmacy'].includes(type as string)) {
        qb.andWhere('inquiry.type = :type', { type });
      }

      if (status && ['new', 'contacted', 'converted', 'closed'].includes(status as string)) {
        qb.andWhere('inquiry.status = :status', { status });
      }

      const pageNum = Number(page);
      const limitNum = Math.min(Number(limit), 100);

      const allowedSortFields = ['created_at', 'updated_at', 'type', 'status'];
      const sortField = allowedSortFields.includes(sort as string) ? sort as string : 'created_at';

      qb.orderBy(`inquiry.${sortField}`, (order as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const [items, total] = await qb.getManyAndCount();

      return res.json({
        success: true,
        data: {
          items: items.map((item) => ({
            ...item,
            typeLabel: TYPE_LABELS[item.type],
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error('Failed to list join inquiries:', error);
      return res.status(500).json({
        success: false,
        error: '문의 목록 조회 중 오류가 발생했습니다.',
      });
    }
  });

  /**
   * GET /:id - 문의 상세 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const inquiry = await repo.findOne({ where: { id } });

      if (!inquiry) {
        return res.status(404).json({
          success: false,
          error: '문의를 찾을 수 없습니다.',
        });
      }

      return res.json({
        success: true,
        data: {
          ...inquiry,
          typeLabel: TYPE_LABELS[inquiry.type],
        },
      });
    } catch (error) {
      logger.error('Failed to get join inquiry:', error);
      return res.status(500).json({
        success: false,
        error: '문의 조회 중 오류가 발생했습니다.',
      });
    }
  });

  /**
   * PATCH /:id - 문의 상태 업데이트
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, admin_note } = req.body;

      const inquiry = await repo.findOne({ where: { id } });

      if (!inquiry) {
        return res.status(404).json({
          success: false,
          error: '문의를 찾을 수 없습니다.',
        });
      }

      if (status && ['new', 'contacted', 'converted', 'closed'].includes(status)) {
        inquiry.status = status as JoinInquiryStatus;
        if (status === 'contacted' && !inquiry.contacted_at) {
          inquiry.contacted_at = new Date();
        }
      }

      if (admin_note !== undefined) {
        inquiry.admin_note = admin_note || null;
      }

      await repo.save(inquiry);

      logger.info(`KPA Join inquiry updated: ${inquiry.id} -> ${inquiry.status}`);

      return res.json({
        success: true,
        data: {
          ...inquiry,
          typeLabel: TYPE_LABELS[inquiry.type],
        },
      });
    } catch (error) {
      logger.error('Failed to update join inquiry:', error);
      return res.status(500).json({
        success: false,
        error: '문의 업데이트 중 오류가 발생했습니다.',
      });
    }
  });

  return router;
}
