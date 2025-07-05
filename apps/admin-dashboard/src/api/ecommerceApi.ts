import { apiClient } from './client'
import { 
  Product, 
  Order, 
  Customer, 
  Coupon, 
  InventoryItem,
  StockMovement,
  ProductFilters,
  OrderFilters,
  BulkProductAction,
  BulkOrderAction,
  SalesReport,
  ProductAnalytics,
  ProductCategory,
  ProductTag,
  EcommerceSettings
} from '@/types/ecommerce'
import { ApiResponse, PaginatedResponse } from '@/types'

export class EcommerceApi {
  // Products
  static async getProducts(
    page = 1,
    limit = 20,
    filters: ProductFilters = {}
  ): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      )
    })

    const response = await apiClient.get(`/ecommerce/products?${params}`)
    return response.data
  }

  static async getProduct(productId: string): Promise<ApiResponse<Product>> {
    const response = await apiClient.get(`/ecommerce/products/${productId}`)
    return response.data
  }

  static async createProduct(productData: Partial<Product>): Promise<ApiResponse<Product>> {
    const response = await apiClient.post('/ecommerce/products', productData)
    return response.data
  }

  static async updateProduct(productId: string, productData: Partial<Product>): Promise<ApiResponse<Product>> {
    const response = await apiClient.put(`/ecommerce/products/${productId}`, productData)
    return response.data
  }

  static async deleteProduct(productId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/ecommerce/products/${productId}`)
    return response.data
  }

  static async bulkProductAction(action: BulkProductAction): Promise<ApiResponse<void>> {
    const response = await apiClient.post('/ecommerce/products/bulk', action)
    return response.data
  }

  static async duplicateProduct(productId: string): Promise<ApiResponse<Product>> {
    const response = await apiClient.post(`/ecommerce/products/${productId}/duplicate`)
    return response.data
  }

  // Product Categories
  static async getCategories(): Promise<ApiResponse<ProductCategory[]>> {
    const response = await apiClient.get('/ecommerce/categories')
    return response.data
  }

  static async createCategory(categoryData: Partial<ProductCategory>): Promise<ApiResponse<ProductCategory>> {
    const response = await apiClient.post('/ecommerce/categories', categoryData)
    return response.data
  }

  static async updateCategory(categoryId: string, categoryData: Partial<ProductCategory>): Promise<ApiResponse<ProductCategory>> {
    const response = await apiClient.put(`/ecommerce/categories/${categoryId}`, categoryData)
    return response.data
  }

  static async deleteCategory(categoryId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/ecommerce/categories/${categoryId}`)
    return response.data
  }

  // Product Tags
  static async getTags(): Promise<ApiResponse<ProductTag[]>> {
    const response = await apiClient.get('/ecommerce/tags')
    return response.data
  }

  static async createTag(tagData: Partial<ProductTag>): Promise<ApiResponse<ProductTag>> {
    const response = await apiClient.post('/ecommerce/tags', tagData)
    return response.data
  }

  // Orders
  static async getOrders(
    page = 1,
    limit = 20,
    filters: OrderFilters = {}
  ): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      )
    })

    const response = await apiClient.get(`/ecommerce/orders?${params}`)
    return response.data
  }

  static async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    const response = await apiClient.get(`/ecommerce/orders/${orderId}`)
    return response.data
  }

  static async updateOrderStatus(orderId: string, status: string, note?: string): Promise<ApiResponse<Order>> {
    const response = await apiClient.put(`/ecommerce/orders/${orderId}/status`, { status, note })
    return response.data
  }

  static async refundOrder(
    orderId: string, 
    amount: number, 
    reason?: string,
    items?: Array<{ orderItemId: string; quantity: number; amount: number }>
  ): Promise<ApiResponse<void>> {
    const response = await apiClient.post(`/ecommerce/orders/${orderId}/refund`, {
      amount,
      reason,
      items
    })
    return response.data
  }

  static async bulkOrderAction(action: BulkOrderAction): Promise<ApiResponse<void>> {
    const response = await apiClient.post('/ecommerce/orders/bulk', action)
    return response.data
  }

  // Customers
  static async getCustomers(
    page = 1,
    limit = 20,
    search?: string
  ): Promise<PaginatedResponse<Customer>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })

    if (search) {
      params.append('search', search)
    }

    const response = await apiClient.get(`/ecommerce/customers?${params}`)
    return response.data
  }

  static async getCustomer(customerId: string): Promise<ApiResponse<Customer>> {
    const response = await apiClient.get(`/ecommerce/customers/${customerId}`)
    return response.data
  }

  static async getCustomerOrders(customerId: string): Promise<ApiResponse<Order[]>> {
    const response = await apiClient.get(`/ecommerce/customers/${customerId}/orders`)
    return response.data
  }

  // Coupons
  static async getCoupons(page = 1, limit = 20): Promise<PaginatedResponse<Coupon>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })

    const response = await apiClient.get(`/ecommerce/coupons?${params}`)
    return response.data
  }

  static async getCoupon(_id: string): Promise<ApiResponse<Coupon>> {
    const response = await apiClient.get(`/ecommerce/coupons/${_id}`)
    return response.data
  }

  static async createCoupon(couponData: Partial<Coupon>): Promise<ApiResponse<Coupon>> {
    const response = await apiClient.post('/ecommerce/coupons', couponData)
    return response.data
  }

  static async updateCoupon(couponId: string, couponData: Partial<Coupon>): Promise<ApiResponse<Coupon>> {
    const response = await apiClient.put(`/ecommerce/coupons/${couponId}`, couponData)
    return response.data
  }

  static async deleteCoupon(couponId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/ecommerce/coupons/${couponId}`)
    return response.data
  }

  // Inventory
  static async getInventory(
    page = 1,
    limit = 20,
    lowStock?: boolean
  ): Promise<PaginatedResponse<InventoryItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })

    if (lowStock) {
      params.append('lowStock', 'true')
    }

    const response = await apiClient.get(`/ecommerce/inventory?${params}`)
    return response.data
  }

  static async updateStock(
    productId: string, 
    quantity: number, 
    type: 'set' | 'increase' | 'decrease',
    note?: string
  ): Promise<ApiResponse<void>> {
    const response = await apiClient.put(`/ecommerce/inventory/${productId}`, {
      quantity,
      type,
      note
    })
    return response.data
  }

  static async getStockMovements(
    productId?: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<StockMovement>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })

    if (productId) {
      params.append('productId', productId)
    }

    const response = await apiClient.get(`/ecommerce/stock-movements?${params}`)
    return response.data
  }

  // Reports and Analytics
  static async getSalesReport(
    period: 'today' | 'week' | 'month' | 'year' | 'custom',
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<SalesReport>> {
    const params = new URLSearchParams({ period })
    
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await apiClient.get(`/ecommerce/reports/sales?${params}`)
    return response.data
  }

  static async getProductAnalytics(
    productId?: string,
    period = 'month'
  ): Promise<ApiResponse<ProductAnalytics | ProductAnalytics[]>> {
    const params = new URLSearchParams({ period })
    
    const endpoint = productId 
      ? `/ecommerce/reports/products/${productId}?${params}`
      : `/ecommerce/reports/products?${params}`

    const response = await apiClient.get(endpoint)
    return response.data
  }

  static async getDashboardStats(): Promise<ApiResponse<{
    todaySales: number
    todayOrders: number
    totalProducts: number
    lowStockProducts: number
    pendingOrders: number
    totalCustomers: number
  }>> {
    const response = await apiClient.get('/ecommerce/dashboard/stats')
    return response.data
  }

  // Settings
  static async getSettings(): Promise<ApiResponse<EcommerceSettings>> {
    const response = await apiClient.get('/ecommerce/settings')
    return response.data
  }

  static async updateSettings(settings: Partial<EcommerceSettings>): Promise<ApiResponse<EcommerceSettings>> {
    const response = await apiClient.put('/ecommerce/settings', settings)
    return response.data
  }


  // Points System
  static async getPointsOverview(): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: {
        totalPoints: 0,
        activeUsers: 0,
        pendingRewards: 0
      },
      message: 'Points overview retrieved successfully'
    }
  }

  static async getTopPointsUsers(): Promise<ApiResponse<any[]>> {
    // Mock implementation
    return {
      success: true,
      data: [],
      message: 'Top points users retrieved successfully'
    }
  }

  static async getPointsTransactions(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    // Mock implementation
    return {
      data: [],
      pagination: {
        current: page,
        total: 0,
        count: limit,
        totalItems: 0
      }
    }
  }

  static async getPointsRewards(): Promise<ApiResponse<any[]>> {
    // Mock implementation
    return {
      success: true,
      data: [],
      message: 'Points rewards retrieved successfully'
    }
  }

  static async createPointsReward(reward: any): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: { ...reward, id: Date.now().toString() },
      message: 'Points reward created successfully'
    }
  }

  static async updatePointsReward(id: string, reward: any): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: { ...reward, id },
      message: 'Points reward updated successfully'
    }
  }

  static async deletePointsReward(_id: string): Promise<ApiResponse<void>> {
    // Mock implementation
    return {
      success: true,
      data: undefined,
      message: 'Points reward deleted successfully'
    }
  }

  static async getPointsPolicy(): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: {
        pointsPerDollar: 1,
        minimumRedemption: 100,
        expirationDays: 365
      },
      message: 'Points policy retrieved successfully'
    }
  }

  static async updatePointsPolicy(policy: any): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: policy,
      message: 'Points policy updated successfully'
    }
  }

  static async exportPointsTransactions(_filters: any): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: { downloadUrl: '/exports/points-transactions.csv' },
      message: 'Points transactions exported successfully'
    }
  }

  // Settings
  static async getGeneralSettings(): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: {
        storeName: 'O4O Store',
        storeAddress: '',
        currency: 'KRW',
        timezone: 'Asia/Seoul'
      },
      message: 'General settings retrieved successfully'
    }
  }

  static async getPaymentSettings(): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: {
        methods: [],
        defaultMethod: 'stripe'
      },
      message: 'Payment settings retrieved successfully'
    }
  }

  static async testPaymentProvider(provider: string): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: { status: 'connected' },
      message: `${provider} connection test successful`
    }
  }

  static async getShippingSettings(): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: {
        zones: [],
        methods: []
      },
      message: 'Shipping settings retrieved successfully'
    }
  }

  static async updateShippingSettings(settings: any): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: settings,
      message: 'Shipping settings updated successfully'
    }
  }

  // Media Upload
  static async uploadMedia(file: File): Promise<ApiResponse<{ id: string; url: string; filename: string }>> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post('/ecommerce/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }

  // Export
  static async exportProducts(filters: ProductFilters = {}): Promise<Blob> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      )
    )

    const response = await apiClient.get(`/ecommerce/products/export?${params}`, {
      responseType: 'blob'
    })
    return response.data
  }

  static async exportOrders(filters: OrderFilters = {}): Promise<Blob> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      )
    )

    const response = await apiClient.get(`/ecommerce/orders/export?${params}`, {
      responseType: 'blob'
    })
    return response.data
  }

  // Coupon Banner methods
  static async getCouponBanners(): Promise<ApiResponse<any[]>> {
    // Mock implementation
    return {
      success: true,
      data: [],
      message: 'Coupon banners retrieved successfully'
    }
  }

  static async createCouponBanner(banner: any): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: { ...banner, id: Date.now().toString() },
      message: 'Coupon banner created successfully'
    }
  }

  static async updateCouponBanner(id: string, banner: any): Promise<ApiResponse<any>> {
    // Mock implementation
    return {
      success: true,
      data: { ...banner, id },
      message: 'Coupon banner updated successfully'
    }
  }

  static async deleteCouponBanner(_id: string): Promise<ApiResponse<void>> {
    // Mock implementation
    return {
      success: true,
      data: undefined,
      message: 'Coupon banner deleted successfully'
    }
  }

  // Coupon Usage methods
  static async getCouponUsage(): Promise<ApiResponse<any[]>> {
    // Mock implementation
    return {
      success: true,
      data: [],
      message: 'Coupon usage data retrieved successfully'
    }
  }
}