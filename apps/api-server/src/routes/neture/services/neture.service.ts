/**
 * Neture Service
 *
 * Phase D-1: Neture API Server 골격 구축
 * Phase G-3: 주문/결제 플로우 구현
 * Business logic layer for Neture operations
 */

import { DataSource } from 'typeorm';
import { NetureRepository } from '../repositories/neture.repository.js';
import {
  NetureProduct,
  NetureProductStatus,
  NetureProductCategory,
  NetureCurrency,
} from '../entities/neture-product.entity.js';
import {
  NeturePartner,
  NeturePartnerType,
  NeturePartnerStatus,
} from '../entities/neture-partner.entity.js';
import { NetureLogAction } from '../entities/neture-product-log.entity.js';
import {
  NetureOrder,
  NetureOrderStatus,
  NeturePaymentMethod,
} from '../entities/neture-order.entity.js';
import { NetureOrderItem } from '../entities/neture-order-item.entity.js';
import {
  ProductDto,
  PartnerDto,
  ProductLogDto,
  OrderDto,
  OrderItemDto,
  ListProductsQueryDto,
  SearchProductsQueryDto,
  ListProductsResponseDto,
  CreateProductRequestDto,
  UpdateProductRequestDto,
  UpdateProductStatusRequestDto,
  ListPartnersQueryDto,
  ListPartnersResponseDto,
  CreatePartnerRequestDto,
  UpdatePartnerRequestDto,
  UpdatePartnerStatusRequestDto,
  ListLogsQueryDto,
  ListLogsResponseDto,
  CreateOrderRequestDto,
  ListOrdersQueryDto,
  ListOrdersResponseDto,
  UpdateOrderStatusRequestDto,
} from '../dto/index.js';

export class NetureService {
  private repository: NetureRepository;

  constructor(private dataSource: DataSource) {
    this.repository = new NetureRepository(dataSource);
  }

  // ============================================================================
  // Product Operations
  // ============================================================================

  private toProductDto(product: NetureProduct): ProductDto {
    return {
      id: product.id,
      partner_id: product.partnerId || null,
      name: product.name,
      subtitle: product.subtitle || null,
      description: product.description || null,
      category: product.category,
      status: product.status,
      base_price: product.basePrice,
      sale_price: product.salePrice || null,
      currency: product.currency,
      stock: product.stock,
      sku: product.sku || null,
      images: product.images || null,
      tags: product.tags || null,
      is_featured: product.isFeatured,
      view_count: product.viewCount,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString(),
      partner: product.partner ? this.toPartnerDto(product.partner) : undefined,
    };
  }

