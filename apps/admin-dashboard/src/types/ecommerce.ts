// Import common types from @o4o/types
import {
  Product as BaseProduct,
  Order as BaseOrder,
  OrderItem as BaseOrderItem,
  OrderStatus as BaseOrderStatus,
  Category as BaseCategory,
  ProductStatus as BaseProductStatus,
  ProductDimensions,
  PaymentStatus,
  PaymentMethod,
  Address as BaseAddress,
  ProductImage
} from '@o4o/types'

// Re-export common types
export type { PaymentStatus }
export type { PaymentMethod }

// Admin-specific enums and types
export type ProductStatus = BaseProductStatus | 'private' | 'trash' | 'published'
export type ProductType = 'simple' | 'variable' | 'grouped' | 'external'

// Admin-specific Product interface extending base
export interface Product extends Omit<BaseProduct, 'status' | 'pricing' | 'inventory' | 'tags' | 'categories' | 'attributes'> {
  // Override status with admin-specific status
  status: ProductStatus
  type: ProductType
  
  // Admin-specific pricing (replacing the base pricing)
  retailPrice: number
  wholesalePrice?: number
  affiliatePrice?: number
  cost?: number
  
  // Additional admin fields - flattened from base inventory for easier admin access
  sku: string
  manageStock: boolean
  stockQuantity: number
  lowStockThreshold?: number
  stockStatus: 'instock' | 'outofstock' | 'onbackorder'
  weight?: number
  dimensions?: ProductDimensions
  
  featured: boolean
  virtual: boolean
  downloadable: boolean
  
  images: ProductImage[]
  featuredImage?: string
  gallery?: string[]
  
  categories: ProductCategory[]
  tags: ProductTag[]
  attributes: ProductAttribute[]
  
  metaTitle?: string
  metaDescription?: string
  
  createdBy: string
  
  totalSales: number
  averageRating: number
  reviewCount: number
}

// ProductImage is imported from @o4o/types

export interface ProductCategory extends BaseCategory {
  image?: string
  count: number
  postCount?: number
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

export interface Order extends Omit<BaseOrder, 'items' | 'shippingAddress' | 'status'> {
  status: OrderStatus
  
  // Admin-specific customer info
  buyerId: string
  buyerName: string
  buyerType: 'customer' | 'business' | 'affiliate'
  customerId: string
  customerName: string
  customerEmail: string
  
  // Override base pricing fields with admin-specific names
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  orderDate: string
  
  items: OrderItem[]
  
  billingAddress: Address
  shippingAddress: Address
  
  // Admin-specific payment fields
  paymentStatus: PaymentStatus
  transactionId?: string
  
  shippingMethod: string
  
  customerNote?: string
  adminNote?: string
  
  updatedAt: string
  completedAt?: string
  
  refunds: OrderRefund[]
}

export type OrderStatus = BaseOrderStatus | 'on-hold' | 'completed' | 'refunded' | 'failed'

export interface OrderItem extends BaseOrderItem {
  productSku: string
  productImage: string
  variationId?: string
  unitPrice: number
  totalPrice: number
  price: number
  total: number
  tax: number
  supplierId: string
  supplierName: string
  meta?: OrderItemMeta[]
}

export interface OrderItemMeta {
  key: string
  value: string
  displayKey?: string
  displayValue?: string
}

export interface Address extends BaseAddress {
  // Additional admin-specific fields
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  postalCode: string
  
  // Satisfy base Address requirements
  recipientName: string
  zipCode: string
  address: string
  detailAddress: string
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
export interface EcommerceSettings {
  general?: GeneralSettings
  payment?: PaymentSettings
  shipping?: ShippingSettings
  tax?: TaxSettings
  
  products?: {
    shopPageDisplay: 'products' | 'categories' | 'both'
    defaultProductSorting: string
    enableReviews: boolean
    enableStarRating: boolean
    enableGallery: boolean
    enableZoom: boolean
  }
  
  inventory?: {
    manageStock: boolean
    holdStock: number
    notifications: {
      lowStock: boolean
      outOfStock: boolean
    }
    hideOutOfStock: boolean
  }
}

// Tax-related types
export interface TaxSettings {
  enableTax: boolean
  pricesIncludeTax: boolean
  taxBasedOn: 'shipping' | 'billing' | 'base'
  shippingTaxClass: string
  roundingMode: 'round' | 'floor' | 'ceil'
  displayTaxTotals: 'single' | 'itemized'
  taxClasses: TaxClass[]
  taxRates: TaxRate[]
  defaultTaxClass: string
}

export interface TaxRate {
  id: string
  country: string
  state?: string
  city?: string
  zipcode?: string
  rate: number
  taxClass: string
  compound: boolean
  shipping: boolean
  priority: number
  isActive: boolean
}

export interface TaxClass {
  id: string
  name: string
  slug: string
  rate: number
}

// Payment-related types  
export interface AdminPaymentMethod {
  id: string
  title: string
  description: string
  enabled: boolean
  supports: string[]
  settings: Record<string, unknown>
}

export interface PaymentSettings {
  testMode: boolean
  methods?: AdminPaymentMethod[]
  enabledMethods: string[]
  providers: Record<string, unknown>
  
