import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ProductController } from '../controllers/ProductController';

const router: Router = Router();
const productController = new ProductController();

// Product routes - using database
router.get('/products', productController.getProducts.bind(productController));
router.get('/products/featured', productController.getFeaturedProducts.bind(productController));
router.get('/products/:id', productController.getProduct.bind(productController));
router.post('/products', authenticateToken, productController.createProduct.bind(productController));
router.put('/products/:id', authenticateToken, productController.updateProduct.bind(productController));
router.delete('/products/:id', authenticateToken, productController.deleteProduct.bind(productController));

// Import route for bulk product creation
router.post('/products/import', authenticateToken, productController.importProducts.bind(productController));

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

// Settings routes (mock implementation)
router.get('/settings', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      general: {
        storeName: 'O4O Store',
        storeEmail: 'store@o4o.com',
        currency: 'KRW',
        weightUnit: 'kg',
        dimensionUnit: 'cm'
      },
      checkout: {
        enableGuestCheckout: true,
        requireTermsAcceptance: true,
        enableCoupons: true
      },
      shipping: {
        enableCalculator: true,
        freeShippingThreshold: 50000,
        defaultShippingFee: 3000
      },
      payment: {
        enabledMethods: ['card', 'bank_transfer', 'virtual_account'],
        testMode: false
      },
      tax: {
        enableTax: true,
        taxRate: 10,
        pricesIncludeTax: true
      }
    }
  });
});

router.put('/settings', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: req.body
  });
});

// Dashboard stats route
router.get('/dashboard/stats', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      todaySales: 1250000,
      todayOrders: 15,
      totalProducts: 128,
      lowStockProducts: 5,
      pendingOrders: 3,
      totalCustomers: 456
    }
  });
});

// Reports route
router.get('/reports/sales', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      summary: {
        totalSales: 15000000,
        totalOrders: 150,
        averageOrderValue: 100000
      },
      chartData: []
    }
  });
});

export default router;