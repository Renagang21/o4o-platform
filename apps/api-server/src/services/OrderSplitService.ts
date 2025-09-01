/**
 * Order Split Service
 * Automatically splits orders by supplier and forwards to respective suppliers
 */

import { AppDataSource } from '../database/connection';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { VendorOrderItem } from '../entities/VendorOrderItem';
import { User } from '../entities/User';
// import { SupplierManager, SupplierOrder } from '@o4o/supplier-connector'; // Commented out until package is available

interface SplitOrder {
  supplierId: string;
  vendorId: string;
  items: OrderItem[];
  totalAmount: number;
  totalCost: number;
  commission: number;
}

export class OrderSplitService {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private productRepository = AppDataSource.getRepository(Product);
  private vendorOrderItemRepository = AppDataSource.getRepository(VendorOrderItem);
  private userRepository = AppDataSource.getRepository(User);
  private supplierManager: any; // Changed from SupplierManager until package is available

  constructor() {
    // this.supplierManager = new SupplierManager(); // Commented out until package is available
    // this.initializeSuppliers(); // Commented out until package is available
  }

  /**
   * Initialize supplier connectors
   */
  private async initializeSuppliers() {
    // Supplier initialization commented out until package is available
    /*
    // Load supplier configurations from database or config
    // For now, we'll use sample configurations
    
    // Add domestic API supplier
    this.supplierManager.addSupplier('domestic-api', {
      type: 'api',
      credentials: {
        apiKey: process.env.DOMESTIC_SUPPLIER_API_KEY,
        endpoint: process.env.DOMESTIC_SUPPLIER_ENDPOINT
      },
      options: {
        rateLimit: 10,
        timeout: 30000,
        retryAttempts: 3
      }
    } as any);

    // Add CSV catalog supplier
    this.supplierManager.addSupplier('csv-catalog', {
      type: 'csv',
      options: {
        webhookUrl: './catalogs/supplier-products.csv',
        rateLimit: 10,
        timeout: 30000,
        retryAttempts: 3
      }
    } as any);
    */
  }

