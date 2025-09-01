import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// Mock data for products
const mockProducts = [
  {
    id: '1',
    name: 'Sample Product 1',
    slug: 'sample-product-1',
    sku: 'SKU001',
    description: 'This is a sample product',
    shortDescription: 'Sample product',
    retailPrice: 29900,
    wholesalePrice: 20000,
    cost: 15000,
    stockQuantity: 100,
    stockStatus: 'instock',
    status: 'active',
    featured: true,
    images: [],
    categories: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Sample Product 2',
    slug: 'sample-product-2',
    sku: 'SKU002',
    description: 'This is another sample product',
    shortDescription: 'Another sample',
    retailPrice: 39900,
    wholesalePrice: 30000,
    cost: 25000,
    stockQuantity: 50,
    stockStatus: 'instock',
    status: 'active',
    featured: false,
    images: [],
    categories: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// GET /products - List products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category,
      search,
      featured,
      status = 'active'
    } = req.query;

    let filteredProducts = [...mockProducts];

    // Filter by status
    if (status && status !== 'all') {
      filteredProducts = filteredProducts.filter(p => p.status === status);
    }

    // Filter by featured
    if (featured === 'true') {
      filteredProducts = filteredProducts.filter(p => p.featured);
    }

    // Search
    if (search) {
      const searchLower = String(search).toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredProducts.length,
        totalPages: Math.ceil(filteredProducts.length / Number(limit))
      }
    });
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message
    });
  }
});

// GET /products/featured - Get featured products
router.get('/products/featured', async (req: Request, res: Response) => {
  try {
    const featuredProducts = mockProducts.filter(p => p.featured);
    
    res.json({
      success: true,
      data: featuredProducts
    });
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured products',
      message: error.message
    });
  }
});

// GET /products/:id - Get single product
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = mockProducts.find(p => p.id === id || p.slug === id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      message: error.message
    });
  }
});

// POST /products - Create product (requires auth)
router.post('/products', authenticateToken, async (req: Request, res: Response) => {
  try {
    const newProduct = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockProducts.push(newProduct);

    res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Product created successfully'
    });
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      message: error.message
    });
  }
});

// PUT /products/:id - Update product (requires auth)
router.put('/products/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productIndex = mockProducts.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      ...req.body,
      id: mockProducts[productIndex].id,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: mockProducts[productIndex],
      message: 'Product updated successfully'
    });
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      message: error.message
    });
  }
});

// DELETE /products/:id - Delete product (requires auth)
router.delete('/products/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productIndex = mockProducts.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const deletedProduct = mockProducts.splice(productIndex, 1)[0];

    res.json({
      success: true,
      data: deletedProduct,
      message: 'Product deleted successfully'
    });
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      message: error.message
    });
  }
});

// Cart routes (mock implementation)
router.get('/cart', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      items: [],
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0
    }
  });
});

router.post('/cart/items', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Item added to cart'
  });
});

// Orders routes (mock implementation)
router.get('/orders', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    }
  });
});

// Categories tree for ecommerce
router.get('/categories/tree', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: '전자제품',
        slug: 'electronics',
        children: [
          {
            id: '2',
            name: '스마트폰',
            slug: 'smartphones',
            children: []
          }
        ]
      }
    ]
  });
});

export default router;