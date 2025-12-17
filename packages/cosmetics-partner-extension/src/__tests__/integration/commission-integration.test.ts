/**
 * Commission Integration Tests
 *
 * Phase 10: STEP 5-C
 * Tests integration between CommissionEngine and PartnerEarnings
 *
 * 테스트 시나리오:
 * 1. 주문 없는 파트너 → earnings summary = 0
 * 2. 주문 1건 → commission 정상 계산
 * 3. 주문 다수 → 누적 합계 정확
 * 4. date range 필터 → 범위 내 데이터만 반환
 */

import { CommissionEngineService, CommissionCalculationInput } from '../../backend/services/commission-engine.service';
import { PartnerEarningsService, CreatePartnerEarningsDto } from '../../backend/services/partner-earnings.service';
import { CommissionPolicy } from '../../backend/entities/commission-policy.entity';
import { PartnerEarnings } from '../../backend/entities/partner-earnings.entity';

// Mock Repositories
const createMockPolicyRepository = () => ({
  createQueryBuilder: jest.fn(),
});

const createMockEarningsRepository = () => ({
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
  addOrderBy: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
  getMany: jest.fn(),
  getRawOne: jest.fn(),
});

// Test data factories
const createPolicy = (overrides: Partial<CommissionPolicy> = {}): CommissionPolicy => {
  const policy = new CommissionPolicy();
  policy.id = overrides.id || 'policy-123';
  policy.name = overrides.name || 'Test Policy';
  policy.policyType = overrides.policyType || 'PERCENT';
  policy.commissionRate = overrides.commissionRate ?? 0.10; // 10%
  policy.fixedAmount = overrides.fixedAmount ?? 0;
  policy.priority = overrides.priority ?? 0;
  policy.isActive = overrides.isActive ?? true;
  policy.partnerId = overrides.partnerId || null;
  policy.productId = overrides.productId || null;
  policy.campaignId = overrides.campaignId || null;
  policy.effectiveFrom = overrides.effectiveFrom || null;
  policy.effectiveTo = overrides.effectiveTo || null;
  policy.metadata = overrides.metadata || {};
  policy.createdAt = overrides.createdAt || new Date();
  policy.updatedAt = overrides.updatedAt || new Date();
  return policy;
};