  // Payment configuration
  fees: Record<string, { rate: number; fixed: number }>
  defaultMethod: string
  minimumOrderAmount: number
  enablePartialPayment: boolean
  enableInstallment: boolean
  maxInstallmentMonths: number
  installmentOptions: number[]
  currencies: string[]
  
  // URLs and webhooks
  webhookUrl: string
  returnUrl: string
  failUrl: string
}

// Shipping-related types
export interface ShippingZone {
  id: string
  name: string
  description: string
  regions: string[]
  methods: ShippingMethod[]
}

export interface ShippingMethod {
  id: string
  name: string
  description: string
  enabled: boolean
  cost: number
  freeThreshold?: number
  additionalCost?: number
  estimatedDays: string
  icon: string
  conditions?: {
    cutoffTime?: string
    availableRegions?: string[]
  }
}

export interface ShippingSettings {
  enableShipping: boolean
  enableFreeShipping: boolean
  freeShippingThreshold: number
  defaultShippingClass: string
  enableShippingCalculator: boolean
  enablePickup: boolean
  pickupInstructions: string
  zones: ShippingZone[]
  weightRules: Array<{
    maxWeight: number
    cost: number
  }>
  pickup: {
    enabled: boolean
    locations: Array<{
      id: string
      name: string
      address: string
      phone: string
      hours: string
      instructions: string
    }>
  }
}

// General Settings type
export interface GeneralSettings {
  // Store Information
  storeName: string
  storeDescription: string
  storeAddress: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  contactInfo: {
    phone: string
    email: string
    website: string
  }
  businessHours: Record<string, {
    open: string
    close: string
    closed: boolean
  }>

  // Basic Settings
  currency: string
  language: string
  timezone: string
  dateFormat: string
  timeFormat: string

  // Product Settings
  enableInventoryManagement: boolean
  enableReviews: boolean
  enableWishlist: boolean
  requiresLogin: boolean
  showOutOfStock: boolean
  imageSizes: {
    thumbnail: { width: number; height: number }
    catalog: { width: number; height: number }
    single: { width: number; height: number }
  }

  // Order Settings
  orderNumberFormat: string
  defaultOrderStatus: string
  enableGuestCheckout: boolean
  requireOrderNotes: boolean
  autoCompleteOrders: boolean
  orderRetentionDays: number

  // SEO Settings
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  enableSitemap: boolean
  enableRichSnippets: boolean
}

// Coupon Banner interface for promotional banners
export interface CouponBanner {
  id: string
  title: string
  description: string
  couponCode: string
  couponId?: string
  discountType: 'percent' | 'fixed_cart' | 'fixed_product'
  discountAmount: number
  imageUrl?: string
  backgroundColor?: string
  textColor?: string
  buttonText?: string
  buttonColor?: string
  buttonTextColor?: string
  targetAudience?: string
  isActive: boolean
  displayLocation: 'header' | 'footer' | 'sidebar' | 'popup'
  displayPages?: string[]
  position?: string
  startDate?: string
  endDate?: string
  priority: number
  views?: number
  clicks?: number
  createdAt: string
  updatedAt: string
}

// Coupon Usage analytics interface
export interface CouponUsage {
  couponId: string
  usageCount: number
  totalSavings: number
  savings: number  // Added for backwards compatibility
  orderCount: number
  uniqueUsers: number
  conversionRate: number
  lastUsed?: string
}

// Points Overview for loyalty program
export interface PointsOverview {
  totalActivePoints: number
  totalExpiredPoints: number
  totalExpired: number
  totalRedeemedPoints: number
  totalUsed: number
  totalIssued: number
  currentCirculation: number
  totalMembersWithPoints: number
  activeUsers: number
  averagePointsPerMember: number
  averageBalance: number
  monthlyEarnedPoints: number
  monthlyRedeemedPoints: number
  pointsExpiringNext30Days: number
  conversionRate: number
  roi: number
  trends?: {
    issued: { change: number }
    used: { change: number }
    activeUsers: { change: number; users: number }
    circulation: { change: number }
  }
  monthlyData?: Array<{
    month: string
    issued: number
    used: number
  }>
  topUsers?: TopPointsUser[]  // Added for compatibility
  recentTransactions?: PointTransaction[]  // Added for compatibility
}

// User Points for individual user
export interface UserPoints {
  userId: string
  currentBalance: number
  lifetimeEarned: number
  lifetimeRedeemed: number
  pendingPoints: number
  expiringPoints: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  nextTierPoints?: number
  lastEarnedDate?: string
  lastRedeemedDate?: string
  
