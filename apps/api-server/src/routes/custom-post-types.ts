import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router: Router = Router();

// Mock data for custom post types
const mockCPTs = [
  {
    id: '1',
    name: 'Products',
    slug: 'products',
    description: 'Product catalog',
    icon: 'package',
    public: true,
    has_archive: true,
    show_in_menu: true,
    supports: ['title', 'editor', 'thumbnail', 'custom-fields'],
    taxonomies: ['product_category', 'product_tag'],
    labels: {
      singular_name: 'Product',
      menu_name: 'Products',
      add_new: 'Add Product',
      add_new_item: 'Add New Product',
      edit_item: 'Edit Product',
      view_item: 'View Product'
    }
  },
  {
    id: '2',
    name: 'Portfolio',
    slug: 'portfolio',
    description: 'Portfolio items',
    icon: 'briefcase',
    public: true,
    has_archive: true,
    show_in_menu: true,
    supports: ['title', 'editor', 'thumbnail', 'excerpt'],
    taxonomies: ['portfolio_category'],
    labels: {
      singular_name: 'Portfolio Item',
      menu_name: 'Portfolio',
      add_new: 'Add Item',
      add_new_item: 'Add New Portfolio Item',
      edit_item: 'Edit Portfolio Item',
      view_item: 'View Portfolio Item'
    }
  }
];

// GET /api/v1/custom-post-types - Get all CPTs
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: mockCPTs,
      total: mockCPTs.length
    });
  } catch (error: any) {
    console.error('Error fetching CPTs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom post types',
      message: error.message
    });
  }
});

// GET /api/v1/custom-post-types/:slug - Get single CPT
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const cpt = mockCPTs.find(c => c.slug === slug);

    if (!cpt) {
      return res.status(404).json({
        success: false,
        error: 'Custom post type not found'
      });
    }

    res.json({
      success: true,
      data: cpt
    });
  } catch (error: any) {
    console.error('Error fetching CPT:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom post type',
      message: error.message
    });
  }
});

// POST /api/v1/custom-post-types - Create new CPT (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, icon, supports, taxonomies, labels } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        error: 'Name and slug are required'
      });
    }

    const newCPT = {
      id: Date.now().toString(),
      name,
      slug,
      description: description || '',
      icon: icon || 'file',
      public: true,
      has_archive: true,
      show_in_menu: true,
      supports: supports || ['title', 'editor'],
      taxonomies: taxonomies || [],
      labels: labels || {
        singular_name: name,
        menu_name: name,
        add_new: `Add ${name}`,
        add_new_item: `Add New ${name}`,
        edit_item: `Edit ${name}`,
        view_item: `View ${name}`
      }
    };

    mockCPTs.push(newCPT);

    res.status(201).json({
      success: true,
      data: newCPT,
      message: 'Custom post type created successfully'
    });
  } catch (error: any) {
    console.error('Error creating CPT:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create custom post type',
      message: error.message
    });
  }
});

// PUT /api/v1/custom-post-types/:slug - Update CPT (Admin only)
router.put('/:slug', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const cptIndex = mockCPTs.findIndex(c => c.slug === slug);

    if (cptIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Custom post type not found'
      });
    }

    mockCPTs[cptIndex] = {
      ...mockCPTs[cptIndex],
      ...req.body,
      slug: mockCPTs[cptIndex].slug // Prevent slug change
    };

    res.json({
      success: true,
      data: mockCPTs[cptIndex],
      message: 'Custom post type updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating CPT:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update custom post type',
      message: error.message
    });
  }
});

// DELETE /api/v1/custom-post-types/:slug - Delete CPT (Admin only)
router.delete('/:slug', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const cptIndex = mockCPTs.findIndex(c => c.slug === slug);

    if (cptIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Custom post type not found'
      });
    }

    const deletedCPT = mockCPTs.splice(cptIndex, 1)[0];

    res.json({
      success: true,
      data: deletedCPT,
      message: 'Custom post type deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting CPT:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete custom post type',
      message: error.message
    });
  }
});

// GET /api/v1/custom-post-types/:slug/posts - Get posts by CPT
router.get('/:slug/posts', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Mock posts data
    const mockPosts = [
      {
        id: '1',
        title: `Sample ${slug} 1`,
        slug: `sample-${slug}-1`,
        content: 'Sample content',
        status: 'published',
        type: slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: mockPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: mockPosts.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching CPT posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts',
      message: error.message
    });
  }
});

export default router;