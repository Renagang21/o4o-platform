/**
 * AI References API Routes
 * AI 참조 데이터 관리 (Blocks, Shortcodes, Image Prompts, etc.)
 * Admin 권한 필요
 */

import { Router, Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { AIReference } from '../entities/AIReference.js';
import { authenticate } from '../middleware/auth.middleware.js';
import type { AuthRequest } from '../types/auth.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware.js';
import logger from '../utils/logger.js';

const router: Router = Router();

// 레이트리밋 설정
const readRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1분
  max: 100, // 분당 100회
  message: 'AI 참조 데이터 요청이 너무 많습니다.'
});

const writeRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1분
  max: 30, // 분당 30회
  message: 'AI 참조 데이터 쓰기 요청이 너무 많습니다.'
});

/**
 * Get all AI references with optional filters
 * GET /api/ai/references?type=blocks&status=active&appSlug=google-gemini-text
 */
router.get('/', authenticate, readRateLimit, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { type, status, appSlug, format } = req.query;

  try {
    const repository = AppDataSource.getRepository(AIReference);
    const queryBuilder = repository.createQueryBuilder('ref');

    // Apply filters
    if (type) {
      queryBuilder.andWhere('ref.type = :type', { type });
    }
    if (status) {
      queryBuilder.andWhere('ref.status = :status', { status });
    }
    if (appSlug !== undefined) {
      if (appSlug === 'null' || appSlug === '') {
        queryBuilder.andWhere('ref.appSlug IS NULL');
      } else {
        queryBuilder.andWhere('ref.appSlug = :appSlug', { appSlug });
      }
    }
    if (format) {
      queryBuilder.andWhere('ref.format = :format', { format });
    }

    queryBuilder.orderBy('ref.type', 'ASC').addOrderBy('ref.name', 'ASC');

    const references = await queryBuilder.getMany();

    logger.info('AI references listed', {
      userId: authReq.user?.userId,
      filters: { type, status, appSlug, format },
      count: references.length
    });

    res.json({
      success: true,
      data: references,
      meta: {
        total: references.length
      }
    });
  } catch (error: any) {
    logger.error('Error listing AI references:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI references',
      message: error.message
    });
  }
});

/**
 * Get specific AI reference by ID
 * GET /api/ai/references/:id
 */
router.get('/:id', authenticate, readRateLimit, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const repository = AppDataSource.getRepository(AIReference);
    const reference = await repository.findOne({ where: { id } });

    if (!reference) {
      return res.status(404).json({
        success: false,
        error: 'AI reference not found'
      });
    }

    res.json({
      success: true,
      data: reference
    });
  } catch (error: any) {
    logger.error('Error fetching AI reference:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI reference',
      message: error.message
    });
  }
});

/**
 * Get AI reference by type and name
 * GET /api/ai/references/by-name/:type/:name
 */
router.get('/by-name/:type/:name', authenticate, readRateLimit, async (req: Request, res: Response) => {
  const { type, name } = req.params;

  try {
    const repository = AppDataSource.getRepository(AIReference);
    const reference = await repository.findOne({
      where: { type, name }
    });

    if (!reference) {
      return res.status(404).json({
        success: false,
        error: 'AI reference not found'
      });
    }

    res.json({
      success: true,
      data: reference
    });
  } catch (error: any) {
    logger.error('Error fetching AI reference by name:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI reference',
      message: error.message
    });
  }
});

/**
 * Create new AI reference
 * POST /api/ai/references
 */
router.post('/', authenticate, writeRateLimit, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const {
    type,
    name,
    description,
    content,
    format = 'markdown',
    version,
    schemaVersion,
    appSlug,
    status = 'active'
  } = req.body;

  // Validation
  if (!type || !name || !content) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: type, name, content'
    });
  }

  try {
    const repository = AppDataSource.getRepository(AIReference);

    // Check for duplicate type+name
    const existing = await repository.findOne({
      where: { type, name }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'AI reference with this type and name already exists'
      });
    }

    // Create new reference
    const reference = repository.create({
      type,
      name,
      description,
      content,
      format,
      version,
      schemaVersion,
      appSlug: appSlug || null,
      status,
      createdBy: authReq.user?.userId,
      updatedBy: authReq.user?.userId
    });

    await repository.save(reference);

    logger.info('AI reference created', {
      userId: authReq.user?.userId,
      referenceId: reference.id,
      type,
      name
    });

    res.status(201).json({
      success: true,
      data: reference
    });
  } catch (error: any) {
    logger.error('Error creating AI reference:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create AI reference',
      message: error.message
    });
  }
});

/**
 * Update AI reference
 * PUT /api/ai/references/:id
 */
router.put('/:id', authenticate, writeRateLimit, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const {
    description,
    content,
    format,
    version,
    schemaVersion,
    appSlug,
    status
  } = req.body;

  try {
    const repository = AppDataSource.getRepository(AIReference);
    const reference = await repository.findOne({ where: { id } });

    if (!reference) {
      return res.status(404).json({
        success: false,
        error: 'AI reference not found'
      });
    }

    // Update fields
    if (description !== undefined) reference.description = description;
    if (content !== undefined) reference.content = content;
    if (format !== undefined) reference.format = format;
    if (version !== undefined) reference.version = version;
    if (schemaVersion !== undefined) reference.schemaVersion = schemaVersion;
    if (appSlug !== undefined) reference.appSlug = appSlug || null;
    if (status !== undefined) reference.status = status;
    reference.updatedBy = authReq.user?.userId || null;

    await repository.save(reference);

    logger.info('AI reference updated', {
      userId: authReq.user?.userId,
      referenceId: reference.id,
      type: reference.type,
      name: reference.name
    });

    res.json({
      success: true,
      data: reference
    });
  } catch (error: any) {
    logger.error('Error updating AI reference:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI reference',
      message: error.message
    });
  }
});

/**
 * Delete AI reference
 * DELETE /api/ai/references/:id
 */
router.delete('/:id', authenticate, writeRateLimit, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;

  try {
    const repository = AppDataSource.getRepository(AIReference);
    const reference = await repository.findOne({ where: { id } });

    if (!reference) {
      return res.status(404).json({
        success: false,
        error: 'AI reference not found'
      });
    }

    await repository.remove(reference);

    logger.info('AI reference deleted', {
      userId: authReq.user?.userId,
      referenceId: id,
      type: reference.type,
      name: reference.name
    });

    res.json({
      success: true,
      message: 'AI reference deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting AI reference:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete AI reference',
      message: error.message
    });
  }
});

/**
 * Get reference types statistics
 * GET /api/ai/references/stats/types
 */
router.get('/stats/types', authenticate, readRateLimit, async (req: Request, res: Response) => {
  try {
    const repository = AppDataSource.getRepository(AIReference);
    const stats = await repository
      .createQueryBuilder('ref')
      .select('ref.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('ref.status', 'status')
      .groupBy('ref.type')
      .addGroupBy('ref.status')
      .getRawMany();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Error fetching AI reference stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

export default router;
