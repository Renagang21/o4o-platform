import { Router, type IRouter } from 'express';
import {
  SellerController,
  SupplierController,
  PartnerController,
  SellerProductController,
  ApprovalController,
  CommissionController,
  SettlementController,
  DashboardController,
} from '../controllers/index.js';
import {
  validateDto,
} from '../../../common/middleware/validation.middleware.js';
import {
  requireAuth,
  requireAdmin,
} from '../../../common/middleware/auth.middleware.js';
import {
  SellerApplicationDto,
  UpdateSellerDto,
  SellerQueryDto,
  SupplierApplicationDto,
  UpdateSupplierDto,
  SupplierQueryDto,
  PartnerApplicationDto,
  UpdatePartnerDto,
  PartnerQueryDto,
  CreateSellerProductDto,
  UpdateSellerProductDto,
  SellerProductQueryDto,
  AuthorizeSellerDto,
  AuthorizeSupplierDto,
  AuthorizePartnerDto,
  AuthorizeProductDto,
  CreateCommissionPolicyDto,
  UpdateCommissionPolicyDto,
  CreateSettlementDto,
  UpdateSettlementDto,
  SettlementQueryDto,
  SellerDashboardQueryDto,
  SupplierDashboardQueryDto,
  PartnerDashboardQueryDto,
} from '../dto/index.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

/**
 * Unified Dropshipping Routes - NextGen V2 Pattern
 *
 * This router consolidates all dropshipping-related endpoints:
 * - Seller management (SellerController)
 * - Supplier management (SupplierController)
 * - Partner/Affiliate management (PartnerController)
 * - Seller product catalog (SellerProductController)
 * - Authorization workflows (ApprovalController)
 * - Commission management (CommissionController)
 * - Settlement operations (SettlementController)
 * - Dashboard analytics (DashboardController)
 *
 * Replaces legacy routes:
 * - /api/seller
 * - /api/supplier
 * - /api/partner
 * - /api/dropshipping
 */
const router: IRouter = Router();

/**
 * ========================================
 * SELLER ROUTES (SellerController)
 * ========================================
 */

// POST /api/v1/dropshipping/sellers - Apply as seller
router.post(
  '/sellers',
  requireAuth,
  validateDto(SellerApplicationDto),
  asyncHandler(SellerController.createSeller)
);

// GET /api/v1/dropshipping/sellers - List sellers (Admin)
router.get(
  '/sellers',
  requireAdmin,
  asyncHandler(SellerController.listSellers)
);

// GET /api/v1/dropshipping/sellers/me - Get my seller profile
router.get(
  '/sellers/me',
  requireAuth,
  asyncHandler(SellerController.getMySellerProfile)
);

// GET /api/v1/dropshipping/sellers/:id - Get seller by ID
router.get(
  '/sellers/:id',
  requireAuth,
  asyncHandler(SellerController.getSeller)
);

// PUT /api/v1/dropshipping/sellers/:id - Update seller
router.put(
  '/sellers/:id',
  requireAuth,
  validateDto(UpdateSellerDto),
  asyncHandler(SellerController.updateSeller)
);

/**
 * ========================================
 * SUPPLIER ROUTES (SupplierController)
 * ========================================
 */

// POST /api/v1/dropshipping/suppliers - Apply as supplier
router.post(
  '/suppliers',
  requireAuth,
  validateDto(SupplierApplicationDto),
  asyncHandler(SupplierController.createSupplier)
);

// GET /api/v1/dropshipping/suppliers - List suppliers (Admin)
router.get(
  '/suppliers',
  requireAdmin,
  asyncHandler(SupplierController.listSuppliers)
);

// GET /api/v1/dropshipping/suppliers/me - Get my supplier profile
router.get(
  '/suppliers/me',
  requireAuth,
  asyncHandler(SupplierController.getMySupplierProfile)
);

// GET /api/v1/dropshipping/suppliers/:id - Get supplier by ID
router.get(
  '/suppliers/:id',
  requireAuth,
  asyncHandler(SupplierController.getSupplier)
);

// PUT /api/v1/dropshipping/suppliers/:id - Update supplier
router.put(
  '/suppliers/:id',
  requireAuth,
  validateDto(UpdateSupplierDto),
  asyncHandler(SupplierController.updateSupplier)
);

/**
 * ========================================
 * PARTNER ROUTES (PartnerController)
 * ========================================
 */

// POST /api/v1/dropshipping/partners - Apply as partner
router.post(
  '/partners',
  requireAuth,
  validateDto(PartnerApplicationDto),
  asyncHandler(PartnerController.createPartner)
);

// GET /api/v1/dropshipping/partners - List partners (Admin)
router.get(
  '/partners',
  requireAdmin,
  asyncHandler(PartnerController.listPartners)
);

// GET /api/v1/dropshipping/partners/me - Get my partner profile
router.get(
  '/partners/me',
  requireAuth,
  asyncHandler(PartnerController.getMyPartnerProfile)
);

// GET /api/v1/dropshipping/partners/:id - Get partner by ID
router.get(
  '/partners/:id',
  requireAuth,
  asyncHandler(PartnerController.getPartner)
);

// PUT /api/v1/dropshipping/partners/:id - Update partner
router.put(
  '/partners/:id',
  requireAuth,
  // TODO: Add validation when UpdatePartnerDto is converted to class with decorators
  asyncHandler(PartnerController.updatePartner)
);

/**
 * ========================================
 * SELLER PRODUCT ROUTES (SellerProductController)
 * ========================================
 */

