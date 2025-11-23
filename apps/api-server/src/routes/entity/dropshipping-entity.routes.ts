import { Router, type Request, type Response, type NextFunction } from 'express';
import { SupplierEntityController } from '../../controllers/entity/SupplierEntityController.js';
import { PartnerEntityController } from '../../controllers/entity/PartnerEntityController.js';
import { SupplierDashboardController } from '../../controllers/entity/SupplierDashboardController.js';
import { PartnerDashboardController } from '../../controllers/entity/PartnerDashboardController.js';
import { SettlementEntityController } from '../../controllers/entity/SettlementEntityController.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const supplierController = new SupplierEntityController();
const partnerController = new PartnerEntityController();
const supplierDashboardController = new SupplierDashboardController();
const partnerDashboardController = new PartnerDashboardController();
const settlementController = new SettlementEntityController();

// All routes require authentication
router.use(authenticateToken);

/**
 * Helper function to check if user is admin
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction): void | Response => {
  const userRole = (req as any).user?.role;
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

// ============================================================================
// SUPPLIER ENTITY ROUTES
// ============================================================================

/**
 * @route GET /api/v1/entity/suppliers
 * @desc List all suppliers (with filtering & pagination)
 * @access Private (Users see own, admins see all)
 */
router.get('/suppliers', supplierController.list.bind(supplierController));

/**
 * @route GET /api/v1/entity/suppliers/:id
 * @desc Get single supplier by ID
 * @access Private (Owner or admin)
 */
router.get('/suppliers/:id', supplierController.get.bind(supplierController));

/**
 * @route POST /api/v1/entity/suppliers
 * @desc Create new supplier
 * @access Private (Authenticated users)
 */
router.post('/suppliers', supplierController.create.bind(supplierController));

/**
 * @route PUT /api/v1/entity/suppliers/:id
 * @desc Update existing supplier
 * @access Private (Owner or admin)
 */
router.put('/suppliers/:id', supplierController.update.bind(supplierController));

/**
 * @route DELETE /api/v1/entity/suppliers/:id
 * @desc Soft delete supplier
 * @access Private (Owner or admin)
 */
router.delete('/suppliers/:id', supplierController.delete.bind(supplierController));

/**
 * @route PUT /api/v1/entity/suppliers/:id/approve
 * @desc Approve supplier
 * @access Admin only
 */
router.put('/suppliers/:id/approve', requireAdmin, supplierController.approve.bind(supplierController));

/**
 * @route PUT /api/v1/entity/suppliers/:id/reject
 * @desc Reject supplier
 * @access Admin only
 */
router.put('/suppliers/:id/reject', requireAdmin, supplierController.reject.bind(supplierController));

// ============================================================================
// PARTNER ENTITY ROUTES
// ============================================================================

/**
 * @route GET /api/v1/entity/partners
 * @desc List all partners (with filtering & pagination)
 * @access Private (Users see own, admins see all)
 */
router.get('/partners', partnerController.list.bind(partnerController));

/**
 * @route GET /api/v1/entity/partners/:id
 * @desc Get single partner by ID
 * @access Private (Owner or admin)
 */
router.get('/partners/:id', partnerController.get.bind(partnerController));

/**
 * @route POST /api/v1/entity/partners
 * @desc Create new partner
 * @access Private (Authenticated users)
 */
router.post('/partners', partnerController.create.bind(partnerController));

/**
 * @route PUT /api/v1/entity/partners/:id
 * @desc Update existing partner
 * @access Private (Owner or admin)
 */
router.put('/partners/:id', partnerController.update.bind(partnerController));

/**
 * @route DELETE /api/v1/entity/partners/:id
 * @desc Soft delete partner
 * @access Private (Owner or admin)
 */
router.delete('/partners/:id', partnerController.delete.bind(partnerController));

/**
 * @route PUT /api/v1/entity/partners/:id/approve
 * @desc Approve partner
 * @access Admin only
 */
