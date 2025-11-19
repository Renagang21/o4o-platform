import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { WidgetAreaService } from '../../services/WidgetAreaService.js';

const router: Router = Router();
const widgetAreaService = new WidgetAreaService();

/**
 * GET /api/v1/widget-areas
 * Get all available widget areas
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const areas = await widgetAreaService.getAllActive();

    // Cache-Control header for 5 minutes
    res.set('Cache-Control', 'public, max-age=300');

    res.json({
      success: true,
      areas: areas.map(area => ({
        id: area.id,
        slug: area.slug,
        name: area.name,
        description: area.description,
        location: area.location
      }))
    });
  } catch (error: any) {
    console.error('[WidgetAreas] Fetch error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch widget areas'
    });
  }
});

/**
 * GET /api/v1/widget-areas/:id
 * Get a specific widget area by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const area = await widgetAreaService.getById(id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Widget area not found'
      });
    }

    res.set('Cache-Control', 'public, max-age=300');

    res.json({
      success: true,
      area: {
        id: area.id,
        slug: area.slug,
        name: area.name,
        description: area.description,
        location: area.location,
        sortOrder: area.sortOrder,
        meta: area.meta
      }
    });
  } catch (error: any) {
    console.error(`[WidgetAreas] Fetch error for ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch widget area'
    });
  }
});

export default router;
