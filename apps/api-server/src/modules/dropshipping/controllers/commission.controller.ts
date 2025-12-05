import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CreateCommissionPolicyDto, UpdateCommissionPolicyDto } from '../dto/index.js';
import { CommissionEngine } from '../services/CommissionEngine.js';
import { PolicyStatus } from '../entities/CommissionPolicy.js';
import logger from '../../../utils/logger.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';

/**
 * CommissionController
 * NextGen V2 - Dropshipping Module
 * Handles commission policy operations
 */
export class CommissionController extends BaseController {
  static async createCommissionPolicy(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as CreateCommissionPolicyDto;
      const commissionEngine = new CommissionEngine();

      // Set default status if not provided and convert date strings to Date objects
      const policyData: any = {
        ...data,
        status: data.status || PolicyStatus.ACTIVE,
        createdBy: req.user.id,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined
      };

      const policy = await commissionEngine.createPolicy(policyData);

      return BaseController.ok(res, {
        message: 'Commission policy created',
        policy
      });
    } catch (error: any) {
      logger.error('[CommissionController.createCommissionPolicy] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getCommissionPolicy(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const commissionEngine = new CommissionEngine();

      const policy = await commissionEngine.getPolicy(id);

      if (!policy) {
        return BaseController.notFound(res, 'Commission policy not found');
      }

      return BaseController.ok(res, { policy });
    } catch (error: any) {
      logger.error('[CommissionController.getCommissionPolicy] Error', {
        error: error.message,
        policyId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async updateCommissionPolicy(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { id } = req.params;
      const data = req.body as UpdateCommissionPolicyDto;
      const commissionEngine = new CommissionEngine();

      // Convert date strings to Date objects
      const updateData: any = {
        ...data,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined
      };

      const policy = await commissionEngine.updatePolicy(id, updateData);

      return BaseController.ok(res, {
        message: 'Commission policy updated',
        policy
      });
    } catch (error: any) {
      logger.error('[CommissionController.updateCommissionPolicy] Error', {
        error: error.message,
        policyId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async listCommissionPolicies(req: AuthRequest, res: Response): Promise<any> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const partnerId = req.query.partnerId as string | undefined;
      const productId = req.query.productId as string | undefined;

      const commissionEngine = new CommissionEngine();

      const result = await commissionEngine.listPolicies({
        status: status as any,
        partnerId,
        productId,
        page,
        limit
      });

      return BaseController.okPaginated(res, result.policies, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error: any) {
      logger.error('[CommissionController.listCommissionPolicies] Error', {
        error: error.message,
      });
      return BaseController.error(res, error);
    }
  }
}
