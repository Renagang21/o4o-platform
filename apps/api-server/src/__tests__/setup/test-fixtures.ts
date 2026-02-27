/**
 * Test Fixtures
 * Phase B-4 Step 9 - Mock data for integration tests
 */

import { getTestDataSource } from './test-database.js';
import { User } from '../../modules/auth/entities/User.js';
import { Seller } from '../../modules/dropshipping/entities/Seller.js';
import { Supplier } from '../../modules/dropshipping/entities/Supplier.js';
import { Partner } from '../../modules/dropshipping/entities/Partner.js';
import { Product, ProductStatus } from '../../modules/commerce/entities/Product.js';
import { Order, OrderStatus, PaymentStatus } from '../../modules/commerce/entities/Order.js';
import { OrderItem } from '../../modules/commerce/entities/OrderItem.js';

export interface TestUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface TestSeller {
  id: string;
  userId: string;
  businessName: string;
}

export interface TestSupplier {
  id: string;
  userId: string;
  companyName: string;
}

export interface TestProduct {
  id: string;
  supplierId: string;
  name: string;
  price: number;
  basePrice: number;
}

export interface TestOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  items: OrderItem[];
}

/**
 * Create test user
 */
export async function createTestUser(data: Partial<User> = {}): Promise<TestUser> {
  const dataSource = getTestDataSource();
  const userRepo = dataSource.getRepository(User);

  const user = await userRepo.save({
    username: `test_user_${Date.now()}_${Math.random()}`,
    email: `test_${Date.now()}_${Math.random()}@test.com`,
    password: 'test123',
    role: 'buyer',
    ...data
  });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.roles?.[0]
  };
}

/**
 * Create test seller
 */
export async function createTestSeller(userId?: string): Promise<TestSeller> {
  const dataSource = getTestDataSource();
  const sellerRepo = dataSource.getRepository(Seller);

  if (!userId) {
    const user = await createTestUser({ role: 'seller' });
    userId = user.id;
  }

  const seller = await sellerRepo.save({
    userId,
    businessName: `Test Seller Business ${Date.now()}`,
    businessNumber: `${Date.now()}`,
    contactEmail: `seller_${Date.now()}@test.com`,
    contactPhone: '010-1234-5678',
    status: 'ACTIVE',
    approvedProductCount: 0
  });

  return {
    id: seller.id,
    userId: seller.userId,
    businessName: seller.businessName
  };
}

/**
 * Create test supplier
 */
export async function createTestSupplier(userId?: string): Promise<TestSupplier> {
  const dataSource = getTestDataSource();
  const supplierRepo = dataSource.getRepository(Supplier);

  if (!userId) {
    const user = await createTestUser({ role: 'supplier' });
    userId = user.id;
  }

  const supplier = await supplierRepo.save({
    userId,
    companyName: `Test Supplier Co. ${Date.now()}`,
    businessNumber: `${Date.now()}`,
    contactEmail: `supplier_${Date.now()}@test.com`,
    contactPhone: '010-9876-5432',
    status: 'ACTIVE'
  });

  return {
    id: supplier.id,
    userId: supplier.userId,
    companyName: supplier.companyName
  };
}

/**
 * Create test partner
 */
export async function createTestPartner(userId?: string): Promise<{ id: string; userId: string }> {
  const dataSource = getTestDataSource();
  const partnerRepo = dataSource.getRepository(Partner);

  if (!userId) {
    const user = await createTestUser({ role: 'partner' });
    userId = user.id;
  }

  const partner = await partnerRepo.save({
    userId,
    companyName: `Test Partner ${Date.now()}`,
    businessNumber: `${Date.now()}`,
    contactEmail: `partner_${Date.now()}@test.com`,
    contactPhone: '010-5555-6666',
    referralCode: `REF${Date.now()}`,
    commissionRate: 5,
    status: 'ACTIVE'
  });

  return {
    id: partner.id,
    userId: partner.userId
  };
}

/**
 * Create test product
 */
export async function createTestProduct(supplierId: string, data: Partial<Product> = {}): Promise<TestProduct> {
  const dataSource = getTestDataSource();
  const productRepo = dataSource.getRepository(Product);

  const product = await productRepo.save({
    supplierId,
    name: `Test Product ${Date.now()}`,
    description: 'Test product description',
    price: 50000,
    basePrice: 40000,
    status: ProductStatus.ACTIVE,
    inventory: 100,
    trackInventory: true,
    lowStockThreshold: 10,
    ...data
  });

  return {
    id: product.id,
    supplierId: product.supplierId,
    name: product.name,
    price: product.price,
    basePrice: product.basePrice
  };
}

/**
 * Create test order with items
 */
export async function createTestOrder(params: {
  buyerId: string;
  sellerId: string;
  supplierId: string;
  productId: string;
  quantity?: number;
  partnerId?: string;
}): Promise<TestOrder> {
  const dataSource = getTestDataSource();
  const orderRepo = dataSource.getRepository(Order);
  const orderItemRepo = dataSource.getRepository(OrderItem);

  const quantity = params.quantity || 2;
  const unitPrice = 55000;
  const basePrice = 40000;
  const totalPrice = unitPrice * quantity;
  const commissionAmount = totalPrice * 0.2; // 20% commission

  const order = await orderRepo.save({
    orderNumber: `TEST-${Date.now()}`,
    buyerId: params.buyerId,
    buyerName: 'Test Buyer',
    buyerEmail: 'buyer@test.com',
    buyerGrade: 'BRONZE',
    orderDate: new Date(),
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.COMPLETED,
    billingAddress: {
      recipientName: 'Test Buyer',
      phone: '010-1111-2222',
      zipCode: '12345',
      address: 'Test Address',
      detailAddress: '',
      city: 'Seoul',
      country: 'KR'
    },
    shippingAddress: {
      recipientName: 'Test Buyer',
      phone: '010-1111-2222',
      zipCode: '12345',
      address: 'Test Address',
      detailAddress: '',
      city: 'Seoul',
      country: 'KR'
    },
    summary: {
      subtotal: totalPrice,
      discount: 0,
      shipping: 3000,
      tax: 0,
      total: totalPrice + 3000
    },
    partnerId: params.partnerId || null,
    referralCode: params.partnerId ? `REF${params.partnerId.slice(0, 8)}` : null
  });

  const orderItem = await orderItemRepo.save({
    orderId: order.id,
    productId: params.productId,
    sellerId: params.sellerId,
    supplierId: params.supplierId,
    productName: 'Test Product',
    productSku: 'TEST-SKU',
    productImage: 'test.jpg',
    quantity,
    unitPrice,
    basePriceSnapshot: basePrice,
    totalPrice,
    commissionAmount,
    attributes: params.partnerId ? { partnerId: params.partnerId } : undefined
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    buyerId: order.buyerId,
    items: [orderItem]
  };
}

/**
 * Create complete test scenario (all parties + order)
 */
export async function createCompleteTestScenario(): Promise<{
  buyer: TestUser;
  seller: TestSeller;
  supplier: TestSupplier;
  partner: { id: string; userId: string };
  product: TestProduct;
  order: TestOrder;
}> {
  const buyer = await createTestUser({ role: 'buyer' });
  const seller = await createTestSeller();
  const supplier = await createTestSupplier();
  const partner = await createTestPartner();
  const product = await createTestProduct(supplier.id);
  const order = await createTestOrder({
    buyerId: buyer.id,
    sellerId: seller.id,
    supplierId: supplier.id,
    productId: product.id,
    partnerId: partner.id
  });

  return {
    buyer,
    seller,
    supplier,
    partner,
    product,
    order
  };
}
