/**
 * Advanced Query API Routes (v2)
 *
 * Provides advanced querying capabilities with security validation,
 * caching, and complex filtering.
 */

import { Router, Request, Response } from 'express';
import { RedisCache } from '../../cache/RedisCache.js';
import { QuerySecurityValidator, ForbiddenError } from '../../security/QuerySecurityValidator.js';
import logger from '../../utils/logger.js';
import { AppDataSource } from '../../database/connection.js';

const router: Router = Router();

// Initialize services
const cache = new RedisCache({
  defaultTTL: 300,
  keyPrefix: 'o4o:query:'
});

const validator = new QuerySecurityValidator();

// Initialize cache on startup
cache.initialize().catch(err => {
  logger.error('Failed to initialize query cache:', err);
});

/**
 * POST /api/v2/query
 * Execute an advanced query
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { source, where, sort, page, expand, aggregate, cache: cacheConfig } = req.body;

    // Validate query parameters
    await validator.validate(req.body, req.user?.id, undefined);

    // Generate cache key
    const cacheKey = generateCacheKey(req.body, req.user?.id);

    // Check cache
    if (cacheConfig?.enabled !== false) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached.data,
          meta: {
            ...cached.meta,
            cached: true
          }
        });
      }
    }

    // Execute query (simplified version)
    const startTime = Date.now();
    const result = await executeQuery({
      source,
      where,
      sort,
      page,
      expand,
      aggregate
    });

    const response = {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        query: {
          executionTime: Date.now() - startTime,
          cached: false,
          complexity: calculateComplexity(req.body)
        }
      }
    };

    // Cache the result
    if (cacheConfig?.enabled !== false) {
      const ttl = cacheConfig?.ttl || 300;
      await cache.set(cacheKey, response, ttl);
    }

    res.json(response);
  } catch (error) {
    handleQueryError(error, res);
  }
});

/**
 * GET /api/v2/query
 * Simple query execution (GET request)
 */
router.get('/query', async (req: Request, res: Response) => {
  try {
    const { source, limit = 10, offset = 0, sort } = req.query;

    if (!source) {
      return res.status(400).json({
        success: false,
        error: 'Source parameter is required'
      });
    }

    // Validate source
    await validator.validate({ source: source as string }, req.user?.id);

    const cacheKey = `simple:${source}:${limit}:${offset}:${sort}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, meta: { ...cached.meta, cached: true } });
    }

    // Execute simple query
    const result = await executeSimpleQuery(
      source as string,
      parseInt(limit as string),
      parseInt(offset as string),
      sort as string
    );

    const response = {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        cached: false
      }
    };

    await cache.set(cacheKey, response, 300);
    res.json(response);
  } catch (error) {
    handleQueryError(error, res);
  }
});

/**
 * POST /api/v2/query/validate
 * Validate a query without executing it
 */
router.post('/query/validate', async (req: Request, res: Response) => {
  try {
    await validator.validate(req.body, req.user?.id, undefined);

    res.json({
      success: true,
      valid: true,
      complexity: calculateComplexity(req.body)
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      res.status(403).json({
        success: false,
        valid: false,
        error: error.message
      });
    } else {
      handleQueryError(error, res);
    }
  }
});

/**
 * GET /api/v2/query/cache/stats
 * Get cache statistics
 */
router.get('/query/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await cache.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    handleQueryError(error, res);
  }
});

/**
 * DELETE /api/v2/query/cache
 * Invalidate cache
 */
router.delete('/query/cache', async (req: Request, res: Response) => {
  try {
    const { pattern, key } = req.body;

    if (pattern) {
      await cache.deletePattern(pattern);
    } else if (key) {
      await cache.delete(key);
    } else {
      await cache.flush();
    }

    res.json({
      success: true,
      message: 'Cache invalidated successfully'
    });
  } catch (error) {
    handleQueryError(error, res);
  }
});

// Helper functions

function generateCacheKey(params: any, userId?: string): string {
  const parts = [
    'query',
    params.source,
    JSON.stringify(params.where || {}),
    JSON.stringify(params.sort || []),
    JSON.stringify(params.expand || []),
    params.page?.limit,
    params.page?.cursor,
    userId
  ].filter(Boolean);

  return parts.join(':');
}

function calculateComplexity(params: any): number {
  let complexity = 10;

  if (params.expand) {
    complexity += params.expand.length * 20;
  }

  if (params.where) {
    const conditions = JSON.stringify(params.where).match(/AND|OR/g);
    complexity += (conditions?.length || 0) * 5;
  }

  if (params.sort) {
    complexity += params.sort.length * 5;
  }

  return Math.min(complexity, 100);
}

async function executeQuery(params: any): Promise<{ data: any[]; total: number }> {
  // Simplified query execution
  // In production, this would use the full AdvancedQueryService
  const { source, where, sort, page } = params;

  const repository = AppDataSource.getRepository(source);
  const queryBuilder = repository.createQueryBuilder(source);

  // Apply basic where conditions
  if (where) {
    Object.entries(where).forEach(([field, value]) => {
      queryBuilder.andWhere(`${source}.${field} = :${field}`, { [field]: value });
    });
  }

  // Apply sorting
  if (sort && sort.length > 0) {
    sort.forEach((s: any, index: number) => {
      if (index === 0) {
        queryBuilder.orderBy(`${source}.${s.field}`, s.order);
      } else {
        queryBuilder.addOrderBy(`${source}.${s.field}`, s.order);
      }
    });
  }

  // Apply pagination
  const limit = page?.limit || 10;
  queryBuilder.take(limit);

  if (page?.offset) {
    queryBuilder.skip(page.offset);
  }

  const [data, total] = await queryBuilder.getManyAndCount();

  return { data, total };
}

async function executeSimpleQuery(
  source: string,
  limit: number,
  offset: number,
  sort?: string
): Promise<{ data: any[]; total: number }> {
  const repository = AppDataSource.getRepository(source);
  const queryBuilder = repository.createQueryBuilder(source);

  if (sort) {
    const [field, order] = sort.split(':');
    queryBuilder.orderBy(`${source}.${field}`, order === 'desc' ? 'DESC' : 'ASC');
  }

  queryBuilder.take(limit).skip(offset);

  const [data, total] = await queryBuilder.getManyAndCount();

  return { data, total };
}

function handleQueryError(error: any, res: Response): void {
  logger.error('Query error:', error);

  if (error instanceof ForbiddenError) {
    res.status(403).json({
      success: false,
      error: error.message
    });
  } else if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: error.message
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default router;
