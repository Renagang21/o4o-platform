// User Roles
export type UserRole = 'pharmacy' | 'supplier' | 'partner' | 'operator' | 'consumer';

// User status
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

// Pharmacy specific user data
export interface PharmacyUser extends User {
  role: 'pharmacy';
  pharmacy: {
    id: string;
    name: string;
    businessNumber: string;
    address: string;
    phone: string;
    storeSlug: string; // URL slug for consumer store
    isStoreActive: boolean;
  };
}

// Supplier specific user data
export interface SupplierUser extends User {
  role: 'supplier';
  company: {
    id: string;
    name: string;
    businessNumber: string;
    category: string[];
  };
}

// Partner specific user data
export interface PartnerUser extends User {
  role: 'partner';
  partnerInfo: {
    id: string;
    companyName: string;
    partnerType: 'device' | 'content' | 'marketing' | 'other';
  };
}

// Consumer specific user data
export interface ConsumerUser extends User {
  role: 'consumer';
  healthProfile?: {
    diabetesType?: 'type1' | 'type2' | 'gestational' | 'prediabetes';
    diagnosisYear?: number;
  };
}

// Product categories
export type ProductCategory =
  | 'cgm'
  | 'blood_glucose_meter'
  | 'lancet'
  | 'test_strip'
  | 'insulin_pen'
  | 'insulin_pump'
  | 'supplement'
  | 'food'
  | 'other';

// Product interface
export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  discountPrice?: number;
  images: string[];
  supplierId: string;
  supplierName: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
}

// Order status
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

// Order interface
export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  pharmacyId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Address {
  zipCode: string;
  address1: string;
  address2?: string;
  recipient: string;
  phone: string;
}

// Forum post
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

// Education content
export interface EducationContent {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'article' | 'pdf' | 'webinar';
  category: string;
  thumbnailUrl?: string;
  contentUrl: string;
  duration?: number; // in minutes
  viewCount: number;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
