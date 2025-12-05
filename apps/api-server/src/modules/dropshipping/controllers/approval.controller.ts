import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AuthorizeSellerDto, AuthorizeSupplierDto, AuthorizePartnerDto, AuthorizeProductDto, AuthorizationAction } from '../dto/index.js';
import { SellerService } from '../services/SellerService.js';
import { SupplierService } from '../services/SupplierService.js';
import { sellerAuthorizationService } from '../services/SellerAuthorizationService.js';
import { AuthorizationStatus } from '../entities/SellerAuthorization.js';
import logger from '../../../utils/logger.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';

/**
 * ApprovalController
 * NextGen V2 - Dropshipping Module
 * Phase B-4 Step 3: Integrated with SellerService, SupplierService, and SellerAuthorizationService
 * Handles authorization and approval workflows for:
 * - Seller entity approvals (seller registration)
 * - Supplier entity approvals (supplier registration)
 * - Seller-Product authorization approvals (seller requests to sell products)
 */
export class ApprovalController extends BaseController {
  static async approveSeller(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as AuthorizeSellerDto;
      const sellerService = SellerService.getInstance();

      // Phase B-4 Step 3: Integrated with SellerService
      let seller;
      let message;

      switch (data.action) {
        case AuthorizationAction.APPROVE:
          seller = await sellerService.approveSeller(data.sellerId, req.user.id);
          message = 'Seller approved successfully';
          break;
        case AuthorizationAction.REJECT:
          seller = await sellerService.rejectSeller(data.sellerId);
          message = 'Seller rejected';
          break;
        case AuthorizationAction.SUSPEND:
          seller = await sellerService.suspendSeller(data.sellerId);
          message = 'Seller suspended';
          break;
        case AuthorizationAction.REACTIVATE:
          seller = await sellerService.reactivateSeller(data.sellerId);
          message = 'Seller reactivated';
          break;
        default:
          return BaseController.badRequest(res, `Unknown action: ${data.action}`);
      }

      return BaseController.ok(res, {
        message,
        seller
      });
    } catch (error: any) {
      logger.error('[ApprovalController.approveSeller] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async approveSupplier(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as AuthorizeSupplierDto;
      const supplierService = SupplierService.getInstance();

      // Phase B-4 Step 3: Integrated with SupplierService
      let supplier;
      let message;

      switch (data.action) {
        case AuthorizationAction.APPROVE:
          supplier = await supplierService.approveSupplier(data.supplierId, req.user.id);
          message = 'Supplier approved successfully';
          break;
        case AuthorizationAction.REJECT:
          supplier = await supplierService.rejectSupplier(data.supplierId);
          message = 'Supplier rejected';
          break;
        case AuthorizationAction.SUSPEND:
          supplier = await supplierService.suspendSupplier(data.supplierId);
          message = 'Supplier suspended';
          break;
        case AuthorizationAction.REACTIVATE:
          supplier = await supplierService.reactivateSupplier(data.supplierId);
          message = 'Supplier reactivated';
          break;
        default:
          return BaseController.badRequest(res, `Unknown action: ${data.action}`);
      }

      return BaseController.ok(res, {
        message,
        supplier
      });
    } catch (error: any) {
      logger.error('[ApprovalController.approveSupplier] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async approvePartner(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as AuthorizePartnerDto;

      // TODO: Implement PartnerService.approve
      return BaseController.ok(res, {
        message: 'Partner authorization processed',
        partnerId: data.partnerId,
        action: data.action
      });
    } catch (error: any) {
      logger.error('[ApprovalController.approvePartner] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async approveProduct(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as AuthorizeProductDto;

      // Phase B-4 Step 3: This method is for approving seller-product authorization requests
      // NOTE: AuthorizeProductDto currently only has productId, but we need authorizationId
      // to uniquely identify which authorization request to approve.
      // TODO: Either:
      // 1. Update AuthorizeProductDto to include authorizationId, OR
      // 2. Create a separate endpoint like /authorizations/:id/approve
      // For now, this remains unimplemented until DTO is clarified.

      return BaseController.ok(res, {
        message: 'Product authorization endpoint needs authorizationId - use /authorizations/:id instead',
        productId: data.productId,
        action: data.action,
        note: 'This endpoint will be revised in future phase'
      });
    } catch (error: any) {
      logger.error('[ApprovalController.approveProduct] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async listPendingApprovals(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string; // 'seller', 'supplier', 'authorization', or 'all'

      // Phase B-4 Step 3: Integrated with SellerAuthorizationService
      // List pending seller-product authorization requests
      if (!type || type === 'authorization' || type === 'all') {
        const result = await sellerAuthorizationService.listAuthorizations({
          status: AuthorizationStatus.REQUESTED,
          page,
          limit
        });

        return BaseController.ok(res, {
          authorizations: result.authorizations,
          pagination: result.pagination,
          type: 'authorization'
        });
      }

      // TODO: Add listing for pending sellers and suppliers
      // For now, only authorization requests are supported
      return BaseController.okPaginated(res, [], {
        page,
        limit,
        total: 0,
        totalPages: 0,
      });
    } catch (error: any) {
      logger.error('[ApprovalController.listPendingApprovals] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }
}
