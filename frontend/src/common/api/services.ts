import client from './client';

// 인증 관련 API
export const authService = {
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: 'user' | 'seller';
  }) => client.post('/auth/register', data),
  logout: () => client.post('/auth/logout'),
};

// 상품 관련 API
export const productService = {
  getProducts: (params?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }) => client.get('/products', { params }),
  getProduct: (id: number) => client.get(`/products/${id}`),
  createProduct: (data: {
    name: string;
    price: number;
    stock: number;
    description: string;
    image: string;
  }) => client.post('/products', data),
  updateProduct: (id: number, data: Partial<{
    name: string;
    price: number;
    stock: number;
    description: string;
    image: string;
  }>) => client.put(`/products/${id}`, data),
  deleteProduct: (id: number) => client.delete(`/products/${id}`),
};

// 주문 관련 API
export const orderService = {
  getOrders: () => client.get('/orders'),
  getOrder: (id: number) => client.get(`/orders/${id}`),
  createOrder: (data: {
    items: Array<{
      productId: number;
      quantity: number;
    }>;
    shippingInfo: {
      name: string;
      phone: string;
      address: string;
      postalCode: string;
    };
  }) => client.post('/orders', data),
  cancelOrder: (id: number) => client.post(`/orders/${id}/cancel`),
  updateOrderStatus: (id: number, status: string) =>
    client.put(`/orders/${id}/status`, { status }),
};

// 결제 관련 API
export const paymentService = {
  processPayment: (data: {
    orderId: number;
    amount: number;
    method: 'credit' | 'bank' | 'mobile';
    paymentInfo: {
      cardNumber?: string;
      expiryDate?: string;
      cvv?: string;
      bankName?: string;
      accountNumber?: string;
      phoneNumber?: string;
    };
  }) => client.post('/payments', data),
};

// 리뷰 관련 API
export const reviewService = {
  getReviews: (productId: number) =>
    client.get(`/products/${productId}/reviews`),
  createReview: (productId: number, data: {
    rating: number;
    content: string;
  }) => client.post(`/products/${productId}/reviews`, data),
  updateReview: (productId: number, reviewId: number, data: {
    rating: number;
    content: string;
  }) => client.put(`/products/${productId}/reviews/${reviewId}`, data),
  deleteReview: (productId: number, reviewId: number) =>
    client.delete(`/products/${productId}/reviews/${reviewId}`),
};

// Q&A 관련 API
export const qnaService = {
  getQuestions: (productId: number) =>
    client.get(`/products/${productId}/questions`),
  createQuestion: (productId: number, data: {
    content: string;
  }) => client.post(`/products/${productId}/questions`, data),
  createAnswer: (productId: number, questionId: number, data: {
    content: string;
  }) => client.post(
    `/products/${productId}/questions/${questionId}/answer`,
    data
  ),
  updateAnswer: (productId: number, questionId: number, answerId: number, data: {
    content: string;
  }) => client.put(
    `/products/${productId}/questions/${questionId}/answer/${answerId}`,
    data
  ),
  deleteAnswer: (productId: number, questionId: number, answerId: number) =>
    client.delete(
      `/products/${productId}/questions/${questionId}/answer/${answerId}`
    ),
}; 