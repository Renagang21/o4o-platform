import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService.js';
import { OrderItem, PaymentMethod } from '../entities/Order.js';
import { AppDataSource } from '../database/connection.js';
import { Product } from '../entities/Product.js';
import { SellerProduct } from '../entities/SellerProduct.js';
import { Seller } from '../entities/Seller.js';
import logger from '../utils/logger.js';

/**
 * Storefront Order Controller (Phase 3)
 *
 * Public API for customer-facing storefront operations.
 * Handles order creation from frontend sessionStorage cart.
 */

// Frontend request types (matches main-site/types/storefront.ts)
interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: {
    postcode: string;
    addr1: string;
    addr2: string;
  };
}

interface StorefrontOrderItemRequest {
  product_id: string;
  quantity: number;
  seller_id?: string; // Phase 3: seller info from frontend cart
}

interface CreateStorefrontOrderRequest {
  customer: CustomerInfo;
  items: StorefrontOrderItemRequest[];
  payment_method?: string;
}

export class StorefrontController {
  private orderService: OrderService;
  private productRepository = AppDataSource.getRepository(Product);
  private sellerProductRepository = AppDataSource.getRepository(SellerProduct);
  private sellerRepository = AppDataSource.getRepository(Seller);

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * POST /api/v1/storefront/orders
   * Create order from frontend cart
   */
  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestData = req.body as CreateStorefrontOrderRequest;

      // Validate request
      if (!requestData.customer || !requestData.items || requestData.items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid request: customer and items are required'
        });
        return;
      }

      // Convert frontend items to OrderItem[]
      const orderItems: OrderItem[] = [];

      for (const item of requestData.items) {
        const product = await this.productRepository.findOne({
          where: { id: item.product_id },
          relations: ['supplier']
        });

        if (!product) {
          res.status(404).json({
            success: false,
            error: `Product not found: ${item.product_id}`
          });
          return;
        }

        // Get seller information
        let sellerId = '';
        let sellerName = 'Unknown Seller';
        let sellerPrice = product.recommendedPrice || 0;

        if (item.seller_id) {
          // Try to get SellerProduct for accurate pricing and seller info
          const sellerProduct = await this.sellerProductRepository.findOne({
            where: {
              sellerId: item.seller_id,
              productId: item.product_id,
              isActive: true
            },
            relations: ['seller']
          });

          if (sellerProduct) {
            sellerId = sellerProduct.sellerId;
            sellerName = sellerProduct.seller?.branding?.storeName || 'Unknown Seller';
            sellerPrice = sellerProduct.sellerPrice;
          } else {
            // Fallback: get seller info directly
            const seller = await this.sellerRepository.findOne({
              where: { id: item.seller_id }
            });
            if (seller) {
              sellerId = seller.id;
              sellerName = seller.branding?.storeName || 'Unknown Seller';
            }
          }
        }

        // Build OrderItem
        const orderItem: OrderItem = {
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          productSku: product.sku || '',
          productImage: product.getMainImage() || '',
          productBrand: product.brand,
          quantity: item.quantity,
          unitPrice: sellerPrice,
          totalPrice: sellerPrice * item.quantity,

          // Supplier info
          supplierId: product.supplierId,
          supplierName: product.supplier?.businessInfo?.businessName || 'Unknown Supplier',

          // Seller info (Phase 3)
          sellerId: sellerId,
          sellerName: sellerName,
        };

        orderItems.push(orderItem);
      }

      // Use guest user ID or create temporary buyer
      // For Phase 3, we'll use a placeholder buyer ID
      // TODO: Implement proper guest checkout or require login
      const buyerId = req.user?.id || 'guest-buyer-' + Date.now();

      // Convert customer address to Order Address format
      const shippingAddress = {
        recipientName: requestData.customer.name,
        phone: requestData.customer.phone,
        email: requestData.customer.email,
        zipCode: requestData.customer.address.postcode,
        address: requestData.customer.address.addr1,
        detailAddress: requestData.customer.address.addr2 || '',
        city: '',
        country: 'KR'
      };

      // Create order via OrderService
      const order = await this.orderService.createOrder(buyerId, {
        items: orderItems,
        billingAddress: shippingAddress,
        shippingAddress: shippingAddress,
        paymentMethod: (requestData.payment_method as PaymentMethod) || PaymentMethod.CARD,
        customerNotes: ''
      });

      res.status(201).json({
        success: true,
        data: order
      });

      logger.info(`Storefront order created: ${order.orderNumber}`, {
        orderId: order.id,
        itemCount: orderItems.length,
        total: order.summary.total
      });

    } catch (error) {
      logger.error('Error creating storefront order:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order'
      });
    }
  };

  /**
   * GET /api/v1/storefront/orders/:id
   * Get order details by ID
   */
  getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Allow access to order (no auth required for Phase 3)
      // TODO: Implement order lookup by email/phone for security
      const order = await this.orderService.getOrderById(id);

      res.json({
        success: true,
        data: order
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      logger.error('Error getting storefront order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch order'
      });
    }
  };
}
