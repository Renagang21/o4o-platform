import api from './client';

// Product API
export const dropshippingAPI = {
  // Get all products
  getProducts: async () => {
    const response = await api.get('/api/v1/dropshipping/products');
    return response.data;
  },

  // Create product
  createProduct: async (data: {
    title: string;
    content?: string;
    excerpt?: string;
    acf?: {
      cost_price?: number;
      selling_price?: number;
      can_modify_price?: boolean;
      supplier?: string;
      supplier_sku?: string;
      shipping_days_min?: number;
      shipping_days_max?: number;
      shipping_fee?: number;
    };
  }) => {
    const response = await api.post('/api/v1/dropshipping/products', data);
    return response.data;
  },

  // Update product
  updateProduct: async (id: string, data: {
    title?: string;
    content?: string;
    excerpt?: string;
    acf?: {
      cost_price?: number;
      selling_price?: number;
      can_modify_price?: boolean;
      supplier?: string;
      supplier_sku?: string;
      shipping_days_min?: number;
      shipping_days_max?: number;
      shipping_fee?: number;
    };
  }) => {
    const response = await api.put(`/api/v1/dropshipping/products/${id}`, data);
    return response.data;
  },

  // Delete product
  deleteProduct: async (id: string) => {
    const response = await api.delete(`/api/v1/dropshipping/products/${id}`);
    return response.data;
  },

  // Calculate margin
  calculateMargin: async (cost_price: number, selling_price: number) => {
    const response = await api.post('/api/v1/dropshipping/calculate-margin', {
      cost_price,
      selling_price
    });
    return response.data;
  },

  // Initialize CPTs and ACF
  initializeCPTs: async () => {
    const response = await api.post('/api/v1/dropshipping/initialize');
    return response.data;
  },

  // Partner API
  getPartners: async () => {
    const response = await api.get('/api/v1/dropshipping/partners');
    return response.data;
  },

  createPartner: async (data: {
    title: string;
    content?: string;
    acf?: {
      partner_type?: 'individual' | 'business';
      partner_grade?: 'bronze' | 'silver' | 'gold' | 'platinum';
      partner_commission_rate?: number;
    };
  }) => {
    const response = await api.post('/api/v1/dropshipping/partners', data);
    return response.data;
  },

  updatePartner: async (id: string, data: {
    title?: string;
    content?: string;
    acf?: {
      partner_type?: 'individual' | 'business';
      partner_grade?: 'bronze' | 'silver' | 'gold' | 'platinum';
      partner_commission_rate?: number;
    };
  }) => {
    const response = await api.put(`/api/v1/dropshipping/partners/${id}`, data);
    return response.data;
  },

  deletePartner: async (id: string) => {
    const response = await api.delete(`/api/v1/dropshipping/partners/${id}`);
    return response.data;
  },

  // Supplier API
  getSuppliers: async () => {
    const response = await api.get('/api/v1/dropshipping/suppliers');
    return response.data;
  },

  createSupplier: async (data: {
    title: string;
    content?: string;
    acf?: {
      supplier_email?: string;
      supplier_phone?: string;
      supplier_business_number?: string;
      supplier_api_key?: string;
      supplier_api_endpoint?: string;
    };
  }) => {
    const response = await api.post('/api/v1/dropshipping/suppliers', data);
    return response.data;
  },

  updateSupplier: async (id: string, data: {
    title?: string;
    content?: string;
    acf?: {
      supplier_email?: string;
      supplier_phone?: string;
      supplier_business_number?: string;
      supplier_api_key?: string;
      supplier_api_endpoint?: string;
    };
  }) => {
    const response = await api.put(`/api/v1/dropshipping/suppliers/${id}`, data);
    return response.data;
  },

  deleteSupplier: async (id: string) => {
    const response = await api.delete(`/api/v1/dropshipping/suppliers/${id}`);
    return response.data;
  },

  // Order API
  getOrders: async (status?: string) => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/api/v1/dropshipping/orders${params}`);
    return response.data;
  },

  getOrder: async (id: string) => {
    const response = await api.get(`/api/v1/dropshipping/orders/${id}`);
    return response.data;
  },

  createOrder: async (data: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      price: number;
      seller_id: string;
      seller_name: string;
    }>;
    shipping_fee: number;
    payment_method: string;
    shipping_address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  }) => {
    const response = await api.post('/api/v1/dropshipping/orders', data);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string) => {
    const response = await api.patch(`/api/v1/dropshipping/orders/${id}/status`, { status });
    return response.data;
  },

  deleteOrder: async (id: string) => {
    const response = await api.delete(`/api/v1/dropshipping/orders/${id}`);
    return response.data;
  }
};