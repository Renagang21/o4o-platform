import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CertificateService } from '../services/CertificateService.js';
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
}
