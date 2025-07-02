// WooCommerce-style E-commerce types
export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  sku: string
  
  // Pricing (role-based)
  retailPrice: number
  wholesalePrice?: number
  affiliatePrice?: number
  cost?: number
  
  // Inventory
  stockQuantity: number
  manageStock: boolean
  lowStockThreshold?: number
  stockStatus: 'instock' | 'outofstock' | 'onbackorder'
  
  // Product attributes
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  
  // Status and settings
  status: 'draft' | 'published' | 'private' | 'trash'
  type: 'simple' | 'variable' | 'grouped' | 'external'
  featured: boolean
  virtual: boolean
  downloadable: boolean
  
  // Media
  images: ProductImage[]
  featuredImage?: string
  gallery?: string[]
  
  // Categorization
  categories: ProductCategory[]
  tags: ProductTag[]
  attributes: ProductAttribute[]
  
  // SEO
  metaTitle?: string
  metaDescription?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  createdBy: string
  
  // Stats
  totalSales: number
  averageRating: number
  reviewCount: number
}

export interface ProductImage {
  id: string
  url: string
  alt?: string
  sortOrder: number
}

export interface ProductCategory {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  parent?: string
  count: number
}

export interface ProductTag {
  id: string
  name: string
  slug: string
  count: number
}

export interface ProductAttribute {
  id: string
  name: string
  slug: string
  type: 'select' | 'text' | 'number' | 'color' | 'image'
  values: string[]
  visible: boolean
  variation: boolean
  sortOrder: number
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  
  // Customer info
  customerId: string
  customerName: string
  customerEmail: string
  
  // Pricing
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  
  // Items
  items: OrderItem[]
  
  // Addresses
  billingAddress: Address
  shippingAddress: Address
  
  // Payment
  paymentMethod: string
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'
  transactionId?: string
  
  // Shipping
  shippingMethod: string
  trackingNumber?: string
  
  // Notes
  customerNote?: string
  adminNote?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  completedAt?: string
  
  // Refunds
  refunds: OrderRefund[]
}

export type OrderStatus = 
  | 'pending'
  | 'processing' 
  | 'on-hold'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed'

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productSku: string
  variationId?: string
  quantity: number
  price: number
  total: number
  tax: number
  meta?: OrderItemMeta[]
}

export interface OrderItemMeta {
  key: string
  value: string
  displayKey?: string
  displayValue?: string
}

export interface Address {
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string
  email?: string
}

export interface OrderRefund {
  id: string
  amount: number
  reason?: string
  refundedBy: string
  refundedAt: string
  items: {
    orderItemId: string
    quantity: number
    amount: number
  }[]
}

export interface Customer {
  id: string
  email: string
  firstName: string
  lastName: string
  username?: string
  
  // Role and status
  role: 'customer' | 'business' | 'affiliate'
  status: 'active' | 'inactive' | 'pending'
  
  // Business info (for business customers)
  businessInfo?: {
    businessName: string
    businessType: string
    businessNumber: string
    taxId?: string
  }
  
  // Addresses
  billingAddress?: Address
  shippingAddress?: Address
  
  // Stats
  totalSpent: number
  orderCount: number
  averageOrderValue: number
  lastOrderDate?: string
  