router.put('/partners/:id/approve', requireAdmin, partnerController.approve.bind(partnerController));

/**
 * @route PUT /api/v1/entity/partners/:id/reject
 * @desc Reject partner (requires reason)
 * @access Admin only
 */
router.put('/partners/:id/reject', requireAdmin, partnerController.reject.bind(partnerController));

/**
 * @route GET /api/v1/entity/partners/:id/referral-link
 * @desc Generate referral link for partner
 * @query productId - Optional product ID
 * @query sellerId - Optional seller ID
 * @access Private (Owner or admin)
 */
router.get('/partners/:id/referral-link', partnerController.getReferralLink.bind(partnerController));

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * @route GET /api/v1/entity/suppliers/dashboard/stats
 * @desc Get supplier dashboard statistics
 * @query period - Time period (7d, 30d, 90d, 1y)
 * @query supplierId - Supplier ID (admin only)
 * @access Private (Owner or admin)
 */
router.get('/suppliers/dashboard/stats', supplierDashboardController.getStats.bind(supplierDashboardController));

/**
 * @route GET /api/v1/entity/suppliers/dashboard/products
 * @desc Get supplier's products with filtering
 * @query status - Filter by status
 * @query lowStock - Filter low stock products
 * @query outOfStock - Filter out of stock products
 * @access Private (Owner only)
 */
router.get('/suppliers/dashboard/products', supplierDashboardController.getProducts.bind(supplierDashboardController));

/**
 * @route GET /api/v1/entity/suppliers/dashboard/orders
 * @desc Get supplier's orders with pagination (R-8)
 * @query status - Filter by order status
 * @query from - Start date filter
 * @query to - End date filter
 * @query page - Page number
 * @query limit - Items per page
 * @access Private (Owner only)
 */
router.get('/suppliers/dashboard/orders', supplierDashboardController.getOrders.bind(supplierDashboardController));

/**
 * @route GET /api/v1/entity/suppliers/dashboard/revenue
 * @desc Get supplier's revenue details (R-8)
 * @query from - Start date filter
 * @query to - End date filter
 * @access Private (Owner only)
 */
router.get('/suppliers/dashboard/revenue', supplierDashboardController.getRevenue.bind(supplierDashboardController));

/**
 * @route GET /api/v1/entity/partners/dashboard/summary
 * @desc Get partner dashboard summary (earnings, clicks, conversions)
 * @query partnerId - Partner ID (admin only)
 * @access Private (Owner or admin)
 */
router.get('/partners/dashboard/summary', partnerDashboardController.getSummary.bind(partnerDashboardController));

/**
 * @route GET /api/v1/entity/partners/dashboard/commissions
 * @desc Get partner commission history
 * @query status - Filter by commission status
 * @access Private (Owner only)
 */
router.get('/partners/dashboard/commissions', partnerDashboardController.getCommissions.bind(partnerDashboardController));

// ============================================================================
// SETTLEMENT ROUTES
// ============================================================================

/**
 * @route GET /api/v1/entity/settlements/summary
 * @desc Get settlement summary statistics for partner dashboard
 * @access Private (Partner sees own, admin sees all)
 */
router.get('/settlements/summary', settlementController.getSummary.bind(settlementController));

/**
 * @route GET /api/v1/entity/settlements
 * @desc List all settlements with filtering & pagination
 * @query status - Filter by settlement status
 * @query recipientType - Filter by recipient type
 * @query startDate - Filter by start date
 * @query endDate - Filter by end date
 * @query page - Page number
 * @query limit - Items per page
 * @access Private (Partner sees own, admin sees all)
 */
router.get('/settlements', settlementController.list.bind(settlementController));

/**
 * @route GET /api/v1/entity/settlements/:id
 * @desc Get single settlement by ID
 * @access Private (Owner or admin)
 */
router.get('/settlements/:id', settlementController.get.bind(settlementController));

export default router;