  // 추가 통계 관련 (Additional Stats)
  tierProgress: number
  lastActivity: string
  totalEarned: number
  totalSpent: number
}


// Top Points User
export interface TopPointsUser {
  userId: string
  userName: string
  userEmail: string
  totalPoints: number
  earnedPoints: number
  redeemedPoints: number
  rank?: number
}

// Point Transaction for tracking point movements
export interface PointTransaction {
  id: string
  userId: string
  type: 'earned' | 'redeemed' | 'expired' | 'refunded' | 'adjusted'
  amount: number
  points: number
  reason: string
  description?: string
  orderId?: string
  rewardId?: string
  balance: number
  expiresAt?: string
  createdAt: string
  createdBy?: string
  metadata?: Record<string, unknown>
  
  // 상태 관련 (Status)
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
}

// Points Reward for redemption options
export interface PointsReward {
  id: string
  name: string
  title: string
  description: string
  pointsCost: number
  costPoints: number
  rewardType: 'discount' | 'product' | 'shipping' | 'custom'
  type: 'discount' | 'product' | 'shipping' | 'custom'
  rewardValue: number
  value: number
  valueType: 'fixed' | 'percentage'
  isActive: boolean
  status: 'active' | 'inactive' | 'expired'
  
  // 재고 및 제한 관련 (Stock & Limits)
  stockQuantity?: number
  stockLimit: number
  currentStock: number
  maxRedemptionsPerUser?: number
  minPointsRequired?: number
  minOrderAmount: number
  userLimit: number
  usageLimit: number  // Added for compatibility
  
  // 유효기간 관련 (Validity)
  validFrom?: string
  validUntil?: string
  expiryDays: number
  
  // 기타 설정 (Other Settings)
  imageUrl?: string
  terms?: string
  termsConditions: string
  category: string
  priority: number
  totalRedemptions: number
  redemptionCount: number
  pendingRedemptions: number
  createdAt: string
  updatedAt: string
  
  // 적용 제품 (Applicable Products/Categories)
  applicableProducts?: string[]  // Added for compatibility
  applicableCategories?: string[]  // Added for compatibility
}

// Points Policy for earning and redemption rules
export interface PointsPolicy {
  id: string
  name: string
  type: 'earning' | 'redemption' | 'expiration' | 'tier'
  isActive: boolean
  
  // 구매/적립 관련 (Purchase/Earning)
  purchaseRate: number
  minimumEarnAmount: number
  maxDailyEarn: number
  maxMonthlyEarn: number
  roundingRule: 'round' | 'floor' | 'ceil'
  
  // 티어 시스템 (Tier System)
  enableTierSystem: boolean
  tierRates: Record<string, number>
  tierThresholds: Record<string, number>
  
  // 사용/환전 관련 (Spending/Redemption)
  minimumSpend: number
  maximumSpendRatio: number
  conversionRate: number
  allowPartialSpend: boolean
  
  // 만료 관련 (Expiration)
  enablePointsExpiry: boolean
  expiryMonths: number
  expiryWarningDays: number
  autoExpireInactive: boolean
  inactivityMonths: number
  
  // 보너스 관련 (Bonus)
  enableBonusPoints: boolean
  bonusRates: Record<string, number>
  
  rules?: {
    pointsPerDollar?: number
    minimumOrderAmount?: number
    excludeDiscountedItems?: boolean
    excludeShipping?: boolean
    excludeTax?: boolean
    maxPointsPerOrder?: number
    categoryMultipliers?: Record<string, number>
    firstPurchaseBonus?: number
    birthdayBonus?: number
    reviewBonus?: number
    referralBonus?: number
    expirationDays?: number
    reminderDays?: number[]
    tierThresholds?: Record<string, number>
    tierMultipliers?: Record<string, number>
  }
  conditions?: {
    customerGroups?: string[]
    productCategories?: string[]
    paymentMethods?: string[]
    shippingMethods?: string[]
    dateRange?: {
      start: string
      end: string
    }
  }
  
  // 인덱스 시그니처 추가 (모든 다른 속성들이 정의된 후에)
  [key: string]: unknown
  priority: number
  description?: string
  createdAt: string
  updatedAt: string
}