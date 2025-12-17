/**
 * Earnings API Integration Tests
 *
 * Phase 10: STEP 5-D
 * Minimal API route tests for Partner Earnings endpoints
 */

import type { Request, Response } from 'express';
import { PartnerEarningsController } from '../../backend/controllers/partner-earnings.controller';
import { PartnerEarningsService } from '../../backend/services/partner-earnings.service';
import { PartnerEarnings } from '../../backend/entities/partner-earnings.entity';

// Mock Response helper
const createMockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

// Mock Request helper
const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
  params: {},
  query: {},
  body: {},
  ...overrides,
} as Request);

// Mock Repository
const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getRawOne: jest.fn(),
});

// Test data factory
const createEarnings = (overrides: Partial<PartnerEarnings> = {}): PartnerEarnings => {
  const earnings = new PartnerEarnings();
  earnings.id = overrides.id || 'earnings-123';
  earnings.partnerId = overrides.partnerId || 'partner-123';
  earnings.earningsType = overrides.earningsType || 'commission';
  earnings.eventType = overrides.eventType || 'SALE';
  earnings.eventValue = overrides.eventValue || 100000;
  earnings.amount = overrides.amount || 10000;
  earnings.status = overrides.status || 'pending';
  earnings.metadata = overrides.metadata || {};
  earnings.createdAt = overrides.createdAt || new Date();
  earnings.updatedAt = overrides.updatedAt || new Date();
  return earnings;
};