// POST /api/v1/dropshipping/seller-products - Create seller product
router.post(
  '/seller-products',
  requireAuth,
  // TODO: Add validation when CreateSellerProductDto is converted to class with decorators
  asyncHandler(SellerProductController.createSellerProduct)
);

// GET /api/v1/dropshipping/seller-products - List seller products
router.get(
  '/seller-products',
  requireAuth,
  asyncHandler(SellerProductController.listSellerProducts)
);

// GET /api/v1/dropshipping/seller-products/:id - Get seller product by ID
router.get(
  '/seller-products/:id',
  requireAuth,
  asyncHandler(SellerProductController.getSellerProduct)
);

// PUT /api/v1/dropshipping/seller-products/:id - Update seller product
router.put(
  '/seller-products/:id',
  requireAuth,
  // TODO: Add validation when UpdateSellerProductDto is converted to class with decorators
  asyncHandler(SellerProductController.updateSellerProduct)
);

// DELETE /api/v1/dropshipping/seller-products/:id - Delete seller product
router.delete(
  '/seller-products/:id',
  requireAuth,
  asyncHandler(SellerProductController.deleteSellerProduct)
);

/**
 * ========================================
 * APPROVAL ROUTES (ApprovalController)
 * ========================================
 */

// POST /api/v1/dropshipping/approvals/sellers - Approve/Reject seller (Admin)
router.post(
  '/approvals/sellers',
  requireAdmin,
  validateDto(AuthorizeSellerDto),
  asyncHandler(ApprovalController.approveSeller)
);

// POST /api/v1/dropshipping/approvals/suppliers - Approve/Reject supplier (Admin)
router.post(
  '/approvals/suppliers',
  requireAdmin,
  validateDto(AuthorizeSupplierDto),
  asyncHandler(ApprovalController.approveSupplier)
);

// POST /api/v1/dropshipping/approvals/partners - Approve/Reject partner (Admin)
router.post(
  '/approvals/partners',
  requireAdmin,
  validateDto(AuthorizePartnerDto),
  asyncHandler(ApprovalController.approvePartner)
);

// POST /api/v1/dropshipping/approvals/products - Approve/Reject product (Admin)
router.post(
  '/approvals/products',
  requireAdmin,
  validateDto(AuthorizeProductDto),
  asyncHandler(ApprovalController.approveProduct)
);

// GET /api/v1/dropshipping/approvals/pending - List pending approvals (Admin)
router.get(
  '/approvals/pending',
  requireAdmin,
  asyncHandler(ApprovalController.listPendingApprovals)
);

/**
 * ========================================
 * COMMISSION ROUTES (CommissionController)
 * ========================================
 */

// POST /api/v1/dropshipping/commission-policies - Create commission policy (Admin)
router.post(
  '/commission-policies',
  requireAdmin,
  validateDto(CreateCommissionPolicyDto),
  asyncHandler(CommissionController.createCommissionPolicy)
);

// GET /api/v1/dropshipping/commission-policies - List commission policies
router.get(
  '/commission-policies',
  requireAuth,
  asyncHandler(CommissionController.listCommissionPolicies)
);

// GET /api/v1/dropshipping/commission-policies/:id - Get commission policy
router.get(
  '/commission-policies/:id',
  requireAuth,
  asyncHandler(CommissionController.getCommissionPolicy)
);

// PUT /api/v1/dropshipping/commission-policies/:id - Update commission policy (Admin)
router.put(
  '/commission-policies/:id',
  requireAdmin,
  validateDto(UpdateCommissionPolicyDto),
  asyncHandler(CommissionController.updateCommissionPolicy)
);

/**
 * ========================================
 * SETTLEMENT ROUTES (SettlementController)
 * ========================================
 */

// POST /api/v1/dropshipping/settlements - Create settlement (Admin)
router.post(
  '/settlements',
  requireAdmin,
  validateDto(CreateSettlementDto),
  asyncHandler(SettlementController.createSettlement)
);

// GET /api/v1/dropshipping/settlements - List settlements
router.get(
  '/settlements',
  requireAuth,
  asyncHandler(SettlementController.listSettlements)
);

// GET /api/v1/dropshipping/settlements/:id - Get settlement by ID
router.get(
  '/settlements/:id',
  requireAuth,
  asyncHandler(SettlementController.getSettlement)
);

// PUT /api/v1/dropshipping/settlements/:id - Update settlement (Admin)
router.put(
  '/settlements/:id',
  requireAdmin,
  validateDto(UpdateSettlementDto),
  asyncHandler(SettlementController.updateSettlement)
);

// POST /api/v1/dropshipping/settlements/:id/process - Process settlement (Admin)
router.post(
  '/settlements/:id/process',
  requireAdmin,
  asyncHandler(SettlementController.processSettlement)
);

/**
 * ========================================
 * DASHBOARD ROUTES (DashboardController)
 * ========================================
 */

// GET /api/v1/dropshipping/dashboard/seller - Get seller dashboard
router.get(
  '/dashboard/seller',
  requireAuth,
  asyncHandler(DashboardController.getSellerDashboard)
);

// GET /api/v1/dropshipping/dashboard/supplier - Get supplier dashboard
router.get(
  '/dashboard/supplier',
  requireAuth,
  asyncHandler(DashboardController.getSupplierDashboard)
);

// GET /api/v1/dropshipping/dashboard/partner - Get partner dashboard
router.get(
  '/dashboard/partner',
  requireAuth,
  asyncHandler(DashboardController.getPartnerDashboard)
);

export default router;
