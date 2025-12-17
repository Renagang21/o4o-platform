/**
 * PartnerEarningsService Unit Tests
 *
 * Phase 10: STEP 5-B
 * Tests partner earnings management logic
 */

import {
  PartnerEarningsService,
  CreatePartnerEarningsDto,
  EarningsFilter,
  EarningsSummary,
} from '../../backend/services/partner-earnings.service';
import { PartnerEarnings, EarningsType, EarningsStatus, EventType } from '../../backend/entities/partner-earnings.entity';

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

describe('PartnerEarningsService', () => {
  let service: PartnerEarningsService;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;

  // Test data factories
  const createEarnings = (overrides: Partial<PartnerEarnings> = {}): PartnerEarnings => {
    const earnings = new PartnerEarnings();
    earnings.id = overrides.id || 'earnings-123';
    earnings.partnerId = overrides.partnerId || 'partner-123';
    earnings.earningsType = overrides.earningsType || 'commission';
    earnings.eventType = overrides.eventType || 'SALE';
    earnings.eventValue = overrides.eventValue || 100000;
    earnings.amount = overrides.amount || 10000;
    earnings.status = overrides.status || 'pending';
    earnings.orderId = overrides.orderId;
    earnings.linkId = overrides.linkId;
    earnings.routineId = overrides.routineId;
    earnings.productId = overrides.productId;
    earnings.metadata = overrides.metadata || {};
    earnings.createdAt = overrides.createdAt || new Date();
    earnings.updatedAt = overrides.updatedAt || new Date();
    return earnings;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = createMockRepository();
    mockQueryBuilder = createMockQueryBuilder();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    service = new PartnerEarningsService(mockRepo as any);
  });

  describe('logCommission', () => {
    it('should create and save earnings record', async () => {
      // Arrange
      const dto: CreatePartnerEarningsDto = {
        partnerId: 'partner-123',
        earningsType: 'commission',
        amount: 10000,
        orderId: 'order-123',
      };
      const expectedEarnings = createEarnings({ ...dto, status: 'pending' });

      mockRepo.create.mockReturnValue(expectedEarnings);
      mockRepo.save.mockResolvedValue(expectedEarnings);

      // Act
      const result = await service.logCommission(dto);

      // Assert
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: dto.partnerId,
          earningsType: dto.earningsType,
          amount: dto.amount,
          status: 'pending',
        })
      );
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.partnerId).toBe(dto.partnerId);
    });
  });

  describe('findById', () => {
    it('should return earnings when found', async () => {
      // Arrange
      const earnings = createEarnings({ id: 'earnings-123' });
      mockRepo.findOne.mockResolvedValue(earnings);

      // Act
      const result = await service.findById('earnings-123');

      // Assert
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'earnings-123' } });
      expect(result).toEqual(earnings);
    });

    it('should return null when not found', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByPartnerId', () => {
    it('should return all earnings for a partner', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const earnings = [
        createEarnings({ partnerId, amount: 10000 }),
        createEarnings({ partnerId, amount: 20000 }),
      ];
      mockRepo.find.mockResolvedValue(earnings);

      // Act
      const result = await service.findByPartnerId(partnerId);

      // Assert
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { partnerId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when partner has no earnings', async () => {
      // Arrange
      mockRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.findByPartnerId('partner-no-earnings');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findByFilter', () => {
    it('should filter by partnerId', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const filter: EarningsFilter = { partnerId: 'partner-123' };

      // Act
      await service.findByFilter(filter);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'earnings.partnerId = :partnerId',
        { partnerId: 'partner-123' }
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const filter: EarningsFilter = { status: 'available' };

      // Act
      await service.findByFilter(filter);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'earnings.status = :status',
        { status: 'available' }
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const filter: EarningsFilter = { startDate, endDate };

      // Act
      await service.findByFilter(filter);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'earnings.createdAt >= :startDate',
        { startDate }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'earnings.createdAt <= :endDate',
        { endDate }
      );
    });
  });

  describe('updateEarnings', () => {
    it('should update earnings status', async () => {
      // Arrange
      const existingEarnings = createEarnings({ id: 'earnings-123', status: 'pending' });
      const updatedEarnings = createEarnings({ ...existingEarnings, status: 'available' });

      mockRepo.findOne.mockResolvedValue(existingEarnings);
      mockRepo.save.mockResolvedValue(updatedEarnings);

      // Act
      const result = await service.updateEarnings('earnings-123', { status: 'available' });

      // Assert
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('available');
    });

    it('should throw error when earnings not found', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateEarnings('non-existent', { status: 'available' }))
        .rejects.toThrow('Partner earnings not found');
    });

    it('should set approvedAt when status changes to available', async () => {
      // Arrange
      const existingEarnings = createEarnings({ status: 'pending' });
      mockRepo.findOne.mockResolvedValue(existingEarnings);
      mockRepo.save.mockImplementation((e) => Promise.resolve(e));

      // Act
      const result = await service.updateEarnings('earnings-123', { status: 'available' });

      // Assert
      expect(result.approvedAt).toBeDefined();
    });
  });

  describe('approveEarnings', () => {
    it('should change status to available', async () => {
      // Arrange
      const existingEarnings = createEarnings({ status: 'pending' });
      mockRepo.findOne.mockResolvedValue(existingEarnings);
      mockRepo.save.mockImplementation((e) => Promise.resolve(e));

      // Act
      const result = await service.approveEarnings('earnings-123');

      // Assert
      expect(result.status).toBe('available');
      expect(result.approvedAt).toBeDefined();
    });
  });

  describe('processWithdrawal', () => {
    it('should process withdrawal when sufficient balance', async () => {
      // Arrange
      const availableEarnings = [
        createEarnings({ id: 'e1', amount: 30000, status: 'available' }),
        createEarnings({ id: 'e2', amount: 20000, status: 'available' }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(availableEarnings);
      mockRepo.findOne.mockResolvedValue(availableEarnings[0]);
      mockRepo.save.mockImplementation((e) => Promise.resolve(e));
      mockRepo.create.mockImplementation((data) => ({ ...data, id: 'withdrawal-123' }));

      // Act
      const result = await service.processWithdrawal('partner-123', 40000);

      // Assert
      expect(result.success).toBe(true);
      expect(result.amount).toBe(40000);
      expect(result.withdrawalId).toBeDefined();
    });

    it('should fail withdrawal when insufficient balance', async () => {
      // Arrange
      const availableEarnings = [
        createEarnings({ id: 'e1', amount: 10000, status: 'available' }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(availableEarnings);

      // Act
      const result = await service.processWithdrawal('partner-123', 50000);

      // Assert
      expect(result.success).toBe(false);
      expect(result.amount).toBe(0);
      expect(result.message).toContain('인출 가능 금액');
    });

    it('should fail withdrawal when no available earnings', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.processWithdrawal('partner-123', 10000);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('getAvailableBalance', () => {
    it('should return total available balance', async () => {
      // Arrange
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: '50000' });

      // Act
      const result = await service.getAvailableBalance('partner-123');

      // Assert
      expect(result).toBe(50000);
    });

    it('should return 0 when no available earnings', async () => {
      // Arrange
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: null });

      // Act
      const result = await service.getAvailableBalance('partner-123');

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('getEarningsSummary', () => {
    it('should calculate summary correctly', async () => {
      // Arrange
      const earnings = [
        createEarnings({ amount: 10000, status: 'pending', earningsType: 'commission' }),
        createEarnings({ amount: 20000, status: 'available', earningsType: 'commission' }),
        createEarnings({ amount: 30000, status: 'paid', earningsType: 'sale' }),
        createEarnings({ amount: -15000, status: 'withdrawn', earningsType: 'commission' }),
      ];
      mockRepo.find.mockResolvedValue(earnings);

      // Act
      const result = await service.getEarningsSummary('partner-123');

      // Assert
      expect(result.totalEarnings).toBe(60000); // 10000 + 20000 + 30000 (excluding negative)
      expect(result.pendingEarnings).toBe(10000);
      expect(result.availableEarnings).toBe(20000);
      expect(result.paidEarnings).toBe(30000);
      expect(result.withdrawnEarnings).toBe(15000);
    });

    it('should return zeros for partner with no earnings', async () => {
      // Arrange
      mockRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.getEarningsSummary('partner-no-earnings');

      // Assert
      expect(result.totalEarnings).toBe(0);
      expect(result.pendingEarnings).toBe(0);
      expect(result.availableEarnings).toBe(0);
      expect(result.paidEarnings).toBe(0);
      expect(result.withdrawnEarnings).toBe(0);
    });

    it('should aggregate by earnings type', async () => {
      // Arrange
      const earnings = [
        createEarnings({ amount: 10000, earningsType: 'commission' }),
        createEarnings({ amount: 20000, earningsType: 'commission' }),
        createEarnings({ amount: 5000, earningsType: 'referral' }),
      ];
      mockRepo.find.mockResolvedValue(earnings);

      // Act
      const result = await service.getEarningsSummary('partner-123');

      // Assert
      expect(result.byType.commission).toBe(30000);
      expect(result.byType.referral).toBe(5000);
    });

    it('should generate monthly breakdown', async () => {
      // Arrange
      const jan = new Date('2024-01-15');
      const feb = new Date('2024-02-15');
      const earnings = [
        createEarnings({ amount: 10000, createdAt: jan }),
        createEarnings({ amount: 20000, createdAt: jan }),
        createEarnings({ amount: 15000, createdAt: feb }),
      ];
      mockRepo.find.mockResolvedValue(earnings);

      // Act
      const result = await service.getEarningsSummary('partner-123');

      // Assert
      expect(result.monthlyEarnings).toHaveLength(2);
      const janEntry = result.monthlyEarnings.find(m => m.month === '2024-01');
      const febEntry = result.monthlyEarnings.find(m => m.month === '2024-02');
      expect(janEntry?.amount).toBe(30000);
      expect(febEntry?.amount).toBe(15000);
    });
  });

  describe('delete', () => {
    it('should delete earnings and return true', async () => {
      // Arrange
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      // Act
      const result = await service.delete('earnings-123');

      // Assert
      expect(mockRepo.delete).toHaveBeenCalledWith('earnings-123');
      expect(result).toBe(true);
    });

    it('should return false when nothing deleted', async () => {
      // Arrange
      mockRepo.delete.mockResolvedValue({ affected: 0 });

      // Act
      const result = await service.delete('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });
});
