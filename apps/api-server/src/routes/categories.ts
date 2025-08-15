import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// Mock data for categories (until database is properly configured)
const mockCategories = [
  {
    id: '1',
    name: '공지사항',
    slug: 'notice',
    description: '중요한 공지사항',
    parent: null,
    count: 5,
    taxonomy: 'category',
    meta: {}
  },
  {
    id: '2', 
    name: '뉴스',
    slug: 'news',
    description: '최신 뉴스',
    parent: null,
    count: 12,
    taxonomy: 'category',
    meta: {}
  },
  {
    id: '3',
    name: '이벤트',
    slug: 'events',
    description: '이벤트 및 행사',
    parent: null,
    count: 8,
    taxonomy: 'category',
    meta: {}
  }
];

// GET /api/v1/categories - Get all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      taxonomy = 'category',
      parent,
      hide_empty = false,
      orderby = 'name',
      order = 'ASC'
    } = req.query;

    // Filter categories based on query params
    let categories = [...mockCategories];
    
    if (parent !== undefined) {
      categories = categories.filter(cat => cat.parent === parent);
    }

    if (hide_empty === 'true' || hide_empty === '1') {
      categories = categories.filter(cat => cat.count > 0);
    }

    // Sort categories
    categories.sort((a, b) => {
      if (orderby === 'count') {
        return order === 'ASC' ? a.count - b.count : b.count - a.count;
      }
      return order === 'ASC' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });

    res.json({
      success: true,
      data: categories,
      total: categories.length
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error.message
    });
  }
});

// GET /api/v1/categories/:id - Get single category
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = mockCategories.find(cat => cat.id === id || cat.slug === id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error: any) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category',
      message: error.message
    });
  }
});

// POST /api/v1/categories - Create category (requires auth)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, parent } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    const newCategory = {
      id: Date.now().toString(),
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description: description || '',
      parent: parent || null,
      count: 0,
      taxonomy: 'category',
      meta: {}
    };

    mockCategories.push(newCategory);

    res.status(201).json({
      success: true,
      data: newCategory,
      message: 'Category created successfully'
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
      message: error.message
    });
  }
});

// PUT /api/v1/categories/:id - Update category (requires auth)
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, description, parent } = req.body;

    const categoryIndex = mockCategories.findIndex(cat => cat.id === id);
    
    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    mockCategories[categoryIndex] = {
      ...mockCategories[categoryIndex],
      name: name || mockCategories[categoryIndex].name,
      slug: slug || mockCategories[categoryIndex].slug,
      description: description !== undefined ? description : mockCategories[categoryIndex].description,
      parent: parent !== undefined ? parent : mockCategories[categoryIndex].parent
    };

    res.json({
      success: true,
      data: mockCategories[categoryIndex],
      message: 'Category updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category',
      message: error.message
    });
  }
});

// DELETE /api/v1/categories/:id - Delete category (requires auth)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categoryIndex = mockCategories.findIndex(cat => cat.id === id);
    
    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const deletedCategory = mockCategories.splice(categoryIndex, 1)[0];

    res.json({
      success: true,
      data: deletedCategory,
      message: 'Category deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category',
      message: error.message
    });
  }
});

export default router;