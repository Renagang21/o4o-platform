import { http, HttpResponse } from 'msw';
import { createMockProduct, createMockProducts } from '../factories/product';
import { createMockOrder, createMockOrders } from '../factories/order';

// API Base URL (환경에 따라 변경)
const API_BASE = 'http://localhost:4000/api';

export const handlers = [
  // Products API Handlers
  http.get(`${API_BASE}/ecommerce/products`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const category = url.searchParams.get('category');

    // Mock 데이터 생성
    let products = [
      createMockProduct({ id: 'prod_1', name: 'MacBook Pro M3', status: 'published' }),
      createMockProduct({ id: 'prod_2', name: 'iPhone 15 Pro', status: 'published' }),
      createMockProducts.draft(),
      createMockProducts.outOfStock(),
      createMockProducts.featured(),
      createMockProducts.virtual(),
    ];

    // 필터링 적용
    if (status) {
      products = products.filter(p => p.status === status);
    }

    if (search) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      products = products.filter(p => 
        p.categories.some(c => c.id === category)
      );
    }

    // 페이지네이션
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = products.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: paginatedProducts,
      total: products.length,
      page,
      limit,
      totalPages: Math.ceil(products.length / limit),
    });
  }),

  http.get(`${API_BASE}/ecommerce/products/:id`, ({ params }) => {
    const { id } = params;
    
    // Mock 상품 데이터 반환
    const product = createMockProduct({ 
      id: id as string,
      name: `Product ${id}`,
    });

    return HttpResponse.json({
      success: true,
      data: product,
    });
  }),

  http.post(`${API_BASE}/ecommerce/products`, async ({ request }) => {
    const productData = await request.json() as any;
    
    const newProduct = createMockProduct({
      ...productData,
      id: 'prod_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return HttpResponse.json({
      success: true,
      data: newProduct,
      message: 'Product created successfully',
    }, { status: 201 });
  }),

  http.put(`${API_BASE}/ecommerce/products/:id`, async ({ params, request }) => {
    const { id } = params;
    const updateData = await request.json() as any;
    
    const updatedProduct = createMockProduct({
      id: id as string,
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    return HttpResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully',
    });
  }),

  http.delete(`${API_BASE}/ecommerce/products/:id`, ({ params }) => {
    const { id } = params;
    
    return HttpResponse.json({
      success: true,
      message: `Product ${id} deleted successfully`,
    });
  }),

  http.post(`${API_BASE}/ecommerce/products/:id/duplicate`, ({ params }) => {
    const { id } = params;
    
    const duplicatedProduct = createMockProduct({
      id: 'prod_dup_' + Date.now(),
      name: `Copy of Product ${id}`,
      sku: `DUP-${id}`,
      status: 'draft',
    });

    return HttpResponse.json({
      success: true,
      data: duplicatedProduct,
      message: 'Product duplicated successfully',
    }, { status: 201 });
  }),

  // Orders API Handlers
  http.get(`${API_BASE}/ecommerce/orders`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    // Mock 주문 데이터 생성
    let orders = [
      createMockOrder({ id: 'order_1', orderNumber: 'ORD-001', status: 'pending' }),
      createMockOrders.processing(),
      createMockOrders.completed(),
      createMockOrders.cancelled(),
      createMockOrders.refunded(),
      createMockOrders.bulk(),
    ];

    // 필터링 적용
    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    if (search) {
      orders = orders.filter(o => 
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 페이지네이션
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = orders.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: paginatedOrders,
      total: orders.length,
      page,
      limit,
      totalPages: Math.ceil(orders.length / limit),
    });
  }),

  http.get(`${API_BASE}/ecommerce/orders/:id`, ({ params }) => {
    const { id } = params;
    
    const order = createMockOrder({ 
      id: id as string,
      orderNumber: `ORD-${id}`,
    });

    return HttpResponse.json({
      success: true,
      data: order,
    });
  }),

  http.put(`${API_BASE}/ecommerce/orders/:id/status`, async ({ params, request }) => {
    const { id } = params;
    const { status, note } = await request.json() as any;
    
    const updatedOrder = createMockOrder({
      id: id as string,
      status,
      updatedAt: new Date().toISOString(),
      adminNote: note,
    });

    return HttpResponse.json({
      success: true,
      data: updatedOrder,
      message: `Order status updated to ${status}`,
    });
  }),

  http.post(`${API_BASE}/ecommerce/orders/:id/refund`, async ({ params, request }) => {
    const { id } = params;
    const { amount, reason, items } = await request.json() as any;
    
    return HttpResponse.json({
      success: true,
      message: `Refund of ${amount} processed for order ${id}`,
      data: {
        refundId: 'refund_' + Date.now(),
        amount,
        reason,
        items,
        processedAt: new Date().toISOString(),
      },
    });
  }),

  // Bulk Operations
  http.post(`${API_BASE}/ecommerce/products/bulk`, async ({ request }) => {
    const bulkAction = await request.json() as any;
    
    return HttpResponse.json({
      success: true,
      message: `Bulk ${bulkAction.action} completed for ${bulkAction.productIds.length} products`,
      affectedCount: bulkAction.productIds.length,
    });
  }),

  http.post(`${API_BASE}/ecommerce/orders/bulk`, async ({ request }) => {
    const bulkAction = await request.json() as any;
    
    return HttpResponse.json({
      success: true,
      message: `Bulk ${bulkAction.action} completed for ${bulkAction.orderIds.length} orders`,
      affectedCount: bulkAction.orderIds.length,
    });
  }),

  // Categories API (기본)
  http.get(`${API_BASE}/ecommerce/categories`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'cat_1', name: 'Electronics', slug: 'electronics', count: 10 },
        { id: 'cat_2', name: 'Clothing', slug: 'clothing', count: 5 },
        { id: 'cat_3', name: 'Books', slug: 'books', count: 8 },
      ],
    });
  }),

  // Dashboard Stats
  http.get(`${API_BASE}/ecommerce/dashboard/stats`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        todaySales: 1250000,
        todayOrders: 24,
        totalProducts: 156,
        lowStockProducts: 8,
        pendingOrders: 12,
        totalCustomers: 1890,
      },
    });
  }),

  // Error scenarios for testing
  http.get(`${API_BASE}/ecommerce/products/error-test`, () => {
    return HttpResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'TEST_ERROR',
    }, { status: 500 });
  }),
];