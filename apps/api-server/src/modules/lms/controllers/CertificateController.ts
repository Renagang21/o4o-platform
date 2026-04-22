import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CertificateService } from '../services/CertificateService.js';
import { generateCertificatePdf } from '../utils/certificatePdf.js';
import logger from '../../../utils/logger.js';

/**
 * CertificateController
 * LMS Module - Certificate Management
 * Handles certificate issuance and verification
 */
export class CertificateController extends BaseController {
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
      const service = CertificateService.getInstance();

      const certificate = await service.getCertificate(id);

      if (!certificate) {
        return BaseController.notFound(res, 'Certificate not found');
      }

      return BaseController.ok(res, { certificate });
    } catch (error: any) {
      logger.error('[CertificateController.getCertificate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getCertificateByNumber(req: Request, res: Response): Promise<any> {
    try {
      const { certificateNumber } = req.params;
      const service = CertificateService.getInstance();

      const certificate = await service.getCertificateByNumber(certificateNumber);

      if (!certificate) {
        return BaseController.notFound(res, 'Certificate not found');
      }

      return BaseController.ok(res, { certificate });
    } catch (error: any) {
      logger.error('[CertificateController.getCertificateByNumber] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listCertificates(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = CertificateService.getInstance();

      const { certificates, total } = await service.listCertificates(filters as any);

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

      const filters: any = { ...req.query, userId };
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

      return BaseController.ok(res, { certificate, verified: true });
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

      const userName = (certificate.user as any)?.name || '수강자';
      const courseTitle = certificate.course?.title || '과정';

      return res.status(200).json({
        valid: true,
        certificate: {
          certificateId: certificate.id,
          certificateCode: certificate.certificateNumber,
          userName,
          courseTitle,
          completedAt: certificate.completedAt
            ? new Date(certificate.completedAt).toISOString().split('T')[0]
            : null,
          issuedAt: certificate.issuedAt
            ? new Date(certificate.issuedAt).toISOString().split('T')[0]
            : null,
          issuer: certificate.issuerName || 'O4O LMS',
        },
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
      const requestUserId = (req as any).user?.id;

      if (!requestUserId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const service = CertificateService.getInstance();
      const certificate = await service.getCertificate(id);

      if (!certificate) {
        return BaseController.notFound(res, 'Certificate not found');
      }

      // 본인 수료증만 다운로드 가능
      if (certificate.userId !== requestUserId) {
        return BaseController.forbidden(res, 'Access denied');
      }

      const userName = (certificate.user as any)?.name || '수강자';
      const courseTitle = certificate.course?.title || '과정';

      // WO-O4O-LMS-CERTIFICATE-ACCESS-ENHANCEMENT-V1: 검증 URL 생성
      const frontendBase =
        process.env.KPA_FRONTEND_URL ||
        process.env.FRONTEND_URL ||
        'https://kpa-society.co.kr';
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