  // Preferences
  marketingOptIn: boolean
  language: string
  currency: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface Coupon {
  id: string
  code: string
  description?: string
  
  // Discount
  discountType: 'percent' | 'fixed_cart' | 'fixed_product'
  amount: number
  
  // Restrictions
  minimumAmount?: number
  maximumAmount?: number
  productIds?: string[]
  categoryIds?: string[]
  customerIds?: string[]
  usageLimitPerCoupon?: number
  usageLimitPerCustomer?: number
  
  // Dates
  dateExpires?: string
  
  // Settings
  individualUse: boolean
  excludeSaleItems: boolean
  
  // Stats
  usageCount: number
  
  // Timestamps
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface InventoryItem {
  productId: string
  productName: string
  sku: string
  stockQuantity: number
  stockStatus: 'instock' | 'outofstock' | 'onbackorder'
  lowStockThreshold?: number
  manageStock: boolean
  backorders: 'no' | 'notify' | 'yes'
  soldIndividually: boolean
  
  // Movement tracking
  lastMovement?: {
    type: 'sale' | 'restock' | 'adjustment' | 'return'
    quantity: number
    note?: string
    date: string
  }
}

export interface StockMovement {
  id: string
  productId: string
  type: 'sale' | 'restock' | 'adjustment' | 'return'
  quantity: number
  previousStock: number
  newStock: number
  note?: string
  orderId?: string
  userId: string
  createdAt: string
}

// Filter and search interfaces
export interface ProductFilters {
  status?: string
  type?: string
  category?: string
  tag?: string
  stockStatus?: string
  featured?: boolean
  search?: string
  priceMin?: number
  priceMax?: number
  sortBy?: 'name' | 'price' | 'date' | 'sales' | 'rating'
  sortOrder?: 'asc' | 'desc'
}

export interface OrderFilters {
  status?: OrderStatus
  paymentStatus?: string
  customer?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  sortBy?: 'date' | 'total' | 'status'
  sortOrder?: 'asc' | 'desc'
}

// Analytics and reports
export interface SalesReport {
  period: string
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  netSales: number
  totalTax: number
  totalShipping: number
  totalRefunds: number
  totalDiscount: number
  
  // Charts data
  salesByDay: Array<{
    date: string
    sales: number
    orders: number
  }>
  
  topProducts: Array<{
    productId: string
    productName: string
    quantity: number
    sales: number
  }>
  
  topCategories: Array<{
    categoryId: string
    categoryName: string
    sales: number
    orders: number
  }>
}

export interface ProductAnalytics {
  productId: string
  views: number
  sales: number
  revenue: number
  conversionRate: number
  averageRating: number
  reviewCount: number
  returnRate: number
  stockTurnover: number
}

// Bulk operations
export interface BulkProductAction {
  action: 'delete' | 'update_status' | 'update_price' | 'update_stock' | 'add_category' | 'remove_category'
  productIds: string[]
  data?: {
    status?: string
    price?: number
    stockQuantity?: number
    categoryId?: string
  }
}

export interface BulkOrderAction {
  action: 'update_status' | 'delete' | 'export'
  orderIds: string[]
  data?: {
    status?: OrderStatus
    note?: string
  }
}

// Settings
export interface WooCommerceSettings {
  general: {
    storeName: string
    storeAddress: Address
    currency: string
    currencyPosition: 'left' | 'right' | 'left_space' | 'right_space'
    priceDecimalSeparator: string
    priceThousandSeparator: string
    priceDecimals: number
  }
  
  products: {
    shopPageDisplay: 'products' | 'categories' | 'both'
    defaultProductSorting: string
    enableReviews: boolean
    enableStarRating: boolean
    enableGallery: boolean
    enableZoom: boolean
  }
  
  inventory: {
    manageStock: boolean
    holdStock: number
    notifications: {
      lowStock: boolean
      outOfStock: boolean
    }
    hideOutOfStock: boolean
  }
  
  shipping: {
    enableShipping: boolean
    enableShippingCalculator: boolean
    hideShippingUntilAddress: boolean
    defaultLocation: string
  }
  
  tax: {
    enableTax: boolean
    pricesIncludeTax: boolean
    calculateTaxBased: 'shipping' | 'billing' | 'shop'
    shippingTaxClass: string
    roundingMode: 'disabled' | 'up' | 'down'
  }
}

// Missing types for admin-dashboard
export interface CouponBanner {
  id: string
  title: string
  description?: string
  bannerType: 'popup' | 'banner' | 'sticky'
  isActive: boolean
  position?: 'top' | 'bottom' | 'center'
  displayConditions?: string[]
  views?: number
  clicks?: number
  createdAt: string
  updatedAt: string
}

export interface CouponUsage {
  couponId: string
  customerId: string
  orderId: string
  usageDate: string
  discountAmount: number
}

export interface PointsOverview {
  totalPoints: number
  pointsSpent: number
  pointsEarned: number
  activeUsers: number
}

export interface UserPoints {
  userId: string
  balance: number
  totalEarned: number
  totalSpent: number
  lastTransactionDate?: string
}

export interface PointTransaction {
  id: string
  userId: string
  amount: number
  type: 'earned' | 'spent' | 'expired'
  description: string
  orderId?: string
  transactionDate: string
}

export interface PointsReward {
  id: string
  name: string
  description?: string
  pointsCost: number
  rewardType: 'discount' | 'product' | 'shipping'
  rewardValue: number
  isActive: boolean
  expiryDate?: string
}

export interface PointsPolicy {
  earnRate: number // points per dollar spent
  minimumRedemption: number
  expiryDays?: number
  signupBonus?: number
  referralBonus?: number
  reviewBonus?: number
}

export interface TaxSettings {
  enabled: boolean
  pricesIncludeTax: boolean
  calculateBasedOn: 'shipping' | 'billing' | 'shop'
  shippingTaxClass: string
  rounding: 'disabled' | 'up' | 'down'
  displayPrices: 'including' | 'excluding' | 'both'
}

export interface TaxRate {
  id: string
  country: string
  state?: string
  city?: string
  postcode?: string
  rate: number
  name: string
  priority: number
  compound: boolean
  shipping: boolean
}

export interface PaymentMethod {
  id: string
  title: string
  description?: string
  enabled: boolean
  settings: Record<string, any>
}

export interface PaymentSettings {
  methods: PaymentMethod[]
  defaultMethod?: string
  enableGuestCheckout: boolean
  forceSSL: boolean
}

export interface ShippingZone {
  id: string
  name: string
  locations: string[]
  methods: ShippingMethod[]
  order: number
}

export interface ShippingMethod {
  id: string
  title: string
  methodType: 'flat_rate' | 'free_shipping' | 'local_pickup'
  cost?: number
  enabled: boolean
  settings: Record<string, any>
}

export interface ShippingSettings {
  zones: ShippingZone[]
  enableShipping: boolean
  enableCalculator: boolean
  hideUntilAddress: boolean
  defaultLocation: string
}

export interface GeneralSettings {
  storeName: string
  storeAddress: Address
  defaultCountry: string
  defaultCurrency: string
  currencyPosition: 'left' | 'right' | 'left_space' | 'right_space'
  thousandSeparator: string
  decimalSeparator: string
  numberOfDecimals: number
}

// Additional utility types (already defined above)
export type ProductType = 'simple' | 'variable' | 'grouped' | 'external'
export type ProductStatus = 'draft' | 'published' | 'private' | 'trash'