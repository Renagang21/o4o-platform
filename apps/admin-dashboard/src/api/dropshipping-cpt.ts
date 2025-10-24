import { authClient } from '@o4o/auth-client';

// Product API
export const dropshippingAPI = {
  // Get all products
  getProducts: async () => {
    const response = await authClient.api.get('/products');
    return { success: true, data: response.data.data || [] };
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
    // Transform WordPress format to new API format
    const newData = {
      name: data.title,
      description: data.content || '',
      price: data.acf?.selling_price || 0,
      costPrice: data.acf?.cost_price || 0,
      sku: data.acf?.supplier_sku || '',
      supplierId: data.acf?.supplier || null,
      stock: 100, // Default stock
      category: 'general',
      status: 'active'
    };
    const response = await authClient.api.post('/products', newData);
    return { success: true, data: response.data };
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
    // Transform WordPress format to new API format
    const updateData: any = {};
    if (data.title) updateData.name = data.title;
    if (data.content) updateData.description = data.content;
    if (data.acf?.selling_price) updateData.price = data.acf.selling_price;
    if (data.acf?.cost_price) updateData.costPrice = data.acf.cost_price;
    if (data.acf?.supplier_sku) updateData.sku = data.acf.supplier_sku;
    if (data.acf?.supplier) updateData.supplierId = data.acf.supplier;

    const response = await authClient.api.put(`/products/${id}`, updateData);
    return { success: true, data: response.data };
  },

  // Delete product
  deleteProduct: async (id: string) => {
    const response = await authClient.api.delete(`/products/${id}`);
    return { success: true, data: response.data };
  },

  // Calculate margin
  calculateMargin: async (cost_price: number, selling_price: number) => {
    const response = await authClient.api.post('/admin/dropshipping/calculate-margin', {
      cost_price,
      selling_price
    });
    return response.data;
  },

  // Initialize CPTs and ACF
  initializeCPTs: async () => {
    const response = await authClient.api.post('/admin/dropshipping/initialize');
    return response.data;
  },

  // Partner API
  getPartners: async () => {
    const response = await authClient.api.get('/partners');
    return { success: true, data: response.data.data || [] };
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
    // Transform WordPress format to new API format
    const newData = {
      name: data.title,
      description: data.content || '',
      type: data.acf?.partner_type || 'individual',
      tier: data.acf?.partner_grade || 'bronze',
      commissionRate: data.acf?.partner_commission_rate || 5,
      status: 'active'
    };
    const response = await authClient.api.post('/partners', newData);
    return { success: true, data: response.data };
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
    // Transform WordPress format to new API format
    const updateData: any = {};
    if (data.title) updateData.name = data.title;
    if (data.content) updateData.description = data.content;
    if (data.acf?.partner_type) updateData.type = data.acf.partner_type;
    if (data.acf?.partner_grade) updateData.tier = data.acf.partner_grade;
    if (data.acf?.partner_commission_rate) updateData.commissionRate = data.acf.partner_commission_rate;

    const response = await authClient.api.put(`/partners/${id}`, updateData);
    return { success: true, data: response.data };
  },

  deletePartner: async (id: string) => {
    const response = await authClient.api.delete(`/partners/${id}`);
    return { success: true, data: response.data };
  },

  // Supplier API
  getSuppliers: async () => {
    const response = await authClient.api.get('/admin/dropshipping/suppliers');
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
    const response = await authClient.api.post('/admin/dropshipping/suppliers', data);
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
    const response = await authClient.api.put(`/admin/dropshipping/suppliers/${id}`, data);
    return response.data;
  },

  deleteSupplier: async (id: string) => {
    const response = await authClient.api.delete(`/admin/dropshipping/suppliers/${id}`);
    return response.data;
  },

  // Order API
  getOrders: async (status?: string) => {
    const params = status ? `?status=${status}` : '';
    const response = await authClient.api.get(`/orders${params}`);
    return { success: true, data: response.data.data || [] };
  },

  getOrder: async (id: string) => {
    const response = await authClient.api.get(`/orders/${id}`);
    return { success: true, data: response.data };
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
    // Transform WordPress format to new API format
    const newData = {
      customerId: data.customer_id,
      customerName: data.customer_name,
      customerEmail: data.customer_email,
      items: data.items.map(item => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        price: item.price,
        sellerId: item.seller_id,
        sellerName: item.seller_name
      })),
      shippingFee: data.shipping_fee,
      paymentMethod: data.payment_method,
      shippingAddress: data.shipping_address ? {
        street: data.shipping_address.street,
        city: data.shipping_address.city,
        state: data.shipping_address.state,
        zipCode: data.shipping_address.zip,
        country: data.shipping_address.country
      } : undefined
    };
    const response = await authClient.api.post('/orders', newData);
    return { success: true, data: response.data };
  },

  updateOrderStatus: async (id: string, status: string) => {
    const response = await authClient.api.patch(`/orders/${id}/status`, { status });
    return { success: true, data: response.data };
  },

  deleteOrder: async (id: string) => {
    const response = await authClient.api.delete(`/orders/${id}`);
    return { success: true, data: response.data };
  },

  // Settlement API
  getSettlements: async (status?: string, type?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    const queryString = params.toString();
    const response = await authClient.api.get(`/admin/dropshipping/settlements${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  getSettlement: async (id: string) => {
    const response = await authClient.api.get(`/admin/dropshipping/settlements/${id}`);
    return response.data;
  },

  updateSettlementStatus: async (id: string, status: string) => {
    const response = await authClient.api.patch(`/admin/dropshipping/settlements/${id}/status`, { status });
    return response.data;
  },

  processSettlement: async (id: string) => {
    const response = await authClient.api.post(`/admin/dropshipping/settlements/${id}/process`);
    return response.data;
  },

  createSettlement: async (data: {
    order_id?: string;
    seller_id?: string;
    partner_id?: string;
    amount: number;
    commission_rate: number;
    bank_name: string;
    account_number: string;
    account_holder: string;
  }) => {
    const response = await authClient.api.post('/admin/dropshipping/settlements', data);
    return response.data;
  }
};