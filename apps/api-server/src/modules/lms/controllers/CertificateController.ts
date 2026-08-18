import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CertificateService } from '../services/CertificateService.js';
import { generateCertificatePdf } from '../utils/certificatePdf.js';
import logger from '../../../utils/logger.js';
// WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1 §7
// 수료증 발급/UX 정책은 서비스별로 유지하고, service boundary 만 공통 보장한다.
import { guardLoadedCourseScope, resolveScopeOrRespond } from '../utils/lms-scope-guard.js';
// WO-O4O-LMS-CERTIFICATE-OWNERSHIP-AND-READ-AUTHORIZATION-BOUNDARY-FIX-V1
// private read 는 scope → ownership 순으로 공통 helper 가 판정한다.
import {
  resolveOwnedCertificateByIdOrRespond,
  resolveOwnedCertificateByNumberOrRespond,
} from '../utils/lms-certificate-owner-guard.js';

/**
 * CertificateController
 * LMS Module - Certificate Management
 * Handles certificate issuance and verification
 */

/**
 * WO-O4O-LMS-CERTIFICATE-DOMAIN-V1
 * Map course.serviceKey → frontend base URL for certificate verification links.
 * null/unknown serviceKey = legacy course → KPA fallback for backward compat.
 */
function resolveVerificationBase(serviceKey: string | null | undefined): string {
  switch (serviceKey) {
    case 'k-cosmetics':
      return process.env.KCOSMETICS_FRONTEND_URL || process.env.FRONTEND_URL || 'https://k-cosmetics.co.kr';
    case 'glycopharm':
      return process.env.GLYCOPHARM_FRONTEND_URL || process.env.FRONTEND_URL || 'https://glycopharm.co.kr';
    case 'kpa-society':
    default:
      return process.env.KPA_FRONTEND_URL || process.env.FRONTEND_URL || 'https://kpa-society.co.kr';
  }
}

export class CertificateController extends BaseController {
  /**
   * WO-O4O-LMS-CERTIFICATE-OWNERSHIP-AND-READ-AUTHORIZATION-BOUNDARY-FIX-V1 §9
   * 진위확인 응답 최소 필드. user id/email 등 개인정보를 포함하지 않는다.
   */
  private static toPublicVerificationView(certificate: any): Record<string, any> {
    return {
      certificateId: certificate.id,
      certificateCode: certificate.certificateNumber,
      userName: certificate.user?.name || '수강자',
      courseTitle: certificate.course?.title || '과정',
      completedAt: certificate.completedAt
        ? new Date(certificate.completedAt).toISOString().split('T')[0]
        : null,
      issuedAt: certificate.issuedAt
        ? new Date(certificate.issuedAt).toISOString().split('T')[0]
        : null,
      issuer: certificate.issuerName || 'O4O LMS',
    };
  }

