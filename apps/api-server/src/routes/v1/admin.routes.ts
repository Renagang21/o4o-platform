import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

const router: Router = Router();

// Admin pages endpoint
router.get('/pages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Mock data for now - replace with actual database query
    const pages = [
      {
        id: '1',
        title: 'Home',
        slug: 'home',
        status: 'publish',
        author: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'About',
        slug: 'about',
        status: 'publish',
        author: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: pages,
      total: pages.length
    });
  } catch (error) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pages'
    });
  }
});

// Custom field groups endpoint (public for frontend compatibility)
router.get('/custom-field-groups', async (req, res) => {
  try {
    // Mock data for now
    const fieldGroups = [
      {
        id: '1',
        title: 'Product Details',
        fields: [
          { name: 'price', type: 'number', label: 'Price' },
          { name: 'sku', type: 'text', label: 'SKU' }
        ],
        location: 'product',
        active: true
      }
    ];

    res.json({
      success: true,
      data: fieldGroups,
      total: fieldGroups.length
    });
  } catch (error) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom field groups'
    });
  }
});

export default router;