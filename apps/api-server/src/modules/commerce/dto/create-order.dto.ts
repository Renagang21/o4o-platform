import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsObject, IsNotEmpty, Min, IsUUID, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../entities/Order.js';

export interface CreateOrderItem {
  productId: string;
  productName: string;
  productSku: string;
  productImage: string;
  productBrand?: string;
  variationId?: string;
  variationName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplierId: string;
  supplierName: string;
  sellerId: string;
  sellerName: string;
  sellerProductId?: string;
  basePriceSnapshot?: number;
  salePriceSnapshot?: number;
  marginAmountSnapshot?: number;
  commissionType?: 'rate' | 'fixed';
  commissionRate?: number;
  commissionAmount?: number;
  attributes?: Record<string, string>;
  notes?: string;
}

export interface CreateOrderSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  handlingFee?: number;
  insuranceFee?: number;
  serviceFee?: number;
}

export interface CreateOrderAddress {
  recipientName: string;
  phone: string;
  email?: string;
  company?: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  city: string;
  state?: string;
  country: string;
  deliveryRequest?: string;
}

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  buyerId!: string;

  @IsString()
  @IsNotEmpty()
  buyerName!: string;

  @IsEmail()
  @IsNotEmpty()
  buyerEmail!: string;

  @IsString()
  @IsOptional()
  buyerGrade?: string;

  @IsArray()
  @IsNotEmpty()
  items!: CreateOrderItem[];

  @IsObject()
  @IsNotEmpty()
  summary!: CreateOrderSummary;

  @IsString()
  @IsOptional()
  currency?: string = 'KRW';

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;

  @IsObject()
  @IsNotEmpty()
  billingAddress!: CreateOrderAddress;

  @IsObject()
  @IsNotEmpty()
  shippingAddress!: CreateOrderAddress;

  @IsString()
  @IsOptional()
  shippingMethod?: string;

  @IsString()
  @IsOptional()
  customerNotes?: string;

  @IsUUID()
  @IsOptional()
  partnerId?: string;

  @IsString()
  @IsOptional()
  partnerName?: string;

  @IsString()
  @IsOptional()
  referralCode?: string;

  @IsString()
  @IsOptional()
  source?: 'web' | 'mobile' | 'api' | 'admin' = 'web';
}
