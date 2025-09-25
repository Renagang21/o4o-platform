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

// Orders routes - Allow public access for admin dashboard
router.get('/orders', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;

  // Return mock orders for now (can be replaced with actual database queries later)
  res.json({
    success: true,
    data: [],
    pagination: {
      current: page,
      total: 0,
      count: limit,
      totalItems: 0
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

// Settings routes - Return full settings structure for admin dashboard
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      // Store Information
      storeName: 'O4O Store',
      storeEmail: 'store@o4o.com',
      storePhone: '02-1234-5678',
      storeAddress: '서울시 강남구',
      storeCity: '서울',
      storeCountry: 'KR',
      storePostalCode: '06000',

      // Payment Settings
      paymentMethods: {
        creditCard: true,
        paypal: false,
        stripe: false,
        toss: true,
        bankTransfer: true
      },

      // Shipping Settings
      enableShipping: true,
      freeShippingThreshold: 50000,
      defaultShippingFee: 3000,
      shippingZones: [],
      shippingProviders: [],

      // Tax Settings
      enableTax: true,
      taxRate: 10,
      taxIncludedInPrice: true,
      taxName: '부가세',

      // Email Notifications
      emailNotifications: {
        newOrder: true,
        orderShipped: true,
        orderCancelled: true,
        lowStock: true,
        newCustomer: false,
        paymentFailed: true
      },
      notificationEmail: 'admin@o4o.com',

      // Product Display Settings
      productsPerPage: 20,
      enableReviews: true,
      requireReviewApproval: true,
      enableWishlist: true,
      enableCompare: false,
      showOutOfStock: true,
      defaultSortOrder: 'date',

      // Inventory Settings
      enableStockManagement: true,
      lowStockThreshold: 10,
      outOfStockThreshold: 0,
      hideOutOfStock: false,
      allowBackorders: false,

      // Currency Settings
      currency: 'KRW',
      currencyPosition: 'right',
      thousandSeparator: ',',
      decimalSeparator: '.',
      decimals: 0,

      // Legacy fields for compatibility
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

// Reports route - Handle both authenticated and public requests
router.get('/reports/sales', async (req: Request, res: Response) => {
  const { period } = req.query;

  // Basic sales data (can be expanded later with real data)
  const salesData = {
    today: { totalSales: 1250000, totalOrders: 15, averageOrderValue: 83333 },
    week: { totalSales: 8750000, totalOrders: 105, averageOrderValue: 83333 },
    month: { totalSales: 35000000, totalOrders: 420, averageOrderValue: 83333 },
    year: { totalSales: 420000000, totalOrders: 5040, averageOrderValue: 83333 }
  };

  const periodKey = period === 'month:1' ? 'month' : (period as string || 'month');
  const data = salesData[periodKey as keyof typeof salesData] || salesData.month;

  res.json({
    success: true,
    data: {
      summary: {
        totalSales: data.totalSales,
        totalOrders: data.totalOrders,
        averageOrderValue: data.averageOrderValue
      },
      chartData: [],
      period: periodKey
    }
  });
});

export default router;