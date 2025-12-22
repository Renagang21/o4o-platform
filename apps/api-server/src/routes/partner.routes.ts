import { Router } from 'express';
import { PartnerController } from '../controllers/partner/partnerController.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { requireAnyRole } from '../middleware/permission.middleware.js';
import { UserRole } from '../entities/User.js';
import logger from '../utils/logger.js';

const router: Router = Router();

// Partner dashboard routes (partner and admin access)
const partnerOrAdmin = requireAnyRole([UserRole.PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN]);

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

// Public routes for tracking
router.get('/track/click/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;
    const { ref } = req.query;
    
    // Track click event
    // This would typically update click counts in database
    logger.info(`Click tracked for link: ${linkId}, ref: ${ref}`);
    
    res.json({ 
      success: true, 
      message: 'Click tracked successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to track click' 
    });
  }
});

router.post('/track/conversion', async (req, res) => {
  try {
    const { orderId, linkId, ref } = req.body;
    
    // Track conversion event
    // This would typically update conversion counts and calculate commission
    logger.info(`Conversion tracked - Order: ${orderId}, Link: ${linkId}, Ref: ${ref}`);
    
    res.json({ 
      success: true, 
      message: 'Conversion tracked successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to track conversion' 
    });
  }
});

export default router;