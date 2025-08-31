import request from 'supertest';
import { Express } from 'express';
import { AppDataSource } from '../../database/connection';
import { VendorInfo } from '../../entities/VendorInfo';
import { Supplier } from '../../entities/Supplier';
import { VendorCommission } from '../../entities/VendorCommission';
import { CommissionSettlement } from '../../entities/CommissionSettlement';
import { User } from '../../entities/User';
import jwt from 'jsonwebtoken';

describe('Commission System Integration Tests', () => {
  let app: Express;
  let adminToken: string;
  let vendorToken: string;
  let vendorUser: User;
  let supplierUser: User;
  let vendor: VendorInfo;
  let supplier: Supplier;

  beforeAll(async () => {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Clean database
    await AppDataSource.synchronize(true);

    // Create test users
    const userRepository = AppDataSource.getRepository(User);
    
    const adminUser = userRepository.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'hashedPassword',
      role: 'admin',
      status: 'active',
    });
    await userRepository.save(adminUser);

    vendorUser = userRepository.create({
      name: 'Vendor User',
      email: 'vendor@test.com',
      password: 'hashedPassword',
      role: 'vendor',
      status: 'active',
    });
    await userRepository.save(vendorUser);

    supplierUser = userRepository.create({
      name: 'Supplier User',
      email: 'supplier@test.com',
      password: 'hashedPassword',
      role: 'supplier',
      status: 'active',
    });
    await userRepository.save(supplierUser);

    // Create test vendor
    const vendorRepository = AppDataSource.getRepository(VendorInfo);
    vendor = vendorRepository.create({
      vendorName: 'Test Vendor',
      vendorType: 'company',
      contactName: 'John Doe',
      contactPhone: '+1-555-123-4567',
      contactEmail: 'vendor@test.com',
      userId: vendorUser.id,
      status: 'active',
      affiliateCode: 'TEST001',
      affiliateRate: 12.5,
      totalSales: 0,
      totalRevenue: 0,
    });
    await vendorRepository.save(vendor);

    // Create test supplier
    const supplierRepository = AppDataSource.getRepository(Supplier);
    supplier = supplierRepository.create({
      companyName: 'Test Supplier Co.',
      supplierType: 'manufacturer',
      contactName: 'Jane Smith',
      contactEmail: 'supplier@test.com',
      contactPhone: '+1-555-987-6543',
      status: 'active',
      defaultMarginRate: 15,
      totalOrders: 0,
      totalOrderValue: 0,
      totalProducts: 0,
      activeProducts: 0,
    });
    await supplierRepository.save(supplier);

    // Generate tokens
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      jwtSecret,
      { expiresIn: '1h' }
    );
    
    vendorToken = jwt.sign(
      { id: vendorUser.id, email: vendorUser.email, role: vendorUser.role },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe('Vendor Commission Flow', () => {
    let commissionId: string;

    it('should calculate vendor commission for current month', async () => {
      const commissionService = new (await import('../../services/commission.service')).CommissionService(
        AppDataSource.getRepository(VendorCommission),
        AppDataSource.getRepository(CommissionSettlement),
        AppDataSource.getRepository(VendorInfo),
        AppDataSource.getRepository(Supplier),
        AppDataSource.getRepository('Order'),
        AppDataSource.getRepository('SupplierProduct'),
        null
      );

      const period = '2024-01';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const commission = await commissionService.calculateVendorCommission(
        vendor.id,
        period,
        startDate,
        endDate
      );

      expect(commission).toBeDefined();
      expect(commission.vendorId).toBe(vendor.id);
      expect(commission.period).toBe(period);
      expect(commission.status).toBe('pending');

      commissionId = commission.id;
    });

    it('should get vendor commission history', async () => {
      if (!app) {
        const { createApp } = await import('../../app');
        app = createApp();
      }

      const response = await request(app)
        .get(`/api/vendors/${vendor.id}/commission`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 0) {
        const commission = response.body.data[0];
        expect(commission).toHaveProperty('id');
        expect(commission).toHaveProperty('period');
        expect(commission).toHaveProperty('totalPayable');
        expect(commission).toHaveProperty('status');
      }
    });

    it('should approve vendor commission (admin only)', async () => {
      if (commissionId) {
        const commissionService = new (await import('../../services/commission.service')).CommissionService(
          AppDataSource.getRepository(VendorCommission),
          AppDataSource.getRepository(CommissionSettlement),
          AppDataSource.getRepository(VendorInfo),
          AppDataSource.getRepository(Supplier),
          AppDataSource.getRepository('Order'),
          AppDataSource.getRepository('SupplierProduct'),
          null
        );

        const approvedCommission = await commissionService.approveVendorCommission(
          commissionId,
          'admin-user-id'
        );

        expect(approvedCommission.status).toBe('approved');
        expect(approvedCommission.approvedBy).toBe('admin-user-id');
        expect(approvedCommission.approvedAt).toBeDefined();
      }
    });

    it('should mark vendor commission as paid', async () => {
      if (commissionId) {
        const commissionService = new (await import('../../services/commission.service')).CommissionService(
          AppDataSource.getRepository(VendorCommission),
          AppDataSource.getRepository(CommissionSettlement),
          AppDataSource.getRepository(VendorInfo),
          AppDataSource.getRepository(Supplier),
          AppDataSource.getRepository('Order'),
          AppDataSource.getRepository('SupplierProduct'),
          null
        );

        const paidCommission = await commissionService.markVendorCommissionPaid(
          commissionId,
          {
            paymentMethod: 'bank_transfer',
            paymentReference: 'TXN123456',
            paidAmount: 1250.00,
          }
        );

        expect(paidCommission.status).toBe('paid');
        expect(paidCommission.paymentMethod).toBe('bank_transfer');
        expect(paidCommission.paymentReference).toBe('TXN123456');
        expect(paidCommission.paidAmount).toBe(1250.00);
        expect(paidCommission.paidAt).toBeDefined();
      }
    });
  });

  describe('Supplier Settlement Flow', () => {
    let settlementId: string;

    it('should calculate supplier settlement for current month', async () => {
      const commissionService = new (await import('../../services/commission.service')).CommissionService(
        AppDataSource.getRepository(VendorCommission),
        AppDataSource.getRepository(CommissionSettlement),
        AppDataSource.getRepository(VendorInfo),
        AppDataSource.getRepository(Supplier),
        AppDataSource.getRepository('Order'),
        AppDataSource.getRepository('SupplierProduct'),
        null
      );

      const period = '2024-01';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const settlement = await commissionService.calculateSupplierSettlement(
        supplier.id,
        period,
        startDate,
        endDate
      );

      expect(settlement).toBeDefined();
      expect(settlement.supplierId).toBe(supplier.id);
      expect(settlement.period).toBe(period);
      expect(settlement.status).toBe('pending');

      settlementId = settlement.id;
    });

    it('should approve supplier settlement', async () => {
      if (settlementId) {
        const commissionService = new (await import('../../services/commission.service')).CommissionService(
          AppDataSource.getRepository(VendorCommission),
          AppDataSource.getRepository(CommissionSettlement),
          AppDataSource.getRepository(VendorInfo),
          AppDataSource.getRepository(Supplier),
          AppDataSource.getRepository('Order'),
          AppDataSource.getRepository('SupplierProduct'),
          null
        );

        const approvedSettlement = await commissionService.approveSupplierSettlement(
          settlementId,
          'admin-user-id'
        );

        expect(approvedSettlement.status).toBe('approved');
        expect(approvedSettlement.approvedBy).toBe('admin-user-id');
        expect(approvedSettlement.approvedAt).toBeDefined();
      }
    });
  });

  describe('Admin Commission Overview', () => {
    it('should get commission statistics', async () => {
      const commissionService = new (await import('../../services/commission.service')).CommissionService(
        AppDataSource.getRepository(VendorCommission),
        AppDataSource.getRepository(CommissionSettlement),
        AppDataSource.getRepository(VendorInfo),
        AppDataSource.getRepository(Supplier),
        AppDataSource.getRepository('Order'),
        AppDataSource.getRepository('SupplierProduct'),
        null
      );

      const stats = await commissionService.getCommissionStatistics();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('vendorCommissions');
      expect(stats).toHaveProperty('supplierSettlements');
      expect(stats).toHaveProperty('totalPending');
    });

    it('should get admin commission overview', async () => {
      if (!app) {
        const { createApp } = await import('../../app');
        app = createApp();
      }

      const response = await request(app)
        .get('/api/admin/commission-overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ timeRange: 'month', includeStats: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('financial');
    });
  });

  describe('Dashboard Integration', () => {
    it('should get integrated vendor dashboard', async () => {
      if (!app) {
        const { createApp } = await import('../../app');
        app = createApp();
      }

      const response = await request(app)
        .get(`/api/vendors/suppliers/${vendor.id}/dashboard`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('vendor');
      expect(response.body.data).toHaveProperty('commission');
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data).toHaveProperty('chartData');
    });

    it('should deny access to other vendor dashboards', async () => {
      if (!app) {
        const { createApp } = await import('../../app');
        app = createApp();
      }

      // Create another vendor
      const anotherVendor = AppDataSource.getRepository(VendorInfo).create({
        vendorName: 'Another Vendor',
        vendorType: 'individual',
        contactName: 'Bob Johnson',
        contactPhone: '+1-555-999-8888',
        contactEmail: 'bob@anothervendor.com',
        userId: 'different-user-id',
        status: 'active',
        affiliateCode: 'OTHER001',
        affiliateRate: 10,
        totalSales: 0,
        totalRevenue: 0,
      });
      await AppDataSource.getRepository(VendorInfo).save(anotherVendor);

      const response = await request(app)
        .get(`/api/vendors/suppliers/${anotherVendor.id}/dashboard`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('Webhook Integration', () => {
    it('should process commission payment success webhook', async () => {
      if (!app) {
        const { createApp } = await import('../../app');
        app = createApp();
      }

      const webhookPayload = {
        event: 'commission.payment.success',
        data: {
          commissionId: commissionId || 'test-commission-id',
          paymentId: 'pay_test123',
          amount: 1250.00,
          currency: 'USD',
          status: 'success',
          paymentMethod: 'bank_transfer',
          transactionId: 'txn_test456',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/webhooks/commission-status')
        .send(webhookPayload)
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', 'test-signature');

      // Note: This will fail signature verification in a real test
      // but demonstrates the webhook structure
      expect(response.status).toBe(401); // Invalid signature
      expect(response.body.errorCode).toBe('UNAUTHORIZED');
    });

    it('should get webhook logs (admin only)', async () => {
      if (!app) {
        const { createApp } = await import('../../app');
        app = createApp();
      }

      const response = await request(app)
        .get('/api/webhooks/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
      expect(response.body.data).toHaveProperty('pagination');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent vendor commission request', async () => {
      if (!app) {
        const { createApp } = await import('../../app');
        app = createApp();
      }

      const response = await request(app)
        .get('/api/vendors/00000000-0000-0000-0000-000000000000/commission')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('RESOURCE_NOT_FOUND');
    });

    it('should handle unauthorized access to admin endpoints', async () => {
      if (!app) {
        const { createApp } = await import('../../app');
        app = createApp();
      }

      const response = await request(app)
        .get('/api/admin/commission-overview')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache dashboard data and return cache hit header', async () => {
      if (!app) {
        const { createApp } = await import('../../app');
        app = createApp();
      }

      // First request - should populate cache
      const firstResponse = await request(app)
        .get(`/api/vendors/suppliers/${vendor.id}/dashboard`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.headers['x-cache-hit']).toBeFalsy();

      // Second request - should hit cache
      const secondResponse = await request(app)
        .get(`/api/vendors/suppliers/${vendor.id}/dashboard`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.headers['x-cache-hit']).toBe('true');
    });
  });
});