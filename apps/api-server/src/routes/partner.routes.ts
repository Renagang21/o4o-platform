import { Router } from 'express';
import { PartnerController } from '../controllers/partner/partnerController';
import { authenticateToken } from '../middleware/auth';
import { requireAnyRole } from '../middleware/permission.middleware';
import { UserRole } from '../entities/User';
import logger from '../utils/logger';

const router: Router = Router();

// Partner dashboard routes (partner and admin access)
const partnerOrAdmin = requireAnyRole([UserRole.PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN]);

router.get('/dashboard/summary', authenticateToken, partnerOrAdmin, PartnerController.getDashboardSummary);
router.get('/commissions', authenticateToken, partnerOrAdmin, PartnerController.getCommissionHistory);
router.get('/analytics', authenticateToken, partnerOrAdmin, PartnerController.getPerformanceAnalytics);
router.post('/links/generate', authenticateToken, partnerOrAdmin, PartnerController.generatePartnerLink);
router.get('/products', authenticateToken, partnerOrAdmin, PartnerController.getPromotionalProducts);

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