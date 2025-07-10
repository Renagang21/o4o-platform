import { http, HttpResponse } from 'msw'

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'customer',
        },
        token: 'mock-jwt-token',
      },
    })
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 2,
          email: 'newuser@example.com',
          name: 'New User',
          role: 'customer',
        },
      },
    })
  }),

  http.get('/api/auth/profile', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer',
      },
    })
  }),

  // Products endpoints
  http.get('/api/ecommerce/products', () => {
    return HttpResponse.json({
      success: true,
      data: {
        products: [
          {
            id: 1,
            name: 'Test Product 1',
            description: 'Test Description 1',
            retailPrice: 100,
            wholesalePrice: 80,
            affiliatePrice: 90,
            stock: 50,
            category: 'electronics',
          },
          {
            id: 2,
            name: 'Test Product 2',
            description: 'Test Description 2',
            retailPrice: 200,
            wholesalePrice: 160,
            affiliatePrice: 180,
            stock: 30,
            category: 'clothing',
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
      },
    })
  }),

  http.get('/api/ecommerce/products/:id', ({ params }) => {
    const id = params.id
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(id),
        name: `Test Product ${id}`,
        description: `Test Description ${id}`,
        retailPrice: 100,
        wholesalePrice: 80,
        affiliatePrice: 90,
        stock: 50,
        category: 'electronics',
      },
    })
  }),

  // Cart endpoints
  http.get('/api/ecommerce/cart', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 1,
        items: [
          {
            id: 1,
            productId: 1,
            quantity: 2,
            product: {
              id: 1,
              name: 'Test Product 1',
              retailPrice: 100,
            },
          },
        ],
        total: 200,
      },
    })
  }),

  http.post('/api/ecommerce/cart/items', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 1,
        productId: 1,
        quantity: 1,
      },
    })
  }),

  // Orders endpoints
  http.get('/api/ecommerce/orders', () => {
    return HttpResponse.json({
      success: true,
      data: {
        orders: [
          {
            id: 1,
            status: 'completed',
            total: 200,
            createdAt: '2024-01-01T00:00:00Z',
            items: [
              {
                id: 1,
                productName: 'Test Product 1',
                quantity: 2,
                unitPrice: 100,
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    })
  }),

  http.post('/api/ecommerce/orders', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 2,
        status: 'pending',
        total: 200,
        createdAt: new Date().toISOString(),
      },
    })
  }),
]