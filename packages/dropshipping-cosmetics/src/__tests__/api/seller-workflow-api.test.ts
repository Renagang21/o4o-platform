/**
 * Seller Workflow API Tests
 *
 * Phase 10: STEP 5-D
 * Minimal API route tests for Seller Workflow endpoints
 *
 * Note: Controller requires authentication (req.user.id)
 */

import type { Request, Response } from 'express';
import { SellerWorkflowController } from '../../backend/controllers/seller-workflow.controller';
import { SellerWorkflowService } from '../../backend/services/seller-workflow.service';
import { CosmeticsSellerWorkflowSession } from '../../backend/entities/seller-workflow-session.entity';

// Mock Response helper
const createMockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

// Mock Request helper with auth context
const createMockRequest = (overrides: any = {}): any => ({
  params: {},
  query: {},
  body: {},
  user: null, // Default: no auth
  ...overrides,
});

// Mock Repository
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

// Test data factory
const createSession = (overrides: Partial<CosmeticsSellerWorkflowSession> = {}): CosmeticsSellerWorkflowSession => {
  const session = new CosmeticsSellerWorkflowSession();
  session.id = overrides.id || 'session-123';
  session.sellerId = overrides.sellerId || 'seller-123';
  session.customerProfile = overrides.customerProfile || {
    skinTypes: ['dry'],
    concerns: ['wrinkles'],
    preferences: {},
    ageGroup: '30s',
  };
  session.recommendedProducts = overrides.recommendedProducts || [];
  session.recommendedRoutines = overrides.recommendedRoutines || [];
  session.metadata = overrides.metadata || { status: 'started' };
  session.createdAt = overrides.createdAt || new Date();
  session.updatedAt = overrides.updatedAt || new Date();
  return session;
};

