/**
 * PlatformInquiryController - 플랫폼 문의 API
 *
 * 공개 API:
 * - POST /api/v1/platform/inquiries - 문의 제출 (인증 불필요)
 *
 * 관리자 API:
 * - GET /api/v1/admin/platform/inquiries - 문의 목록 조회
 * - GET /api/v1/admin/platform/inquiries/:id - 문의 상세 조회
 * - PATCH /api/v1/admin/platform/inquiries/:id - 문의 상태 업데이트
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { PlatformInquiry, InquiryType, InquiryStatus } from '../entities/PlatformInquiry.js';
import { emailService } from '../services/email.service.js';
import logger from '../utils/logger.js';

const inquiryRepo = () => AppDataSource.getRepository(PlatformInquiry);

// 문의 유형별 제목 접두어
const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  siteguide: '[SiteGuide 도입 문의]',
  platform: '[o4o 플랫폼 문의]',
  partnership: '[제휴 문의]',
  other: '[기타 문의]',
};

/**
 * 문의 제출 (공개)
 */
export async function submitInquiry(req: Request, res: Response) {
  try {
    const {
      type = 'platform',
      name,
      email,
      phone,
      company,
      subject,
      message,
      source,
    } = req.body;

    // 기본 유효성 검사
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: '필수 항목을 입력해 주세요.',
        code: 'MISSING_REQUIRED_FIELDS',
      });
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '올바른 이메일 주소를 입력해 주세요.',
        code: 'INVALID_EMAIL',
      });
    }

    // 문의 저장
    const inquiry = inquiryRepo().create({
      type: type as InquiryType,
      name,
      email,
      phone,
      company,
      subject,
      message,
      source,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer,
      status: 'new',
    });

    await inquiryRepo().save(inquiry);

    logger.info(`Platform inquiry submitted: ${inquiry.id} (${type})`);

    // 관리자에게 알림 이메일 발송 시도 (실패해도 문의 접수는 성공)
    try {
      await sendAdminNotification(inquiry);
      inquiry.notificationSent = true;
      await inquiryRepo().save(inquiry);
    } catch (emailError) {
      logger.warn('Failed to send admin notification email:', emailError);
    }

    return res.status(201).json({
      success: true,
      data: {
        id: inquiry.id,
        message: '문의가 접수되었습니다. 빠른 시일 내에 답변 드리겠습니다.',
      },
    });
  } catch (error) {
    logger.error('Failed to submit inquiry:', error);
    return res.status(500).json({
      success: false,
      error: '문의 접수 중 오류가 발생했습니다.',
      code: 'INTERNAL_ERROR',
    });
  }
}

/**
 * 문의 목록 조회 (관리자)
 */
export async function listInquiries(req: Request, res: Response) {
  try {
    const {
      type,
      status,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'DESC',
    } = req.query;

    const qb = inquiryRepo().createQueryBuilder('inquiry');

    if (type) {
      qb.andWhere('inquiry.type = :type', { type });
    }

    if (status) {
      qb.andWhere('inquiry.status = :status', { status });
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    qb.orderBy(`inquiry.${sort}`, order as 'ASC' | 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum);

    const [items, total] = await qb.getManyAndCount();

    return res.json({
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
    logger.error('Failed to list inquiries:', error);
    return res.status(500).json({
      success: false,
      error: '문의 목록 조회 중 오류가 발생했습니다.',
    });
  }
}

/**
 * 문의 상세 조회 (관리자)
 */
export async function getInquiry(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const inquiry = await inquiryRepo().findOne({ where: { id } });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: '문의를 찾을 수 없습니다.',
      });
    }

    return res.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    logger.error('Failed to get inquiry:', error);
    return res.status(500).json({
      success: false,
      error: '문의 조회 중 오류가 발생했습니다.',
    });
  }
}

/**
 * 문의 상태 업데이트 (관리자)
 */
export async function updateInquiry(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const inquiry = await inquiryRepo().findOne({ where: { id } });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: '문의를 찾을 수 없습니다.',
      });
    }

    if (status) {
      inquiry.status = status as InquiryStatus;
      if (status === 'resolved' || status === 'closed') {
        inquiry.resolvedAt = new Date();
      }
    }

    if (adminNotes !== undefined) {
      inquiry.adminNotes = adminNotes;
    }

    await inquiryRepo().save(inquiry);

    return res.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    logger.error('Failed to update inquiry:', error);
    return res.status(500).json({
      success: false,
      error: '문의 업데이트 중 오류가 발생했습니다.',
    });
  }
}

/**
 * 관리자 알림 이메일 발송
 */
async function sendAdminNotification(inquiry: PlatformInquiry) {
  const typeLabel = INQUIRY_TYPE_LABELS[inquiry.type] || '[문의]';

  await emailService.sendEmail({
    to: process.env.PLATFORM_ADMIN_EMAIL || 'admin@neture.co.kr',
    subject: `${typeLabel} ${inquiry.subject}`,
    html: `
      <h2>새 문의가 접수되었습니다</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; width: 120px;"><strong>유형</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${inquiry.type}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>이름</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${inquiry.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>이메일</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${inquiry.email}</td>
        </tr>
        ${inquiry.phone ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>연락처</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${inquiry.phone}</td>
        </tr>
        ` : ''}
        ${inquiry.company ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>회사</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${inquiry.company}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>제목</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${inquiry.subject}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>내용</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; white-space: pre-wrap;">${inquiry.message}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>출처</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${inquiry.source || '-'}</td>
        </tr>
      </table>
      <p style="margin-top: 20px; color: #666;">
        <a href="${process.env.ADMIN_URL || 'https://admin.neture.co.kr'}/platform/inquiries/${inquiry.id}">
          관리자 페이지에서 확인하기
        </a>
      </p>
    `,
    text: `
새 문의가 접수되었습니다

유형: ${inquiry.type}
이름: ${inquiry.name}
이메일: ${inquiry.email}
연락처: ${inquiry.phone || '-'}
회사: ${inquiry.company || '-'}
제목: ${inquiry.subject}

내용:
${inquiry.message}

출처: ${inquiry.source || '-'}
    `,
  });
}
