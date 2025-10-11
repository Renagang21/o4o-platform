import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/permission.middleware';

const router: Router = Router();

// Get app information
router.get('/info', authenticateToken, requireAdmin, (req, res) => {
  try {
    // Return static app information
    const apps = [
      { id: 'ecommerce', name: '전자상거래', version: '2.0.0', category: 'Sales' },
      { id: 'affiliate', name: '제휴 마케팅', version: '1.5.0', category: 'Marketing' },
      { id: 'crowdfunding', name: '크라우드펀딩', version: '1.2.0', category: 'Finance' },
      { id: 'forum', name: '포럼/커뮤니티', version: '1.8.0', category: 'Community' },
      { id: 'signage', name: '디지털 사이니지', version: '1.0.0', category: 'Media' },
      { id: 'cpt-acf', name: 'CPT & ACF', version: '1.3.0', category: 'Content' },
      { id: 'vendor', name: '벤더 관리', version: '1.1.0', category: 'Sales' },
      { id: 'security', name: '보안 관리', version: '2.1.0', category: 'System' }
    ];
    
    res.json({
      success: true,
      data: apps
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch app information'
    });
  }
});

export default router;