/**
 * MarketTrialController
 *
 * Phase 1 & 2 API: REST endpoints for Market Trial operations.
 *
 * Phase 1 Endpoints:
 * - POST   /                      - Create trial
 * - GET    /                      - List trials
 * - GET    /:id                   - Get trial details
 * - POST   /:id/participate       - Participate in trial
 * - GET    /:id/participants      - Get participants
 *
 * Phase 2 Endpoints (Decision):
 * - POST   /:id/decision/seller   - Submit seller decision
 * - POST   /:id/decision/partner  - Submit partner decision
 * - GET    /:id/decisions         - Get decisions for trial
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { MarketTrialService } from '../services/MarketTrialService.js';
import { MarketTrialDecisionService } from '../services/MarketTrialDecisionService.js';
import { MarketTrialStatus, ParticipantType, DecisionType } from '../entities/index.js';
import {
  validateCreateRequest,
  validateParticipateRequest,
  validateSellerDecisionRequest,
  validatePartnerDecisionRequest,
} from '../dto/index.js';

/**
 * Create Market Trial Controller
 */
export function createMarketTrialController(dataSource: DataSource): Router {
  const router = Router();
  const service = new MarketTrialService(dataSource);
  const decisionService = new MarketTrialDecisionService(dataSource);

  /**
   * POST /api/market-trials
   * Create a new Market Trial
   * Permission: Supplier
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      // Validate request
      const validatedData = validateCreateRequest(req.body);

      // Get supplier ID from request context or body
      const supplierId = (req as any).user?.supplierId || req.body.supplierId;

      if (!supplierId) {
        return res.status(400).json({
          success: false,
          error: 'supplierId is required',
        });
      }

      const trial = await service.createTrial({
        supplierId,
        productId: validatedData.productId,
        title: validatedData.title,
        description: validatedData.description,
        trialUnitPrice: validatedData.trialUnitPrice,
        targetAmount: validatedData.targetAmount,
        fundingStartAt: new Date(validatedData.fundingStartAt),
        fundingEndAt: new Date(validatedData.fundingEndAt),
        trialPeriodDays: validatedData.trialPeriodDays,
      });

      res.status(201).json({
        success: true,
        data: toResponse(trial),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/market-trials
   * List Market Trials with optional filtering
   * Permission: Seller / Partner / Supplier
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { status, supplierId } = req.query;

      const filter: { status?: MarketTrialStatus; supplierId?: string } = {};

      if (status && Object.values(MarketTrialStatus).includes(status as MarketTrialStatus)) {
        filter.status = status as MarketTrialStatus;
      }

      if (supplierId) {
        filter.supplierId = supplierId as string;
      }

      const trials = await service.listTrials(filter);

      res.json({
        success: true,
        data: trials.map(toResponse),
        total: trials.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/market-trials/:id
   * Get Market Trial details with forum information
   * Permission: Seller / Partner / Supplier
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const result = await service.getTrialWithForum(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Market Trial not found',
        });
      }

      res.json({
        success: true,
        data: {
          ...toResponse(result.trial),
          forumId: result.forumId,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/market-trials/:id/participate
   * Participate in a Market Trial
   * Permission: Seller / Partner
   */
  router.post('/:id/participate', async (req: Request, res: Response) => {
    try {
      // Validate request
      const validatedData = validateParticipateRequest(req.body);

      // Get participant info from request context or body
      const participantId = (req as any).user?.id || req.body.participantId;
      const participantTypeRaw = req.body.participantType || 'seller';

      if (!participantId) {
        return res.status(400).json({
          success: false,
          error: 'participantId is required',
        });
      }

      // Validate participant type
      const participantType = participantTypeRaw === 'partner'
        ? ParticipantType.PARTNER
        : ParticipantType.SELLER;

      const participation = await service.participate(req.params.id, {
        participantId,
        participantType,
        contributionAmount: validatedData.contributionAmount,
      });

      res.status(201).json({
        success: true,
        data: {
          id: participation.id,
          marketTrialId: participation.marketTrialId,
          participantId: participation.participantId,
          participantType: participation.participantType,
          contributionAmount: Number(participation.contributionAmount),
          createdAt: participation.createdAt.toISOString(),
        },
      });
    } catch (error) {
      const status = (error as Error).message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/market-trials/:id/participants
   * Get participants for a trial
   * Permission: Seller / Partner / Supplier
   */
  router.get('/:id/participants', async (req: Request, res: Response) => {
    try {
      const participants = await service.getParticipants(req.params.id);

      res.json({
        success: true,
        data: participants.map((p) => ({
          id: p.id,
          marketTrialId: p.marketTrialId,
          participantId: p.participantId,
          participantType: p.participantType,
          contributionAmount: Number(p.contributionAmount),
          createdAt: p.createdAt.toISOString(),
        })),
        total: participants.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // =====================================================
  // Phase 2: Decision (의사 표현) Endpoints
  // =====================================================

  /**
   * POST /api/market-trials/:id/decision/seller
   * Submit seller decision (CONTINUE or STOP)
   * Permission: SELLER only
   */
  router.post('/:id/decision/seller', async (req: Request, res: Response) => {
    try {
      // Validate request
      const validatedData = validateSellerDecisionRequest(req.body);

      // Get participant ID from request context or body
      const participantId = (req as any).user?.id || req.body.participantId;

      if (!participantId) {
        return res.status(400).json({
          success: false,
          error: 'participantId is required',
        });
      }

      const result = await decisionService.submitSellerDecision(req.params.id, {
        participantId,
        decision: validatedData.decision as DecisionType,
      });

      res.status(201).json({
        success: true,
        data: {
          decision: toDecisionResponse(result.decision),
          applicationsCreated: result.applicationsCreated,
          applicationIds: result.applicationIds,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = message.includes('not found') ? 404 :
                     message.includes('already') ? 409 : 400;
      res.status(status).json({
        success: false,
        error: message,
      });
    }
  });

  /**
   * POST /api/market-trials/:id/decision/partner
   * Submit partner decision (CONTINUE or STOP)
   * Permission: PARTNER only
   */
  router.post('/:id/decision/partner', async (req: Request, res: Response) => {
    try {
      // Validate request
      const validatedData = validatePartnerDecisionRequest(req.body);

      // Get participant ID from request context or body
      const participantId = (req as any).user?.id || req.body.participantId;

      if (!participantId) {
        return res.status(400).json({
          success: false,
          error: 'participantId is required',
        });
      }

      const result = await decisionService.submitPartnerDecision(req.params.id, {
        participantId,
        decision: validatedData.decision as DecisionType,
        sellerIds: validatedData.sellerIds,
      });

      res.status(201).json({
        success: true,
        data: {
          decision: toDecisionResponse(result.decision),
          applicationsCreated: result.applicationsCreated,
          applicationIds: result.applicationIds,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = message.includes('not found') ? 404 :
                     message.includes('already') ? 409 :
                     message.includes('required') ? 400 : 400;
      res.status(status).json({
        success: false,
        error: message,
      });
    }
  });

  /**
   * GET /api/market-trials/:id/decisions
   * Get all decisions for a trial
   * Permission: Supplier / Admin
   */
  router.get('/:id/decisions', async (req: Request, res: Response) => {
    try {
      const decisions = await decisionService.getDecisionsByTrial(req.params.id);

      res.json({
        success: true,
        data: decisions.map(toDecisionResponse),
        total: decisions.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

/**
 * Convert trial entity to response format
 */
function toResponse(trial: any): any {
  return {
    id: trial.id,
    supplierId: trial.supplierId,
    productId: trial.productId,
    title: trial.title,
    description: trial.description,
    trialUnitPrice: Number(trial.trialUnitPrice),
    targetAmount: Number(trial.targetAmount),
    currentAmount: Number(trial.currentAmount),
    fundingStartAt: new Date(trial.fundingStartAt).toISOString(),
    fundingEndAt: new Date(trial.fundingEndAt).toISOString(),
    trialPeriodDays: trial.trialPeriodDays,
    status: trial.status,
    createdAt: new Date(trial.createdAt).toISOString(),
    updatedAt: new Date(trial.updatedAt).toISOString(),
  };
}

/**
 * Convert decision entity to response format
 */
function toDecisionResponse(decision: any): any {
  return {
    id: decision.id,
    marketTrialId: decision.marketTrialId,
    participantId: decision.participantId,
    participantType: decision.participantType,
    decision: decision.decision,
    selectedSellerIds: decision.selectedSellerIds
      ? JSON.parse(decision.selectedSellerIds)
      : null,
    createdAt: new Date(decision.createdAt).toISOString(),
  };
}

export default createMarketTrialController;