describe('Earnings API Tests', () => {
  let controller: PartnerEarningsController;
  let service: PartnerEarningsService;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = createMockRepository();
    mockQueryBuilder = createMockQueryBuilder();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    service = new PartnerEarningsService(mockRepo as any);
    controller = new PartnerEarningsController(service);
  });

  describe('GET /earnings/my', () => {
    it('should return earnings list for authenticated partner', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const earnings = [
        createEarnings({ partnerId, amount: 10000 }),
        createEarnings({ partnerId, amount: 20000 }),
      ];
      mockRepo.find.mockResolvedValue(earnings);

      const req = createMockRequest({
        partnerId, // Set by auth middleware
      } as any);
      const res = createMockResponse();

      // Act
      await controller.findByPartnerId(req as any, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ partnerId }),
          ]),
        })
      );
    });

    it('should return empty array when no earnings', async () => {
      // Arrange
      const partnerId = 'partner-no-earnings';
      mockRepo.find.mockResolvedValue([]);

      const req = createMockRequest({
        partnerId,
      } as any);
      const res = createMockResponse();

      // Act
      await controller.findByPartnerId(req as any, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
        })
      );
    });
  });

  describe('GET /earnings/my/summary', () => {
    it('should return earnings summary for authenticated partner', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const earnings = [
        createEarnings({ partnerId, amount: 10000, status: 'pending', earningsType: 'commission' }),
        createEarnings({ partnerId, amount: 20000, status: 'available', earningsType: 'commission' }),
      ];
      mockRepo.find.mockResolvedValue(earnings);

      const req = createMockRequest({
        partnerId,
      } as any);
      const res = createMockResponse();

      // Act
      await controller.getSummary(req as any, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalEarnings: 30000,
            pendingEarnings: 10000,
            availableEarnings: 20000,
          }),
        })
      );
    });
  });

  describe('GET /earnings/my/balance', () => {
    it('should return available balance', async () => {
      // Arrange
      const partnerId = 'partner-123';
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: '25000' });

      const req = createMockRequest({
        partnerId,
      } as any);
      const res = createMockResponse();

      // Act
      await controller.getAvailableBalance(req as any, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            partnerId,
            availableBalance: 25000,
          }),
        })
      );
    });
  });

  describe('POST /earnings/my/withdraw', () => {
    it('should process withdrawal successfully', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const availableEarnings = [
        createEarnings({ id: 'e1', partnerId, amount: 30000, status: 'available' }),
      ];

      mockQueryBuilder.getMany.mockResolvedValue(availableEarnings);
      mockRepo.findOne.mockResolvedValue(availableEarnings[0]);
      mockRepo.save.mockImplementation((e) => Promise.resolve(e));
      mockRepo.create.mockImplementation((data) => ({ ...data, id: 'withdrawal-123' }));

      const req = createMockRequest({
        partnerId,
        body: { amount: 25000 },
      } as any);
      const res = createMockResponse();

      // Act
      await controller.requestWithdrawal(req as any, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            success: true,
            amount: 25000,
          }),
        })
      );
    });

    it('should fail withdrawal when insufficient balance', async () => {
      // Arrange
      const partnerId = 'partner-123';
      mockQueryBuilder.getMany.mockResolvedValue([
        createEarnings({ partnerId, amount: 10000, status: 'available' }),
      ]);

      const req = createMockRequest({
        partnerId,
        body: { amount: 50000 },
      } as any);
      const res = createMockResponse();

      // Act
      await controller.requestWithdrawal(req as any, res);

      // Assert: Controller returns 400 with success: false directly
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: 'INSUFFICIENT_BALANCE',
        })
      );
    });
  });

  describe('GET /earnings/:id', () => {
    it('should return earnings by id', async () => {
      // Arrange
      const earnings = createEarnings({ id: 'earnings-123' });
      mockRepo.findOne.mockResolvedValue(earnings);

      const req = createMockRequest({
        params: { id: 'earnings-123' },
        partnerId: 'partner-123',
      } as any);
      const res = createMockResponse();

      // Act
      await controller.findById(req as any, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: 'earnings-123' }),
        })
      );
    });

    it('should return 404 when earnings not found', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      const req = createMockRequest({
        params: { id: 'non-existent' },
        partnerId: 'partner-123',
      } as any);
      const res = createMockResponse();

      // Act
      await controller.findById(req as any, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('POST /earnings', () => {
    it('should create new earnings record', async () => {
      // Arrange
      const newEarnings = createEarnings({
        partnerId: 'partner-123',
        amount: 15000,
        orderId: 'order-001',
      });
      mockRepo.create.mockReturnValue(newEarnings);
      mockRepo.save.mockResolvedValue(newEarnings);

      const req = createMockRequest({
        body: {
          partnerId: 'partner-123',
          earningsType: 'commission',
          amount: 15000,
          orderId: 'order-001',
        },
      });
      const res = createMockResponse();

      // Act
      await controller.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            partnerId: 'partner-123',
            amount: 15000,
          }),
        })
      );
    });
  });

  describe('POST /earnings/:id/approve', () => {
    it('should approve pending earnings', async () => {
      // Arrange
      const pendingEarnings = createEarnings({ id: 'earnings-123', status: 'pending' });
      const approvedEarnings = { ...pendingEarnings, status: 'available' as const, approvedAt: new Date() };

      mockRepo.findOne.mockResolvedValue(pendingEarnings);
      mockRepo.save.mockResolvedValue(approvedEarnings);

      const req = createMockRequest({
        params: { id: 'earnings-123' },
      });
      const res = createMockResponse();

      // Act
      await controller.approve(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'available',
          }),
        })
      );
    });
  });

  describe('DELETE /earnings/:id', () => {
    it('should delete earnings record', async () => {
      // Arrange
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      const req = createMockRequest({
        params: { id: 'earnings-123' },
      });
      const res = createMockResponse();

      // Act
      await controller.delete(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should return success: false when deleting non-existent earnings', async () => {
      // Arrange: delete returns affected: 0
      mockRepo.delete.mockResolvedValue({ affected: 0 });

      const req = createMockRequest({
        params: { id: 'non-existent' },
      });
      const res = createMockResponse();

      // Act
      await controller.delete(req, res);

      // Assert: Controller returns { success: false } (not 404)
      expect(res.json).toHaveBeenCalledWith({ success: false });
    });
  });
});