  async listProducts(query: ListProductsQueryDto): Promise<ListProductsResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { products, total } = await this.repository.findProducts({
      page,
      limit,
      partnerId: query.partner_id,
      category: query.category,
      status: query.status,
      isFeatured: query.is_featured,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: products.map((p) => this.toProductDto(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchProducts(query: SearchProductsQueryDto): Promise<ListProductsResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { products, total } = await this.repository.searchProducts({
      query: query.q,
      page,
      limit,
    });

    return {
      data: products.map((p) => this.toProductDto(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProduct(id: string, incrementView = false): Promise<ProductDto | null> {
    const product = await this.repository.findProductById(id);
    if (!product) return null;

    if (incrementView) {
      await this.repository.incrementViewCount(id);
      product.viewCount += 1;
    }

    return this.toProductDto(product);
  }

  async createProduct(
    data: CreateProductRequestDto,
    userId?: string
  ): Promise<ProductDto> {
    const product = await this.repository.createProduct({
      partnerId: data.partner_id,
      name: data.name,
      subtitle: data.subtitle,
      description: data.description,
      category: data.category || NetureProductCategory.OTHER,
      basePrice: data.base_price,
      salePrice: data.sale_price,
      currency: data.currency,
      stock: data.stock || 0,
      sku: data.sku,
      images: data.images,
      tags: data.tags,
      isFeatured: data.is_featured || false,
      metadata: data.metadata,
      status: NetureProductStatus.DRAFT,
      createdBy: userId,
      updatedBy: userId,
    });

    // Create log
    await this.repository.createLog({
      productId: product.id,
      action: NetureLogAction.CREATE,
      after: { name: product.name, basePrice: product.basePrice },
      performedBy: userId,
    });

    return this.toProductDto(product);
  }

  async updateProduct(
    id: string,
    data: UpdateProductRequestDto,
    userId?: string
  ): Promise<ProductDto | null> {
    const existing = await this.repository.findProductById(id);
    if (!existing) return null;

    const updateData: Partial<NetureProduct> = {
      updatedBy: userId,
    };

    if (data.partner_id !== undefined) updateData.partnerId = data.partner_id;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.base_price !== undefined) updateData.basePrice = data.base_price;
    if (data.sale_price !== undefined) updateData.salePrice = data.sale_price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.is_featured !== undefined) updateData.isFeatured = data.is_featured;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const product = await this.repository.updateProduct(id, updateData);
    if (!product) return null;

    // Create log
    await this.repository.createLog({
      productId: id,
      action: NetureLogAction.UPDATE,
      before: { name: existing.name, basePrice: existing.basePrice },
      after: { name: product.name, basePrice: product.basePrice },
      performedBy: userId,
    });

    return this.toProductDto(product);
  }

  async updateProductStatus(
    id: string,
    data: UpdateProductStatusRequestDto,
    userId?: string
  ): Promise<ProductDto | null> {
    const existing = await this.repository.findProductById(id);
    if (!existing) return null;

    const product = await this.repository.updateProduct(id, {
      status: data.status,
      updatedBy: userId,
    });
    if (!product) return null;

    // Create log
    await this.repository.createLog({
      productId: id,
      action: NetureLogAction.STATUS_CHANGE,
      before: { status: existing.status },
      after: { status: data.status },
      performedBy: userId,
    });

    return this.toProductDto(product);
  }

  // ============================================================================
  // Partner Operations
  // ============================================================================

  private toPartnerDto(partner: NeturePartner): PartnerDto {
    return {
      id: partner.id,
      name: partner.name,
      business_name: partner.businessName || null,
      business_number: partner.businessNumber || null,
      type: partner.type,
      status: partner.status,
      description: partner.description || null,
      logo: partner.logo || null,
      website: partner.website || null,
      contact: partner.contact || null,
      address: partner.address || null,
      created_at: partner.createdAt.toISOString(),
      updated_at: partner.updatedAt.toISOString(),
    };
  }

  async listPartners(query: ListPartnersQueryDto): Promise<ListPartnersResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { partners, total } = await this.repository.findPartners({
      page,
      limit,
      type: query.type,
      status: query.status,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: partners.map((p) => this.toPartnerDto(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPartner(id: string): Promise<PartnerDto | null> {
    const partner = await this.repository.findPartnerById(id);
    if (!partner) return null;
    return this.toPartnerDto(partner);
  }

  async createPartner(
    data: CreatePartnerRequestDto,
    userId?: string
  ): Promise<PartnerDto> {
    const partner = await this.repository.createPartner({
      name: data.name,
      businessName: data.business_name,
      businessNumber: data.business_number,
      type: data.type || NeturePartnerType.PARTNER,
      description: data.description,
      logo: data.logo,
      website: data.website,
      contact: data.contact,
      address: data.address,
      userId: data.user_id,
      metadata: data.metadata,
      status: NeturePartnerStatus.PENDING,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.toPartnerDto(partner);
  }

  async updatePartner(
    id: string,
    data: UpdatePartnerRequestDto,
    userId?: string
  ): Promise<PartnerDto | null> {
    const updateData: Partial<NeturePartner> = {
      updatedBy: userId,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.business_name !== undefined) updateData.businessName = data.business_name;
    if (data.business_number !== undefined) updateData.businessNumber = data.business_number;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.logo !== undefined) updateData.logo = data.logo;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.contact !== undefined) updateData.contact = data.contact;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const partner = await this.repository.updatePartner(id, updateData);
    if (!partner) return null;

    return this.toPartnerDto(partner);
  }

  async updatePartnerStatus(
    id: string,
    data: UpdatePartnerStatusRequestDto,
    userId?: string
  ): Promise<PartnerDto | null> {
    const partner = await this.repository.updatePartner(id, {
      status: data.status,
      updatedBy: userId,
    });
    if (!partner) return null;

    return this.toPartnerDto(partner);
  }

  // ============================================================================
  // Log Operations
  // ============================================================================

  private toLogDto(log: any): ProductLogDto {
    return {
      id: log.id,
      product_id: log.productId,
      action: log.action,
      before: log.before,
      after: log.after,
      note: log.note,
      performed_by: log.performedBy,
      created_at: log.createdAt.toISOString(),
    };
  }

  async listLogs(query: ListLogsQueryDto): Promise<ListLogsResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { logs, total } = await this.repository.findLogs({
      page,
      limit,
      productId: query.product_id,
      action: query.action,
    });

    return {
      data: logs.map((l) => this.toLogDto(l)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================================
  // Order Operations (Phase G-3)
  // ============================================================================

  private toOrderItemDto(item: NetureOrderItem): OrderItemDto {
    return {
      id: item.id,
      product_id: item.productId,
      product_name: item.productName,
      product_image: item.productImage || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      options: item.options || null,
    };
  }

  private toOrderDto(order: NetureOrder): OrderDto {
    return {
      id: order.id,
      order_number: order.orderNumber,
      user_id: order.userId,
      status: order.status,
      total_amount: order.totalAmount,
      discount_amount: order.discountAmount,
      shipping_fee: order.shippingFee,
      final_amount: order.finalAmount,
      currency: order.currency,
      payment_method: order.paymentMethod || null,
      payment_key: order.paymentKey || null,
      paid_at: order.paidAt?.toISOString() || null,
      shipping: order.shipping || null,
      orderer_name: order.ordererName || null,
      orderer_phone: order.ordererPhone || null,
      orderer_email: order.ordererEmail || null,
      note: order.note || null,
      cancelled_at: order.cancelledAt?.toISOString() || null,
      cancel_reason: order.cancelReason || null,
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
      items: order.items?.map((item) => this.toOrderItemDto(item)),
    };
  }

  async createOrder(
    data: CreateOrderRequestDto,
    userId: string
  ): Promise<OrderDto> {
    // 1. 상품 조회 및 검증
    const productIds = data.items.map((item) => item.product_id);
    const products = await this.repository.findProductsByIds(productIds);

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 2. 재고 확인 및 가격 계산
    let totalAmount = 0;
    const orderItems: Partial<NetureOrderItem>[] = [];

    for (const item of data.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new Error(`Product not found: ${item.product_id}`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }

      const unitPrice = product.salePrice || product.basePrice;
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0] || null,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
        options: item.options,
      });
    }

    // 3. 배송비 계산 (5만원 이상 무료배송)
    const shippingFee = totalAmount >= 50000 ? 0 : 3000;
    const finalAmount = totalAmount + shippingFee;

    // 4. 주문 생성
    const orderNumber = await this.repository.generateOrderNumber();
    const order = await this.repository.createOrder({
      orderNumber,
      userId,
      status: NetureOrderStatus.CREATED,
      totalAmount,
      discountAmount: 0,
      shippingFee,
      finalAmount,
      currency: NetureCurrency.KRW,
      shipping: data.shipping,
      ordererName: data.orderer_name,
      ordererPhone: data.orderer_phone,
      ordererEmail: data.orderer_email,
      note: data.note,
    });

    // 5. 주문 항목 생성
    const itemsWithOrderId = orderItems.map((item) => ({
      ...item,
      orderId: order.id,
    }));
    const savedItems = await this.repository.createOrderItems(itemsWithOrderId);
    order.items = savedItems;

    // 6. 재고 차감
    for (const item of data.items) {
      await this.repository.decrementStock(item.product_id, item.quantity);
    }

    return this.toOrderDto(order);
  }

  async listOrders(
    query: ListOrdersQueryDto,
    userId: string
  ): Promise<ListOrdersResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { orders, total } = await this.repository.findOrders({
      page,
      limit,
      userId,
      status: query.status,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: orders.map((o) => this.toOrderDto(o)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listAllOrders(
    query: ListOrdersQueryDto
  ): Promise<ListOrdersResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { orders, total } = await this.repository.findOrders({
      page,
      limit,
      status: query.status,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: orders.map((o) => this.toOrderDto(o)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrder(id: string, userId?: string): Promise<OrderDto | null> {
    const order = await this.repository.findOrderById(id);
    if (!order) return null;

    // 사용자 ID가 제공되면 소유권 확인
    if (userId && order.userId !== userId) {
      return null;
    }

    return this.toOrderDto(order);
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderDto | null> {
    const order = await this.repository.findOrderByNumber(orderNumber);
    if (!order) return null;
    return this.toOrderDto(order);
  }

  async updateOrderStatus(
    id: string,
    data: UpdateOrderStatusRequestDto
  ): Promise<OrderDto | null> {
    const order = await this.repository.findOrderById(id);
    if (!order) return null;

    const updateData: Partial<NetureOrder> = {
      status: data.status,
    };

    // 취소 처리
    if (data.status === NetureOrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = data.cancel_reason;

      // 재고 복원
      if (order.items) {
        for (const item of order.items) {
          await this.repository.restoreStock(item.productId, item.quantity);
        }
      }
    }

    const updated = await this.repository.updateOrder(id, updateData);
    if (!updated) return null;

    return this.toOrderDto(updated);
  }

  async confirmPayment(
    orderId: string,
    paymentKey: string,
    paymentMethod: NeturePaymentMethod
  ): Promise<OrderDto | null> {
    const order = await this.repository.findOrderById(orderId);
    if (!order) return null;

    if (order.status !== NetureOrderStatus.CREATED) {
      throw new Error('Order is not in a payable state');
    }

    const updated = await this.repository.updateOrder(orderId, {
      status: NetureOrderStatus.PAID,
      paymentKey,
      paymentMethod,
      paidAt: new Date(),
    });

    if (!updated) return null;
    return this.toOrderDto(updated);
  }
}
