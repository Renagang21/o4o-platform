import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';

const router: Router = Router();

// Mock widget areas (실제로는 DB에서 조회)
const mockWidgetAreas = [
  { id: 'header-widgets', name: 'Header Widgets', description: 'Widgets in header area' },
  { id: 'footer-widgets', name: 'Footer Widgets', description: 'Widgets in footer area' },
  { id: 'sidebar-widgets', name: 'Sidebar Widgets', description: 'Widgets in sidebar area' },
  { id: 'primary-sidebar', name: 'Primary Sidebar', description: 'Primary sidebar widget area' },
  { id: 'secondary-sidebar', name: 'Secondary Sidebar', description: 'Secondary sidebar widget area' }
];

/**
 * GET /api/v1/widget-areas
 * Get all available widget areas
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // TODO: 실제 DB 조회 로직
    // const areas = await widgetAreaRepository.find();

    res.json({
      success: true,
      areas: mockWidgetAreas
    });
  } catch (error: any) {
    console.error('Widget areas fetch error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch widget areas'
    });
  }
});

export default router;