  /**
   * Split order by supplier
   */
  async splitOrderBySupplier(orderId: string): Promise<SplitOrder[]> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'customer']
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Group items by supplier/vendor
    const supplierGroups = await this.groupItemsBySupplier(order.items);
    
    // Create split orders
    const splitOrders: SplitOrder[] = [];
    
    for (const [key, items] of supplierGroups.entries()) {
      const [supplierId, vendorId] = key.split(':');
      
      const totalAmount = items.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );
      
      const totalCost = items.reduce((sum, item) => 
        sum + ((item.product.cost || 0) * item.quantity), 0
      );
      
      const commission = this.calculateCommission(totalAmount, totalCost);
      
      splitOrders.push({
        supplierId,
        vendorId,
        items,
        totalAmount,
        totalCost,
        commission
      });
    }

    // Forward orders to suppliers
    await this.forwardToSuppliers(order, splitOrders);
    
    // Create vendor order items for tracking
    await this.createVendorOrderItems(order, splitOrders);
    
    return splitOrders;
  }

  /**
   * Group order items by supplier and vendor
   */
  private async groupItemsBySupplier(
    items: OrderItem[]
  ): Promise<Map<string, OrderItem[]>> {
    const groups = new Map<string, OrderItem[]>();
    
    for (const item of items) {
      const product = item.product;
      
      // Determine supplier based on product metadata
      let supplierId = product.supplierId || 'default';
      const vendorId = product.vendorId || product.userId;
      
      // If product doesn't have supplier info, find best supplier
      if (!product.supplierId) {
        // const bestSupplier = await this.supplierManager.findBestSupplier(product.sku); // Commented out until package is available
        const bestSupplier = null;
        
        if (bestSupplier) {
          supplierId = bestSupplier as any;
        }
      }
      
      const key = `${supplierId}:${vendorId}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      
      groups.get(key)!.push(item);
    }
    
    return groups;
  }

  /**
   * Forward split orders to respective suppliers
   */
  private async forwardToSuppliers(
    order: Order,
    splitOrders: SplitOrder[]
  ): Promise<void> {
    const forwardPromises = splitOrders.map(async (splitOrder) => {
      // const supplier = this.supplierManager.getSupplier(splitOrder.supplierId); // Commented out until package is available
      const supplier = null;
      
      if (!supplier) {
        // Error log removed
        return;
      }

      // Prepare supplier order
      const supplierOrder: any = {
        orderId: `${order.id}-${splitOrder.supplierId}`,
        items: splitOrder.items.map(item => ({
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.price,
          cost: item.product.cost || 0
        })),
        customer: {
          name: order.user?.name || order.customerName || '',
          email: order.user?.email || order.customerEmail || '',
          phone: order.customerPhone || order.shippingAddress?.phone || ''
        },
        shipping: {
          name: order.shippingAddress?.name || order.customerName || '',
          address1: order.shippingAddress?.address || '',
          address2: order.shippingAddress?.addressDetail,
          city: order.shippingAddress?.city || '',
          state: order.shippingAddress?.state || '',
          postalCode: order.shippingAddress?.zipCode || '',
          country: order.shippingAddress?.country || 'KR',
          phone: order.shippingAddress?.phone || order.customerPhone
        },
        totalAmount: splitOrder.totalAmount,
        currency: order.currency || 'KRW',
        status: 'pending',
        notes: `Order from O4O Platform - ${order.id}`
      };

      try {
        // Create order with supplier - commented out until package is available
        // const response = await supplier.createOrder(supplierOrder) as any;
        const response = null;
        
        if (response && (response as any).success && (response as any).data) {
          // Update order item with supplier order ID
          for (const item of splitOrder.items) {
            item.supplierOrderId = (response as any).data.supplierOrderId;
            await this.orderItemRepository.save(item);
          }
          
          // TODO: Replace with proper logger
        } else {
          // Error log removed
        }
      } catch (error) {
        // Error log removed
      }
    });
    
    await Promise.all(forwardPromises);
  }

  /**
   * Create vendor order items for commission tracking
   */
  private async createVendorOrderItems(
    order: Order,
    splitOrders: SplitOrder[]
  ): Promise<void> {
    for (const splitOrder of splitOrders) {
      const vendor = await this.userRepository.findOne({
        where: { id: splitOrder.vendorId }
      });
      
      if (!vendor) continue;
      
      for (const item of splitOrder.items) {
        const vendorOrderItem = this.vendorOrderItemRepository.create({
          orderId: order.id,
          vendorId: splitOrder.vendorId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          cost: item.product.cost,
          vendorProfit: item.price - item.product.cost,
          platformCommission: this.calculatePlatformCommission(item.price),
          affiliateCommission: this.calculateAffiliateCommission(item.price),
          status: 'pending'
        });
        
        await this.vendorOrderItemRepository.save(vendorOrderItem);
      }
    }
  }

  /**
   * Calculate commission for split order
   */
  private calculateCommission(totalAmount: number, totalCost: number): number {
    const profit = totalAmount - totalCost;
    const platformRate = 0.03; // 3% platform fee
    const affiliateRate = 0.05; // 5% affiliate commission
    
    return profit * (platformRate + affiliateRate);
  }

  /**
   * Calculate platform commission
   */
  private calculatePlatformCommission(amount: number): number {
    return amount * 0.03; // 3% platform fee
  }

  /**
   * Calculate affiliate commission
   */
  private calculateAffiliateCommission(amount: number): number {
    return amount * 0.05; // 5% affiliate commission
  }

  /**
   * Update order status from supplier
   */
  async updateOrderStatusFromSupplier(
    supplierOrderId: string,
    status: string
  ): Promise<void> {
    const orderItem = await this.orderItemRepository.findOne({
      where: { supplierOrderId },
      relations: ['order']
    });
    
    if (!orderItem) {
      // Error log removed
      return;
    }
    
    // Update order item status
    orderItem.status = status;
    await this.orderItemRepository.save(orderItem);
    
    // Check if all items in the order have the same status
    const order = await orderItem.order;
    const allItems = await this.orderItemRepository.find({
      where: { orderId: order.id }
    });
    
    const allSameStatus = allItems.every(item => item.status === status);
    
    if (allSameStatus) {
      // Update main order status
      (order as any).status = status;
      await this.orderRepository.save(order);
    }
  }

  /**
   * Track shipment from supplier
   */
  async trackShipmentFromSupplier(
    supplierOrderId: string
  ): Promise<any> {
    const orderItem = await this.orderItemRepository.findOne({
      where: { supplierOrderId }
    });
    
    if (!orderItem || !orderItem.trackingNumber) {
      return null;
    }
    
    // Find the supplier for this order
    const [supplierId] = supplierOrderId.split('-');
    // const supplier = this.supplierManager.getSupplier(supplierId); // Commented out until package is available
    const supplier = null;
    
    if (!supplier) {
      return null;
    }
    
    // return await supplier.getOrderStatus(supplierOrderId); // Commented out until package is available
    return null;
  }
}