/**
 * Partner Application API Routes
 * 파트너 신청 (v1 - 공개 엔드포인트)
 *
 * WO-PARTNER-APPLICATION-V1
 *
 * 특징:
 * - 인증 불필요 (공개 API)
 * - POST만 제공
 * - 상태 조회 없음
 *
 * Prefix: /api/v1/partner/applications
 */

import { Router, Request, Response } from 'express';
import { PartnerApplicationService, CreateApplicationDto } from './services/partner-application.service.js';

const router: Router = Router();

/**
 * POST /api/v1/partner/applications
 * 파트너 신청 접수
 *
 * 인증: 불필요
 * 응답: { status: 'submitted' }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateApplicationDto;

    // Validation
    if (!body.companyName?.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '업체명을 입력해주세요.' },
      });
    }
    if (!body.businessNumber?.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '사업자번호를 입력해주세요.' },
      });
    }
    if (!body.contactName?.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '담당자 이름을 입력해주세요.' },
      });
    }
    if (!body.email?.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '이메일을 입력해주세요.' },
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '올바른 이메일 형식을 입력해주세요.' },
      });
    }

    // Submit application
    const result = await PartnerApplicationService.submitApplication({
      companyName: body.companyName.trim(),
      businessNumber: body.businessNumber.trim(),
      contactName: body.contactName.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim(),
      serviceInterest: body.serviceInterest,
      message: body.message?.trim(),
    });

    // ❌ ID 노출 금지
    // ❌ 상세 정보 반환 금지
    res.status(201).json(result);
  } catch (error) {
    console.error('Partner application submission error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '신청 처리 중 오류가 발생했습니다.' },
    });
  }
});

// ❌ GET 없음 - 상태 조회 UI 없음
// ❌ PATCH/DELETE 없음 - 수정/삭제 없음

export default router;