describe('Seller Workflow API Tests', () => {
  let controller: SellerWorkflowController;
  let service: SellerWorkflowService;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let mockDataSource: ReturnType<typeof createMockDataSource>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = createMockRepository();
    mockQueryBuilder = createMockQueryBuilder();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockDataSource = createMockDataSource(mockRepo);
    service = new SellerWorkflowService(mockDataSource as any);
    controller = new SellerWorkflowController(service);
  });

  describe('POST /workflow/session (startSession)', () => {
    it('should create new workflow session for authenticated user', async () => {
      // Arrange
      const sellerId = 'seller-123';
      const newSession = createSession({
        sellerId,
        customerProfile: {
          skinTypes: ['oily'],
          concerns: ['acne'],
          preferences: {},
          ageGroup: '20s',
        },
      });

      mockRepo.create.mockReturnValue(newSession);
      mockRepo.save.mockResolvedValue(newSession);

      const req = createMockRequest({
        user: { id: sellerId }, // Authenticated user
        body: {
          customerProfile: {
            skinTypes: ['oily'],
            concerns: ['acne'],
            ageGroup: '20s',
          },
        },
      });
      const res = createMockResponse();

      // Act
      await controller.startSession(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sellerId,
          }),
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      // Arrange: no user
      const req = createMockRequest({
        body: {
          customerProfile: { skinTypes: ['dry'] },
        },
      });
      const res = createMockResponse();

      // Act
      await controller.startSession(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required',
        })
      );
    });

    it('should return 400 when customerProfile is missing', async () => {
      // Arrange
      const req = createMockRequest({
        user: { id: 'seller-123' },
        body: {},
      });
      const res = createMockResponse();

      // Act
      await controller.startSession(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Customer profile is required',
        })
      );
    });
  });

  describe('GET /workflow/session/:id (getSession)', () => {
    it('should return session for owner', async () => {
      // Arrange
      const sellerId = 'seller-123';
      const session = createSession({ id: 'session-123', sellerId });
      mockRepo.findOne.mockResolvedValue(session);

      const req = createMockRequest({
        params: { id: 'session-123' },
        user: { id: sellerId },
      });
      const res = createMockResponse();

      // Act
      await controller.getSession(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'session-123',
          }),
        })
      );
    });

    it('should return 404 when session not found', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      const req = createMockRequest({
        params: { id: 'non-existent' },
        user: { id: 'seller-123' },
      });
      const res = createMockResponse();

      // Act
      await controller.getSession(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should return 403 when accessing other user session', async () => {
      // Arrange: session belongs to different seller
      const session = createSession({ sellerId: 'other-seller' });
      mockRepo.findOne.mockResolvedValue(session);

      const req = createMockRequest({
        params: { id: 'session-123' },
        user: { id: 'seller-123' }, // Different from session owner
      });
      const res = createMockResponse();

      // Act
      await controller.getSession(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Access denied'),
        })
      );
    });
  });

  describe('GET /workflow/sessions (listSessionsBySeller)', () => {
    it('should return sessions for authenticated seller', async () => {
      // Arrange
      const sellerId = 'seller-123';
      const sessions = [
        createSession({ id: 'session-1', sellerId }),
        createSession({ id: 'session-2', sellerId }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(sessions);

      const req = createMockRequest({
        user: { id: sellerId },
        query: {},
      });
      const res = createMockResponse();

      // Act
      await controller.listSessionsBySeller(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ sellerId }),
          ]),
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      // Arrange
      const req = createMockRequest({
        query: {},
      });
      const res = createMockResponse();

      // Act
      await controller.listSessionsBySeller(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('PUT /workflow/session/:id (updateSession)', () => {
    it('should update session for owner', async () => {
      // Arrange
      const sellerId = 'seller-123';
      const existingSession = createSession({
        id: 'session-123',
        sellerId,
        metadata: { status: 'started' },
      });
      const updatedSession = {
        ...existingSession,
        metadata: { status: 'started', notes: 'Customer prefers natural products' },
      };

      mockRepo.findOne.mockResolvedValue(existingSession);
      mockRepo.save.mockResolvedValue(updatedSession);

      const req = createMockRequest({
        params: { id: 'session-123' },
        user: { id: sellerId },
        body: {
          metadata: { notes: 'Customer prefers natural products' },
        },
      });
      const res = createMockResponse();

      // Act
      await controller.updateSession(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              notes: 'Customer prefers natural products',
            }),
          }),
        })
      );
    });

    it('should return 404 when updating non-existent session', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      const req = createMockRequest({
        params: { id: 'non-existent' },
        user: { id: 'seller-123' },
        body: { metadata: {} },
      });
      const res = createMockResponse();

      // Act
      await controller.updateSession(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when updating other user session', async () => {
      // Arrange
      const existingSession = createSession({ sellerId: 'other-seller' });
      mockRepo.findOne.mockResolvedValue(existingSession);

      const req = createMockRequest({
        params: { id: 'session-123' },
        user: { id: 'seller-123' },
        body: { metadata: {} },
      });
      const res = createMockResponse();

      // Act
      await controller.updateSession(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('POST /workflow/session/:id/complete (completeSession)', () => {
    it('should complete session for owner', async () => {
      // Arrange
      const sellerId = 'seller-123';
      const existingSession = createSession({
        id: 'session-123',
        sellerId,
        metadata: { status: 'started' },
      });
      const completedSession = {
        ...existingSession,
        metadata: { status: 'completed', purchasedProducts: ['prod-1', 'prod-2'] },
      };

      mockRepo.findOne.mockResolvedValue(existingSession);
      mockRepo.save.mockResolvedValue(completedSession);

      const req = createMockRequest({
        params: { id: 'session-123' },
        user: { id: sellerId },
        body: { purchasedProducts: ['prod-1', 'prod-2'] },
      });
      const res = createMockResponse();

      // Act
      await controller.completeSession(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              status: 'completed',
              purchasedProducts: ['prod-1', 'prod-2'],
            }),
          }),
        })
      );
    });

    it('should complete session without purchased products', async () => {
      // Arrange
      const sellerId = 'seller-123';
      const existingSession = createSession({
        id: 'session-123',
        sellerId,
        metadata: { status: 'started' },
      });
      const completedSession = {
        ...existingSession,
        metadata: { status: 'completed', purchasedProducts: [] },
      };

      mockRepo.findOne.mockResolvedValue(existingSession);
      mockRepo.save.mockResolvedValue(completedSession);

      const req = createMockRequest({
        params: { id: 'session-123' },
        user: { id: sellerId },
        body: {},
      });
      const res = createMockResponse();

      // Act
      await controller.completeSession(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              status: 'completed',
            }),
          }),
        })
      );
    });
  });

  describe('GET /workflow/stats (getSellerStats)', () => {
    it('should return seller statistics for authenticated user', async () => {
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

      const req = createMockRequest({
        user: { id: sellerId },
      });
      const res = createMockResponse();

      // Act
      await controller.getSellerStats(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalSessions: 2,
            completedSessions: 1,
            averageProductsRecommended: 1.5,
          }),
        })
      );
    });

    it('should return zeros for seller with no sessions', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'seller-no-sessions' },
      });
      const res = createMockResponse();

      // Act
      await controller.getSellerStats(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalSessions: 0,
            completedSessions: 0,
            averageProductsRecommended: 0,
          }),
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      // Arrange
      const req = createMockRequest({});
      const res = createMockResponse();

      // Act
      await controller.getSellerStats(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required',
        })
      );
    });
  });
});
