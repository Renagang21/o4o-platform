/**
 * Neture DTOs
 *
 * Phase D-1: Neture API Server 골격 구축
 * Phase G-3: 주문/결제 플로우 구현
 */

import {
  NetureProductStatus,
  NetureProductCategory,
  NetureCurrency,
  NetureProductImage,
} from '../entities/neture-product.entity.js';
import {
  NeturePartnerType,
  NeturePartnerStatus,
  NeturePartnerContact,
  NeturePartnerAddress,
} from '../entities/neture-partner.entity.js';
import { NetureLogAction } from '../entities/neture-product-log.entity.js';
import {
  NetureOrderStatus,
  NeturePaymentMethod,
  NetureShippingAddress,
} from '../entities/neture-order.entity.js';

// ============================================================================
// Common DTOs
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// ============================================================================
// Product DTOs
// ============================================================================

export interface ProductDto {
  id: string;
  partner_id: string | null;
  name: string;
  subtitle: string | null;
  description: string | null;
  category: NetureProductCategory;
  status: NetureProductStatus;
  base_price: number;
  sale_price: number | null;
  currency: NetureCurrency;
  stock: number;
  sku: string | null;
  images: NetureProductImage[] | null;
  tags: string[] | null;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  partner?: PartnerDto;
}

export interface ListProductsQueryDto {
  page?: number;
  limit?: number;
  partner_id?: string;
  category?: NetureProductCategory;
  status?: NetureProductStatus;
  is_featured?: boolean;
  sort?: 'created_at' | 'price' | 'name' | 'view_count';
  order?: 'asc' | 'desc';
}

export interface SearchProductsQueryDto {
  q: string;
  page?: number;
  limit?: number;
}

export interface ListProductsResponseDto {
  data: ProductDto[];
  meta: PaginationMeta;
}

export interface CreateProductRequestDto {
  partner_id?: string;
  name: string;
  subtitle?: string;
  description?: string;
  category?: NetureProductCategory;
  base_price: number;
  sale_price?: number;
  currency?: NetureCurrency;
  stock?: number;
  sku?: string;
  images?: NetureProductImage[];
  tags?: string[];
  is_featured?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateProductRequestDto {
  partner_id?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  category?: NetureProductCategory;
  base_price?: number;
  sale_price?: number | null;
  currency?: NetureCurrency;
  stock?: number;
  sku?: string;
  images?: NetureProductImage[];
  tags?: string[];
  is_featured?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateProductStatusRequestDto {
  status: NetureProductStatus;
}

// ============================================================================
// Partner DTOs
// ============================================================================

export interface PartnerDto {
  id: string;
  name: string;
  business_name: string | null;
  business_number: string | null;
  type: NeturePartnerType;
  status: NeturePartnerStatus;
  description: string | null;
  logo: string | null;
  website: string | null;
  contact: NeturePartnerContact | null;
  address: NeturePartnerAddress | null;
  /** WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1: Identity(users.status) */
  identity_status: string | null;
  user_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListPartnersQueryDto {
  page?: number;
  limit?: number;
  type?: NeturePartnerType;
  status?: NeturePartnerStatus;
  sort?: 'created_at' | 'name';
  order?: 'asc' | 'desc';
}

export interface ListPartnersResponseDto {
  data: PartnerDto[];
  meta: PaginationMeta;
}

export interface CreatePartnerRequestDto {
  name: string;
  business_name?: string;
  business_number?: string;
  type?: NeturePartnerType;
  description?: string;
  logo?: string;
  website?: string;
  contact?: NeturePartnerContact;
  address?: NeturePartnerAddress;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePartnerRequestDto {
  name?: string;
  business_name?: string;
  business_number?: string;
  type?: NeturePartnerType;
  description?: string;
  logo?: string;
  website?: string;
  contact?: NeturePartnerContact;
  address?: NeturePartnerAddress;
  metadata?: Record<string, any>;
}

export interface UpdatePartnerStatusRequestDto {
  status: NeturePartnerStatus;
}

// ============================================================================
// Log DTOs
// ============================================================================

export interface ProductLogDto {
  id: string;
  product_id: string;
  action: NetureLogAction;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  note: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface ListLogsQueryDto {
  page?: number;
  limit?: number;
  product_id?: string;
  action?: NetureLogAction;
}

export interface ListLogsResponseDto {
  data: ProductLogDto[];
  meta: PaginationMeta;
}

// ============================================================================
// Order DTOs (Phase G-3)
// ============================================================================

export interface OrderItemDto {
  id: string;
  product_id: string;
  product_name: string;
  product_image: NetureProductImage | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: Record<string, any> | null;
}

export interface OrderDto {
  id: string;
  order_number: string;
  user_id: string;
  status: NetureOrderStatus;
  total_amount: number;
  discount_amount: number;
  shipping_fee: number;
  final_amount: number;
  currency: NetureCurrency;
  payment_method: NeturePaymentMethod | null;
  payment_key: string | null;
  paid_at: string | null;
  shipping: NetureShippingAddress | null;
  orderer_name: string | null;
  orderer_phone: string | null;
  orderer_email: string | null;
  note: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItemDto[];
}

export interface CreateOrderItemDto {
  product_id: string;
  quantity: number;
  options?: Record<string, any>;
}

export interface CreateOrderRequestDto {
  items: CreateOrderItemDto[];
  shipping: NetureShippingAddress;
  orderer_name: string;
  orderer_phone: string;
  orderer_email?: string;
  note?: string;
}

export interface CreateOrderResponseDto {
  data: OrderDto;
}

export interface ListOrdersQueryDto {
  page?: number;
  limit?: number;
  status?: NetureOrderStatus;
  sort?: 'created_at' | 'final_amount';
  order?: 'asc' | 'desc';
}

export interface ListOrdersResponseDto {
  data: OrderDto[];
  meta: PaginationMeta;
}

export interface UpdateOrderStatusRequestDto {
  status: NetureOrderStatus;
  cancel_reason?: string;
}

export interface OrderPaymentRequestDto {
  payment_key: string;
  order_id: string;
  amount: number;
}
