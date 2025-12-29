// Dropshipping Platform Types

export enum SupplierStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected'
}

export enum SellerLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum'
}

export enum AffiliateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum CommissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export interface SupplierInfo {
  companyName: string;
  businessNumber: string;
  businessLicense?: string;
  onlineSellingLicense?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  commissionRate: number; // 기본 수수료율 (%)
  verificationStatus: SupplierStatus;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface SellerInfo {
  storeName: string;
  storeUrl?: string;
  description?: string;
  sellerLevel: SellerLevel;
  salesPerformance: {
    totalSales: number;
    monthlyAverage: number;
    returnRate: number;
    customerSatisfaction: number;
  };
  marketplaces?: string[]; // 연동된 마켓플레이스
  commissionRate?: number; // 커스텀 수수료율
}

export interface AffiliateInfo {
  referralCode: string;
  websiteUrl?: string;
  socialMedia?: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    blog?: string;
  };
  commissionSettings: {
    baseRate: number; // 기본 커미션율 (%)
    tieredRates?: {
      level: number;
      minSales: number;
      rate: number;
    }[];
  };
  performanceMetrics: {
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    totalEarnings: number;
    monthlyEarnings: number;
  };
  paymentMethod?: {
    type: 'bank' | 'paypal' | 'stripe';
    details: Record<string, string>;
  };
  status: AffiliateStatus;
}

export interface DropshippingProduct {
  supplierId: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  images: string[];
  pricing: {
    supplierPrice: number; // 공급가
    msrp: number; // 권장소비자가
    minSellingPrice?: number; // 최소 판매가
  };
  inventory: {
    quantity: number;
    reserved: number;
    available: number;
    lowStockThreshold: number;
  };
  shipping: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    shippingClass: string;
    estimatedDays: number;
  };
  attributes?: Record<string, any>;
  variations?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    inventory: number;
    attributes: Record<string, any>;
  }[];
  isActive: boolean;
  tags?: string[];
}

export interface DropshippingOrder {
  orderId: string;
  buyerId: string;
  sellerId?: string;
  supplierId: string;
  affiliateId?: string;
  products: {
    productId: string;
    sku: string;
    quantity: number;
    price: number;
    supplierPrice: number;
  }[];
  pricing: {
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
    supplierCost: number;
    sellerProfit: number;
    affiliateCommission?: number;
  };
  shipping: {
    method: string;
    address: {
      name: string;
      phone: string;
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: Date;
  };
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: Date;
    note?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateCommission {
  commissionId: string;
  affiliateId: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  approvedAt?: Date;
  paidAt?: Date;
  paymentReference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Permission definitions for role-based access control
export const ROLE_PERMISSIONS = {
  SUPPLIER: [
    'products.create',
    'products.update',
    'products.delete',
    'products.view.own',
    'inventory.manage',
    'orders.view.supplier',
    'orders.process',
    'shipping.manage',
    'analytics.view.supplier'
  ],
  SELLER: [
    'products.view.all',
    'products.import',
    'products.price.set',
    'orders.view.seller',
    'orders.manage',
    'customers.view',
    'customers.manage',
    'marketing.manage',
    'analytics.view.seller'
  ],
  AFFILIATE: [
    'products.view.public',
    'links.generate',
    'commission.view.own',
    'analytics.view.affiliate',
    'payout.request'
  ],
  CUSTOMER: [
    'products.view.public',
    'orders.create',
    'orders.view.own',
    'reviews.create',
    'profile.manage.own'
  ],
  ADMIN: [
    '*' // All permissions
  ]
};

// Helper function to check permissions
export function hasPermission(userRoles: string[], requiredPermission: string): boolean {
  const userPermissions = userRoles.flatMap(role => 
    ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || []
  );
  
  return userPermissions.includes('*') || userPermissions.includes(requiredPermission);
}