  static async issueCertificate(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const issuedBy = (req as any).user?.id;
      const service = CertificateService.getInstance();

      const certificate = await service.issueCertificate(data, issuedBy);

      return BaseController.created(res, { certificate });
    } catch (error: any) {
      logger.error('[CertificateController.issueCertificate] Error', { error: error.message });

      if (error.message && error.message.includes('already issued')) {
        return BaseController.error(res, error.message, 409);
      }

      if (error.message && (error.message.includes('not found') || error.message.includes('must be'))) {
        return BaseController.error(res, error.message, 400);
      }

      return BaseController.error(res, error);
    }
  }

  static async getCertificate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      // scope → ownership 순으로 판정한다 (타인 certificate 는 404).
      const certificate = await resolveOwnedCertificateByIdOrRespond(req, res, id);
      if (!certificate) return;

      return BaseController.ok(res, { certificate });
    } catch (error: any) {
      logger.error('[CertificateController.getCertificate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getCertificateByNumber(req: Request, res: Response): Promise<any> {
    try {
      const { certificateNumber } = req.params;

      // certificateNumber 는 발급물에 인쇄되는 식별자일 뿐 인가 근거가 아니다 → 소유권 확인.
      const certificate = await resolveOwnedCertificateByNumberOrRespond(req, res, certificateNumber);
      if (!certificate) return;

      return BaseController.ok(res, { certificate });
    } catch (error: any) {
      logger.error('[CertificateController.getCertificateByNumber] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listCertificates(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const scope = resolveScopeOrRespond(req, res);
      if (!scope.ok) return;

      // client raw serviceKey 를 신뢰하지 않고 canonical 해석값으로 덮어쓴다.
      // WO-O4O-LMS-CERTIFICATE-OWNERSHIP-AND-READ-AUTHORIZATION-BOUNDARY-FIX-V1:
      // user-facing 목록은 항상 요청자 본인 범위다. 관리 조회는 기존 requireKpaAdmin
      // 계약(issue/update/revoke/renew)을 쓰고, 여기에 elevated bypass 를 만들지 않는다.
      // client 가 보낸 userId 는 신뢰하지 않고 덮어쓴다.
      const filters: any = { ...req.query, userId, serviceKey: scope.scope };
      const service = CertificateService.getInstance();

      const { certificates, total } = await service.listCertificates(filters);

      return BaseController.okPaginated(res, certificates, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[CertificateController.listCertificates] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getMyCertificates(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const scope = resolveScopeOrRespond(req, res);
      if (!scope.ok) return;

      const filters: any = { ...req.query, userId, serviceKey: scope.scope };
      const service = CertificateService.getInstance();

      const { certificates, total } = await service.listCertificates(filters);

      return BaseController.okPaginated(res, certificates, {
        total,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        totalPages: Math.ceil(total / (Number(req.query.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[CertificateController.getMyCertificates] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async verifyCertificate(req: Request, res: Response): Promise<any> {
    try {
      const { verificationCode } = req.params;
      const service = CertificateService.getInstance();

      const certificate = await service.verifyCertificate(verificationCode);

      if (!certificate) {
        return BaseController.notFound(res, 'Certificate not found or invalid');
      }

      if (!guardLoadedCourseScope(req, res, certificate.course?.serviceKey, 'Certificate not found or invalid')) return;

      // WO-O4O-LMS-CERTIFICATE-OWNERSHIP-AND-READ-AUTHORIZATION-BOUNDARY-FIX-V1 §3/§9:
      // verificationCode 소지만으로 접근하는 진위확인 경로다. private read 와 같은
      // 전체 entity 계약을 쓰지 않고, `/certificates/:id/verify` 와 동일한 최소 필드만 반환한다.
      return BaseController.ok(res, {
        certificate: CertificateController.toPublicVerificationView(certificate),
        verified: true,
      });
    } catch (error: any) {
      logger.error('[CertificateController.verifyCertificate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateCertificate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = CertificateService.getInstance();

      const certificate = await service.updateCertificate(id, data);

      return BaseController.ok(res, { certificate });
    } catch (error: any) {
      logger.error('[CertificateController.updateCertificate] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async revokeCertificate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CertificateService.getInstance();

      const certificate = await service.revokeCertificate(id);

      return BaseController.ok(res, { certificate, message: 'Certificate revoked successfully' });
    } catch (error: any) {
      logger.error('[CertificateController.revokeCertificate] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async renewCertificate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { months } = req.body;
      const service = CertificateService.getInstance();

      const certificate = await service.renewCertificate(id, months);

      return BaseController.ok(res, { certificate, message: 'Certificate renewed successfully' });
    } catch (error: any) {
      logger.error('[CertificateController.renewCertificate] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  // WO-O4O-LMS-CERTIFICATE-VERIFICATION-V1
  static async verifyPublic(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CertificateService.getInstance();
      const certificate = await service.getCertificate(id);

      if (!certificate || !certificate.isValid || certificate.isExpired()) {
        return res.status(200).json({ valid: false });
      }

      // 공개 계약 유지 — 최소 필드만 반환한다 (개인정보 과노출 금지).
      return res.status(200).json({
        valid: true,
        certificate: CertificateController.toPublicVerificationView(certificate),
      });
    } catch (error: any) {
      logger.error('[CertificateController.verifyPublic] Error', { error: error.message });
      return res.status(200).json({ valid: false });
    }
  }

  // WO-O4O-LMS-CERTIFICATE-PDF-V1
  static async downloadPdf(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      // service boundary 를 소유자 확인보다 먼저 판정한다 (§4 판정 순서).
      // WO-O4O-LMS-CERTIFICATE-OWNERSHIP-AND-READ-AUTHORIZATION-BOUNDARY-FIX-V1:
      // 단건 read 와 동일 helper 를 쓰고, 타인 수료증은 403 이 아니라 404 로 존재를 숨긴다.
      const certificate = await resolveOwnedCertificateByIdOrRespond(req, res, id);
      if (!certificate) return;

      const userName = (certificate.user as any)?.name || '수강자';
      const courseTitle = certificate.course?.title || '과정';

      // WO-O4O-LMS-CERTIFICATE-DOMAIN-V1: serviceKey 기준 도메인 결정 (legacy null → KPA fallback)
      const frontendBase = resolveVerificationBase(certificate.course?.serviceKey);
      const verificationUrl = `${frontendBase}/certificate/verify/${certificate.id}`;

      const pdfBuffer = await generateCertificatePdf({
        userName,
        courseTitle,
        completedAt: certificate.completedAt,
        issuedAt: certificate.issuedAt,
        certificateNumber: certificate.certificateNumber,
        credits: certificate.credits,
        issuerName: certificate.issuerName,
        issuerTitle: certificate.issuerTitle,
        verificationUrl,
      });

      const safeNumber = certificate.certificateNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${safeNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    } catch (error: any) {
      logger.error('[CertificateController.downloadPdf] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
