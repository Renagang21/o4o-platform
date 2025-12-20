// Re-export user types for compatibility
export * from './user'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'customer' | 'business' | 'affiliate'
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  businessInfo?: {
    businessName: string
    businessType: string
    businessNumber: string
  }
  createdAt: string
  updatedAt: string
  approvedAt?: string
  approvedBy?: string
  // Domain extension properties (WO-DOMAIN-TYPE-EXTENSION)
  organizationId?: string
  organizationName?: string
  supplierId?: string
  phone?: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  sku: string
  retailPrice: number
  wholesalePrice?: number
  affiliatePrice?: number
  cost?: number
  stockQuantity: number
  manageStock: boolean
  lowStockThreshold?: number
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  status: 'draft' | 'active' | 'inactive' | 'out_of_stock'
  type: 'physical' | 'digital' | 'service'
  featured: boolean
  requiresShipping: boolean
  images?: string[]
  featuredImage?: string
  categoryId?: string
  tags?: string[]
  metaTitle?: string
  metaDescription?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  total: number
  subtotal: number
  tax: number
  shipping: number
  items: OrderItem[]
  shippingAddress: Address
  billingAddress: Address
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  price: number
  total: number
}

export interface Address {
  name: string
  company?: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string
}

export interface CustomPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  status: 'draft' | 'published' | 'private'
  type: string
  authorId: string
  featuredImage?: string
  metadata?: Record<string, unknown>
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CustomPostType {
  id: string
  name: string
  slug: string
  description?: string
  public: boolean
  hierarchical: boolean
  supports: string[]
  taxonomies: string[]
  fields?: CustomField[]
  createdAt: string
  updatedAt: string
}

export interface CustomField {
  id: string
  name: string
  key: string
  type: 'text' | 'textarea' | 'number' | 'email' | 'url' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'file' | 'image'
  required: boolean
  description?: string
  options?: string[]
  defaultValue?: string | number | boolean | string[]
}

export interface DashboardStats {
  userStats: {
    total: number
    pending: number
    approved: number
    rejected: number
    suspended: number
  }
  productStats: {
    total: number
    active: number
    draft: number
    outOfStock: number
  }
  orderStats: {
    total: number
    pending: number
    processing: number
    completed: number
    revenue: number
  }
  contentStats: {
    total: number
    published: number
    draft: number
  }
}

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  totalPages?: number
  pagination: {
    current: number
    total: number
    count: number
    totalItems: number
  }
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
}

// Phase PD-7: Notification types
export type NotificationChannel = 'in_app' | 'email'

export type NotificationType =
  | 'order.new'
  | 'order.status_changed'
  | 'settlement.new_pending'
  | 'settlement.paid'
  | 'price.changed'
  | 'stock.low'
  | 'role.approved'
  | 'role.application_submitted'
  | 'custom'

export interface Notification {
  id: string
  userId: string
  channel: NotificationChannel
  type: NotificationType
  title: string
  message?: string
  metadata?: Record<string, any>
  isRead: boolean
  createdAt: string
  readAt?: string
}