const createEarnings = (overrides: Partial<PartnerEarnings> = {}): PartnerEarnings => {
  const earnings = new PartnerEarnings();
  earnings.id = overrides.id || 'earnings-' + Math.random().toString(36).substr(2, 9);
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

describe('Commission Integration Tests', () => {
  let commissionEngine: CommissionEngineService;
  let earningsService: PartnerEarningsService;
  let mockPolicyRepo: ReturnType<typeof createMockPolicyRepository>;
  let mockEarningsRepo: ReturnType<typeof createMockEarningsRepository>;
  let mockPolicyQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let mockEarningsQueryBuilder: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup policy repository
    mockPolicyRepo = createMockPolicyRepository();
    mockPolicyQueryBuilder = createMockQueryBuilder();
    mockPolicyRepo.createQueryBuilder.mockReturnValue(mockPolicyQueryBuilder);

    // Setup earnings repository
    mockEarningsRepo = createMockEarningsRepository();
    mockEarningsQueryBuilder = createMockQueryBuilder();
    mockEarningsRepo.createQueryBuilder.mockReturnValue(mockEarningsQueryBuilder);

    // Initialize services
    commissionEngine = new CommissionEngineService(mockPolicyRepo as any);
    earningsService = new PartnerEarningsService(mockEarningsRepo as any);
  });

  describe('시나리오 1: 주문 없는 파트너 → earnings summary = 0', () => {
    it('should return zero earnings summary for partner with no orders', async () => {
      // Arrange
      const partnerId = 'partner-no-orders';
      mockEarningsRepo.find.mockResolvedValue([]);

      // Act
      const summary = await earningsService.getEarningsSummary(partnerId);

      // Assert
      expect(summary.totalEarnings).toBe(0);
      expect(summary.pendingEarnings).toBe(0);
      expect(summary.availableEarnings).toBe(0);
      expect(summary.paidEarnings).toBe(0);
      expect(summary.withdrawnEarnings).toBe(0);
    });

    it('should return zero available balance for partner with no orders', async () => {
      // Arrange
      const partnerId = 'partner-no-orders';
      mockEarningsQueryBuilder.getRawOne.mockResolvedValue({ total: null });

      // Act
      const balance = await earningsService.getAvailableBalance(partnerId);

      // Assert
      expect(balance).toBe(0);
    });

    it('should return empty earnings list for partner with no orders', async () => {
      // Arrange
      const partnerId = 'partner-no-orders';
      mockEarningsRepo.find.mockResolvedValue([]);

      // Act
      const earnings = await earningsService.findByPartnerId(partnerId);

      // Assert
      expect(earnings).toEqual([]);
    });
  });

  describe('시나리오 2: 주문 1건 → commission 정상 계산', () => {
    it('should calculate commission correctly and log earnings', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const orderId = 'order-001';
      const orderValue = 100000; // 10만원 주문

      // Setup 10% commission policy
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.10,
        partnerId,
      });
      mockPolicyQueryBuilder.getOne.mockResolvedValue(policy);

      // Act: Calculate commission
      const calculationInput: CommissionCalculationInput = {
        partnerId,
        eventType: 'SALE',
        eventValue: orderValue,
      };
      const calcResult = await commissionEngine.calculate(calculationInput);

      // Assert commission calculation
      expect(calcResult.amount).toBe(10000); // 10% of 100,000
      expect(calcResult.policy).toEqual(policy);
      expect(calcResult.calculationDetails.policyType).toBe('PERCENT');
      expect(calcResult.calculationDetails.rate).toBe(0.10);

      // Act: Log earnings
      const earningsDto: CreatePartnerEarningsDto = {
        partnerId,
        earningsType: 'commission',
        amount: calcResult.amount,
        orderId,
      };
      const expectedEarnings = createEarnings({
        partnerId,
        amount: calcResult.amount,
        orderId,
        status: 'pending',
      });

      mockEarningsRepo.create.mockReturnValue(expectedEarnings);
      mockEarningsRepo.save.mockResolvedValue(expectedEarnings);

      const loggedEarnings = await earningsService.logCommission(earningsDto);

      // Assert earnings logging
      expect(mockEarningsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId,
          amount: 10000,
          orderId,
          status: 'pending',
        })
      );
      expect(loggedEarnings.amount).toBe(10000);
      expect(loggedEarnings.partnerId).toBe(partnerId);
    });

    it('should correctly reflect single order in earnings summary', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const singleEarnings = createEarnings({
        partnerId,
        amount: 10000,
        status: 'pending',
        earningsType: 'commission',
      });
      mockEarningsRepo.find.mockResolvedValue([singleEarnings]);

      // Act
      const summary = await earningsService.getEarningsSummary(partnerId);

      // Assert
      expect(summary.totalEarnings).toBe(10000);
      expect(summary.pendingEarnings).toBe(10000);
      expect(summary.availableEarnings).toBe(0);
      expect(summary.byType.commission).toBe(10000);
    });
  });

  describe('시나리오 3: 주문 다수 → 누적 합계 정확', () => {
    it('should accumulate earnings correctly from multiple orders', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const orders = [
        { orderId: 'order-001', value: 100000 }, // 10% = 10,000
        { orderId: 'order-002', value: 200000 }, // 10% = 20,000
        { orderId: 'order-003', value: 50000 },  // 10% = 5,000
      ];

      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.10,
      });
      mockPolicyQueryBuilder.getOne.mockResolvedValue(policy);

      // Act: Calculate commissions for all orders
      const results = await Promise.all(
        orders.map(order =>
          commissionEngine.calculate({
            partnerId,
            eventType: 'SALE',
            eventValue: order.value,
          })
        )
      );

      // Assert individual calculations
      expect(results[0].amount).toBe(10000);
      expect(results[1].amount).toBe(20000);
      expect(results[2].amount).toBe(5000);

      // Total accumulated should be 35,000
      const totalCommission = results.reduce((sum, r) => sum + r.amount, 0);
      expect(totalCommission).toBe(35000);
    });

    it('should calculate batch commissions correctly', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.10,
      });
      mockPolicyQueryBuilder.getOne.mockResolvedValue(policy);

      const inputs: CommissionCalculationInput[] = [
        { partnerId: 'partner-123', eventType: 'SALE', eventValue: 100000 },
        { partnerId: 'partner-123', eventType: 'SALE', eventValue: 200000 },
        { partnerId: 'partner-123', eventType: 'SALE', eventValue: 50000 },
      ];

      // Act
      const results = await commissionEngine.calculateBatch(inputs);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].amount).toBe(10000);
      expect(results[1].amount).toBe(20000);
      expect(results[2].amount).toBe(5000);

      const totalCommission = results.reduce((sum, r) => sum + r.amount, 0);
      expect(totalCommission).toBe(35000);
    });

    it('should reflect multiple orders in earnings summary', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const multipleEarnings = [
        createEarnings({ partnerId, amount: 10000, status: 'pending', earningsType: 'commission' }),
        createEarnings({ partnerId, amount: 20000, status: 'available', earningsType: 'commission' }),
        createEarnings({ partnerId, amount: 5000, status: 'paid', earningsType: 'commission' }),
      ];
      mockEarningsRepo.find.mockResolvedValue(multipleEarnings);

      // Act
      const summary = await earningsService.getEarningsSummary(partnerId);

      // Assert
      expect(summary.totalEarnings).toBe(35000);
      expect(summary.pendingEarnings).toBe(10000);
      expect(summary.availableEarnings).toBe(20000);
      expect(summary.paidEarnings).toBe(5000);
      expect(summary.byType.commission).toBe(35000);
    });

    it('should handle mixed earnings types correctly', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const mixedEarnings = [
        createEarnings({ partnerId, amount: 10000, status: 'available', earningsType: 'commission' }),
        createEarnings({ partnerId, amount: 5000, status: 'available', earningsType: 'referral' }),
        createEarnings({ partnerId, amount: 3000, status: 'available', earningsType: 'sale' }),
      ];
      mockEarningsRepo.find.mockResolvedValue(mixedEarnings);

      // Act
      const summary = await earningsService.getEarningsSummary(partnerId);

      // Assert
      expect(summary.totalEarnings).toBe(18000);
      expect(summary.byType.commission).toBe(10000);
      expect(summary.byType.referral).toBe(5000);
      expect(summary.byType.sale).toBe(3000);
    });
  });

  describe('시나리오 4: date range 필터 → 범위 내 데이터만 반환', () => {
    it('should filter earnings by date range', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockEarningsQueryBuilder.getMany.mockResolvedValue([
        createEarnings({ createdAt: new Date('2024-01-15'), amount: 10000 }),
        createEarnings({ createdAt: new Date('2024-01-20'), amount: 15000 }),
      ]);

      // Act
      const result = await earningsService.findByFilter({
        partnerId,
        startDate,
        endDate,
      });

      // Assert
      expect(mockEarningsQueryBuilder.andWhere).toHaveBeenCalledWith(
        'earnings.createdAt >= :startDate',
        { startDate }
      );
      expect(mockEarningsQueryBuilder.andWhere).toHaveBeenCalledWith(
        'earnings.createdAt <= :endDate',
        { endDate }
      );
      expect(result).toHaveLength(2);
    });

    it('should generate monthly breakdown for date range', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const jan = new Date('2024-01-15');
      const feb = new Date('2024-02-15');
      const mar = new Date('2024-03-15');

      const earnings = [
        createEarnings({ createdAt: jan, amount: 10000 }),
        createEarnings({ createdAt: jan, amount: 5000 }),
        createEarnings({ createdAt: feb, amount: 15000 }),
        createEarnings({ createdAt: mar, amount: 8000 }),
      ];
      mockEarningsRepo.find.mockResolvedValue(earnings);

      // Act
      const summary = await earningsService.getEarningsSummary(partnerId);

      // Assert
      expect(summary.monthlyEarnings).toHaveLength(3);

      const janEntry = summary.monthlyEarnings.find(m => m.month === '2024-01');
      const febEntry = summary.monthlyEarnings.find(m => m.month === '2024-02');
      const marEntry = summary.monthlyEarnings.find(m => m.month === '2024-03');

      expect(janEntry?.amount).toBe(15000);
      expect(febEntry?.amount).toBe(15000);
      expect(marEntry?.amount).toBe(8000);
    });

    it('should return empty results when no earnings in date range', async () => {
      // Arrange
      mockEarningsQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await earningsService.findByFilter({
        partnerId: 'partner-123',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
      });

      // Assert
      expect(result).toEqual([]);
    });

    it('should filter by status in addition to date range', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockEarningsQueryBuilder.getMany.mockResolvedValue([
        createEarnings({ createdAt: new Date('2024-01-15'), status: 'available' }),
      ]);

      // Act
      await earningsService.findByFilter({
        partnerId: 'partner-123',
        startDate,
        endDate,
        status: 'available',
      });

      // Assert
      expect(mockEarningsQueryBuilder.andWhere).toHaveBeenCalledWith(
        'earnings.status = :status',
        { status: 'available' }
      );
    });
  });

  describe('End-to-End: Order to Earnings Flow', () => {
    it('should complete full order-to-earnings flow', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const orderId = 'order-e2e-001';
      const orderValue = 150000;

      // Setup policy
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.12, // 12%
      });
      mockPolicyQueryBuilder.getOne.mockResolvedValue(policy);

      // Step 1: Calculate commission
      const calcResult = await commissionEngine.calculate({
        partnerId,
        eventType: 'SALE',
        eventValue: orderValue,
      });

      expect(calcResult.amount).toBe(18000); // 12% of 150,000

      // Step 2: Log earnings as pending
      const pendingEarnings = createEarnings({
        partnerId,
        amount: calcResult.amount,
        orderId,
        status: 'pending',
      });
      mockEarningsRepo.create.mockReturnValue(pendingEarnings);
      mockEarningsRepo.save.mockResolvedValue(pendingEarnings);

      const logged = await earningsService.logCommission({
        partnerId,
        earningsType: 'commission',
        amount: calcResult.amount,
        orderId,
      });

      expect(logged.status).toBe('pending');
      expect(logged.amount).toBe(18000);

      // Step 3: Approve earnings (status: pending → available)
      const approvedEarnings = { ...pendingEarnings, status: 'available' as const, approvedAt: new Date() };
      mockEarningsRepo.findOne.mockResolvedValue(pendingEarnings);
      mockEarningsRepo.save.mockResolvedValue(approvedEarnings);

      const approved = await earningsService.approveEarnings(logged.id);

      expect(approved?.status).toBe('available');
      expect(approved?.approvedAt).toBeDefined();

      // Step 4: Verify earnings summary
      mockEarningsRepo.find.mockResolvedValue([approvedEarnings]);
      const summary = await earningsService.getEarningsSummary(partnerId);

      expect(summary.availableEarnings).toBe(18000);
    });

    it('should handle withdrawal process correctly', async () => {
      // Arrange
      const partnerId = 'partner-123';
      const availableEarnings = [
        createEarnings({ id: 'e1', partnerId, amount: 20000, status: 'available' }),
        createEarnings({ id: 'e2', partnerId, amount: 15000, status: 'available' }),
      ];

      mockEarningsQueryBuilder.getMany.mockResolvedValue(availableEarnings);
      mockEarningsRepo.findOne.mockResolvedValue(availableEarnings[0]);
      mockEarningsRepo.save.mockImplementation((e) => Promise.resolve(e));
      mockEarningsRepo.create.mockImplementation((data) => ({ ...data, id: 'withdrawal-001' }));

      // Act: Process withdrawal of 30,000
      const result = await earningsService.processWithdrawal(partnerId, 30000);

      // Assert
      expect(result.success).toBe(true);
      expect(result.amount).toBe(30000);
      expect(result.withdrawalId).toBeDefined();
    });
  });
});
