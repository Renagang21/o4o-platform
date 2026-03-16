import { Router } from 'express';
import { PartnerController } from '../controllers/partner/partnerController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router: Router = Router();

// Partner dashboard routes (partner and admin access)
const partnerOrAdmin = requireRole(['partner', 'admin', 'super_admin']);

// ====================================
// Phase K: Consumer-facing Partner API
// ====================================

// Partner signup (authenticated users)
// router.post('/signup', authenticate, PartnerController.signup);

// Get current partner info
// router.get('/me', authenticate, PartnerController.getMe);

// Partner dashboard summary (for Partner Dashboard Home)
// router.get('/dashboard', authenticate, PartnerController.getPartnerDashboard);

// Partner links CRUD
// router.get('/links', authenticate, PartnerController.getLinks);
// router.post('/links', authenticate, PartnerController.createLink);

// Partner earnings
// router.get('/earnings', authenticate, PartnerController.getEarnings);

// ====================================
// Legacy routes (existing)
// ====================================
router.get('/dashboard/summary', authenticate, partnerOrAdmin, PartnerController.getDashboardSummary);
router.get('/commissions', authenticate, partnerOrAdmin, PartnerController.getCommissionHistory);
router.get('/analytics', authenticate, partnerOrAdmin, PartnerController.getPerformanceAnalytics);
router.post('/links/generate', authenticate, partnerOrAdmin, PartnerController.generatePartnerLink);
router.get('/products', authenticate, partnerOrAdmin, PartnerController.getPromotionalProducts);

export default router;