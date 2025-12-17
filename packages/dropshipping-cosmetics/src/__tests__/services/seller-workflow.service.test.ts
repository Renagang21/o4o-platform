/**
 * SellerWorkflowService Unit Tests
 *
 * Phase 10: STEP 5-A
 * Tests seller workflow session management
 */

import { Repository, SelectQueryBuilder } from 'typeorm';
import { SellerWorkflowService, StartSessionDTO, UpdateSessionDTO } from '../../backend/services/seller-workflow.service';
import { CosmeticsSellerWorkflowSession, CustomerProfile } from '../../backend/entities/seller-workflow-session.entity';

// Mock DataSource and Repository
const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
});

const createMockDataSource = (mockRepo: any) => ({
  getRepository: jest.fn().mockReturnValue(mockRepo),
  query: jest.fn().mockResolvedValue([]),
});

describe('SellerWorkflowService', () => {
  let service: SellerWorkflowService;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockDataSource: ReturnType<typeof createMockDataSource>;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;

  // Test data factories
  const createCustomerProfile = (overrides: Partial<CustomerProfile> = {}): CustomerProfile => ({
    skinTypes: overrides.skinTypes || ['dry'],
    concerns: overrides.concerns || ['wrinkles'],
    preferences: overrides.preferences || {},
    ageGroup: overrides.ageGroup || '30s',
    ...overrides,
  });

  const createSession = (overrides: Partial<CosmeticsSellerWorkflowSession> = {}): CosmeticsSellerWorkflowSession => {
    const session = new CosmeticsSellerWorkflowSession();
    session.id = overrides.id || 'session-123';
    session.sellerId = overrides.sellerId || 'seller-123';
    session.customerProfile = overrides.customerProfile || createCustomerProfile();
    session.recommendedProducts = overrides.recommendedProducts || [];
    session.recommendedRoutines = overrides.recommendedRoutines || [];
    session.metadata = overrides.metadata || { status: 'started' };
    session.createdAt = overrides.createdAt || new Date();
    session.updatedAt = overrides.updatedAt || new Date();
    return session;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = createMockRepository();
    mockQueryBuilder = createMockQueryBuilder();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockDataSource = createMockDataSource(mockRepo);
    service = new SellerWorkflowService(mockDataSource as any);
  });

  describe('startSession', () => {
    it('should create a new session with customer profile', async () => {
      // Arrange
      const dto: StartSessionDTO = {
        sellerId: 'seller-123',
        customerProfile: createCustomerProfile({ skinTypes: ['oily'], concerns: ['acne'] }),
        metadata: { customerName: 'Test Customer' },
      };

      const expectedSession = createSession({
        sellerId: dto.sellerId,
        customerProfile: dto.customerProfile,
        metadata: { ...dto.metadata, status: 'started' },
      });

      mockRepo.create.mockReturnValue(expectedSession);
      mockRepo.save.mockResolvedValue(expectedSession);

      // Act
      const result = await service.startSession(dto);

      // Assert
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: dto.sellerId,
          customerProfile: dto.customerProfile,
        })
      );
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.sellerId).toBe(dto.sellerId);
    });

    it('should generate product recommendations automatically', async () => {
      // Arrange
      const dto: StartSessionDTO = {
        sellerId: 'seller-123',
        customerProfile: createCustomerProfile({ concerns: ['wrinkles', 'dryness'] }),
      };

      const sessionWithRecommendations = createSession({
        recommendedProducts: [
          { productId: 'prod-1', score: 0.9, reason: 'Matches skin concern' },
        ],
      });

      mockRepo.create.mockReturnValue(sessionWithRecommendations);
      mockRepo.save.mockResolvedValue(sessionWithRecommendations);

      // Act
      const result = await service.startSession(dto);

      // Assert
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getSession', () => {
    it('should return session when found', async () => {
      // Arrange
      const sessionId = 'session-123';
      const expectedSession = createSession({ id: sessionId });
      mockRepo.findOne.mockResolvedValue(expectedSession);

      // Act
      const result = await service.getSession(sessionId);

      // Assert
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
      expect(result).toEqual(expectedSession);
    });

    it('should return null when session not found', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getSession('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('listSessionsBySeller', () => {
    it('should return sessions for a seller', async () => {
      // Arrange
      const sellerId = 'seller-123';
      const sessions = [
        createSession({ id: 'session-1', sellerId }),
        createSession({ id: 'session-2', sellerId }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(sessions);

      // Act
      const result = await service.listSessionsBySeller(sellerId);

      // Assert
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('session');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'session.sellerId = :sellerId',
        { sellerId }
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('session.createdAt', 'DESC');
      expect(result).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const sellerId = 'seller-123';
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.listSessionsBySeller(sellerId, { status: 'completed' });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "session.metadata->>'status' = :status",
        { status: 'completed' }
      );
    });

    it('should limit results when limit provided', async () => {
      // Arrange
      const sellerId = 'seller-123';
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.listSessionsBySeller(sellerId, { limit: 10 });

      // Assert
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('updateSession', () => {
    it('should update session metadata', async () => {
      // Arrange
      const sessionId = 'session-123';
      const existingSession = createSession({ id: sessionId, metadata: { status: 'started' } });
      const updatedSession = createSession({
        ...existingSession,
        metadata: { status: 'started', notes: 'Updated notes' },
      });

      mockRepo.findOne.mockResolvedValue(existingSession);
      mockRepo.save.mockResolvedValue(updatedSession);

      const dto: UpdateSessionDTO = {
        metadata: { notes: 'Updated notes' },
      };

      // Act
      const result = await service.updateSession(sessionId, dto);

      // Assert
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result?.metadata.notes).toBe('Updated notes');
    });

    it('should return null when session not found', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.updateSession('non-existent', { metadata: {} });

      // Assert
      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should update recommended products when provided', async () => {
      // Arrange
      const existingSession = createSession({ recommendedProducts: [] });
      const newProducts = [{ productId: 'prod-new', score: 0.95, reason: 'Manual add' }];

      mockRepo.findOne.mockResolvedValue(existingSession);
      mockRepo.save.mockImplementation((session) => Promise.resolve(session));

      // Act
      const result = await service.updateSession('session-123', {
        recommendedProducts: newProducts,
      });

      // Assert
      expect(result?.recommendedProducts).toEqual(newProducts);
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed', async () => {
      // Arrange
      const existingSession = createSession({ metadata: { status: 'started' } });
      const completedSession = createSession({
        ...existingSession,
        metadata: { status: 'completed', purchasedProducts: ['prod-1'] },
      });

      mockRepo.findOne.mockResolvedValue(existingSession);
      mockRepo.save.mockResolvedValue(completedSession);

      // Act
      const result = await service.completeSession('session-123', ['prod-1']);

      // Assert
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result?.metadata.status).toBe('completed');
      expect(result?.metadata.purchasedProducts).toContain('prod-1');
    });

    it('should return null when session not found', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.completeSession('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle empty purchased products', async () => {
      // Arrange
      const existingSession = createSession();
      mockRepo.findOne.mockResolvedValue(existingSession);
      mockRepo.save.mockImplementation((session) => Promise.resolve(session));

      // Act
      const result = await service.completeSession('session-123');

      // Assert
      expect(result?.metadata.purchasedProducts).toEqual([]);
    });
  });

  describe('getSellerStats', () => {
    it('should return correct stats for seller with sessions', async () => {
      // Arrange
      const sellerId = 'seller-123';
      const sessions = [
        createSession({
          metadata: { status: 'completed' },
          recommendedProducts: [{ productId: 'p1', score: 0.9, reason: '' }],
        }),
        createSession({
          metadata: { status: 'started' },
          recommendedProducts: [
            { productId: 'p2', score: 0.8, reason: '' },
            { productId: 'p3', score: 0.7, reason: '' },
          ],
        }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(sessions);

      // Act
      const result = await service.getSellerStats(sellerId);

      // Assert
      expect(result.totalSessions).toBe(2);
      expect(result.completedSessions).toBe(1);
      expect(result.averageProductsRecommended).toBe(1.5);
    });

    it('should return zeros when seller has no sessions', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.getSellerStats('seller-no-sessions');

      // Assert
      expect(result.totalSessions).toBe(0);
      expect(result.completedSessions).toBe(0);
      expect(result.averageProductsRecommended).toBe(0);
    });
  });
});
