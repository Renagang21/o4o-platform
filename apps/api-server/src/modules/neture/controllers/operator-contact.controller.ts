/**
 * Neture Operator Contact Messages Controller
 *
 * WO-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-OPERATOR-SCOPE-V1
 *
 * 선행 IR: IR-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-SCOPE-AUDIT-V1 (16d4a5def)
 *   → B 안 (혼합형) 채택: operator 가 supplier/partner 문의를 조회·일괄 확인 처리.
 *     상세 처리·개별 status 변경·adminNotes 작성은 admin 유지.
 *
 * Routes (mount: /operator):
 *   GET /operator/contact-messages
 *     · list + pagination + filter (contactType / status)
 *     · WO-O4O-NETURE-CONTACT-INQUIRY-OPERATOR-NOTIFICATION-V1:
 *       default contactType = 전체 (supplier/partner/service/other).
 *       Contact us 는 공개 문의 창구이므로 operator 가 모든 유형의 신규 문의를 놓치지 않도록 한다.
 *       (이전: default = supplier+partner. supplier/partner 우선은 selectable 필터로만 유지)
 *     · operator 화면 노출 안전 필드만 SELECT — adminNotes / ipAddress / userAgent 0
 *     · message 본문은 preview (앞 160자) 만 반환 — 상세 처리는 admin
 *
 * 의도적 미노출 (사용자 directive):
 *   - adminNotes : admin 전용
 *   - ipAddress / userAgent : PII 노출 범위 외
 *   - 개별 detail / status PATCH : admin 유지
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 *   scopeRoleMapping 에 의해 neture:operator + neture:admin 모두 통과.
 *   기존 admin /admin/contact-messages 화면·엔드포인트는 그대로 유지.
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { NetureContactMessage } from '../entities/NetureContactMessage.entity.js';
import logger from '../../../utils/logger.js';

/**
 * operator 화면 default 조회 집합 — 전체 contactType.
 * WO-O4O-NETURE-CONTACT-INQUIRY-OPERATOR-NOTIFICATION-V1: Contact us 공개 문의는 유형 무관하게
 * operator 가 기본 목록에서 모두 보여야 한다. (이전 supplier+partner 제한 폐기)
 */
const ALL_CONTACT_TYPES = ['supplier', 'partner', 'service', 'other'] as const;
const VALID_STATUSES = ['new', 'in_progress', 'resolved'] as const;

/** operator 응답 본문 — admin 응답과 의도적으로 분리한 안전 필드 집합. */
interface OperatorContactMessageRow {
  id: string;
  contactType: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  /** 본문 preview (앞 160자). 상세는 admin 화면 진입. */
  messagePreview: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function createOperatorContactController(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(NetureContactMessage);

  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/contact-messages
   *
   * Query:
   *   contactType : supplier | partner | service | other (단일) — default 미지정 시 전체 유형
   *   status      : new | in_progress | resolved (단일) — default 미지정 시 전체
   *   page        : default 1
   *   limit       : default 20, max 100
   *
   * Response:
   *   { items: OperatorContactMessageRow[], pagination: { page, limit, total, totalPages } }
   */
  router.get('/contact-messages', async (req: Request, res: Response) => {
    try {
      const { contactType, status, page = '1', limit = '20' } = req.query;

      const qb = repo
        .createQueryBuilder('msg')
        .select([
          'msg.id',
          'msg.contactType',
          'msg.name',
          'msg.email',
          'msg.phone',
          'msg.subject',
          'msg.message',
          'msg.status',
          'msg.createdAt',
          'msg.updatedAt',
        ]);
      // adminNotes / ipAddress / userAgent 의도적으로 SELECT 제외.

      // contactType 필터
      if (contactType && typeof contactType === 'string') {
        if (!(ALL_CONTACT_TYPES as readonly string[]).includes(contactType)) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_CONTACT_TYPE', message: '유효하지 않은 문의 유형입니다.' },
          });
        }
        qb.andWhere('msg.contactType = :contactType', { contactType });
      }
      // default (contactType 미지정) = 전체 유형. 별도 WHERE 추가 없음 — operator 가 모든 신규 문의를 본다.

      // status 필터
      if (status && typeof status === 'string') {
        if (!(VALID_STATUSES as readonly string[]).includes(status)) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_STATUS', message: '유효하지 않은 상태입니다.' },
          });
        }
        qb.andWhere('msg.status = :status', { status });
      }

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(Math.max(1, Number(limit)), 100);

      qb.orderBy('msg.createdAt', 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const [rawItems, total] = await qb.getManyAndCount();

      const items: OperatorContactMessageRow[] = rawItems.map((m) => ({
        id: m.id,
        contactType: m.contactType,
        name: m.name,
        email: m.email,
        phone: m.phone,
        subject: m.subject,
        // 본문 preview — 앞 160자 + 절단 표시. operator 화면은 빠른 확인용.
        messagePreview: m.message.length > 160 ? `${m.message.slice(0, 160)}…` : m.message,
        status: m.status,
        createdAt: (m.createdAt as Date).toISOString(),
        updatedAt: (m.updatedAt as Date).toISOString(),
      }));

      res.json({
        success: true,
        data: {
          items,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error('[Neture Operator Contact] Error listing:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '문의 목록 조회 실패' },
      });
    }
  });

  return router;
}
