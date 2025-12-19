/**
 * AI Schema Routes
 * Sprint 2 - P2: JSON Schema validation endpoint (SSOT)
 *
 * Provides JSON Schema for AI output validation with ETag caching
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import type { AuthRequest } from '../types/auth.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware.js';
import {
  AI_OUTPUT_JSON_SCHEMA,
  AI_OUTPUT_SCHEMA_VERSION,
  AI_OUTPUT_SCHEMA_METADATA,
  SCHEMA_MIGRATIONS,
  SCHEMA_DEPRECATIONS
} from '../schemas/ai-output.schema.js';
import logger from '../utils/logger.js';

const router: Router = Router();

// AI schema endpoint rate limit (generous for read-only reference)
const aiSchemaRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per user
  message: 'AI schema requests exceeded. Please try again later.',
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return `ai:schema:${authReq.user?.userId || req.ip || 'anonymous'}`;
  }
});

/**
 * GET /api/ai/schema
 * Returns JSON Schema for AI output validation
 *
 * Features:
 * - ETag caching (304 Not Modified for unchanged schema)
 * - schemaVersion tracking
 * - lastUpdated timestamp
 * - JWT authentication required
 */
router.get('/',
  authenticate,
  aiSchemaRateLimit,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const startTime = Date.now();

    try {
      // Generate ETag from schemaVersion (schema version serves as unique identifier)
      const etag = `"${AI_OUTPUT_SCHEMA_VERSION}"`;

      // Check client ETag (304 Not Modified)
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag === etag) {
        const duration = Date.now() - startTime;

        logger.info('AI schema - 304 Not Modified', {
          userId: authReq.user?.userId,
          userEmail: authReq.user?.email,
          route: '/api/ai/schema',
          method: 'GET',
          status: 304,
          etag,
          schemaVersion: AI_OUTPUT_SCHEMA_VERSION,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });

        return res.status(304).set({
          'Cache-Control': 'public, max-age=3600', // 1 hour caching
          'ETag': etag
        }).end();
      }

      // Return schema with caching headers
      res.set({
        'Cache-Control': 'public, max-age=3600', // 1 hour caching
        'ETag': etag,
        'Content-Type': 'application/json'
      });

      const duration = Date.now() - startTime;

      logger.info('AI schema - Success', {
        userId: authReq.user?.userId,
        userEmail: authReq.user?.email,
        route: '/api/ai/schema',
        method: 'GET',
        status: 200,
        etag,
        schemaVersion: AI_OUTPUT_SCHEMA_VERSION,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: {
          schema: AI_OUTPUT_JSON_SCHEMA,
          metadata: AI_OUTPUT_SCHEMA_METADATA,
          migrations: SCHEMA_MIGRATIONS, // Sprint 3: Migration history
          deprecations: SCHEMA_DEPRECATIONS // Sprint 3: Deprecated fields
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('AI schema error', {
        userId: authReq.user?.userId,
        userEmail: authReq.user?.email,
        route: '/api/ai/schema',
        method: 'GET',
        status: 500,
        error: error.message,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI output schema',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/ai/schema/version
 * Returns current schema version (lightweight endpoint)
 */
router.get('/version',
  authenticate,
  aiSchemaRateLimit,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    try {
      res.json({
        success: true,
        data: {
          schemaVersion: AI_OUTPUT_SCHEMA_VERSION,
          lastUpdated: AI_OUTPUT_SCHEMA_METADATA.lastUpdated
        }
      });

      logger.info('AI schema version check', {
        userId: authReq.user?.userId,
        schemaVersion: AI_OUTPUT_SCHEMA_VERSION
      });

    } catch (error: any) {
      logger.error('AI schema version error', {
        userId: authReq.user?.userId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch schema version'
      });
    }
  }
);

/**
 * GET /api/ai/schema/history
 * Sprint 3: Get schema version history with migrations and changes
 * Returns full migration history with diffs between versions
 */
router.get('/history',
  authenticate,
  aiSchemaRateLimit,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    try {
      // Build version history from migrations
      const versions: any[] = [
        {
          version: AI_OUTPUT_SCHEMA_VERSION,
          releaseDate: AI_OUTPUT_SCHEMA_METADATA.lastUpdated,
          current: true,
          deprecations: SCHEMA_DEPRECATIONS.filter(d => d.deprecatedIn === AI_OUTPUT_SCHEMA_VERSION),
          breaking: false,
        }
      ];

      // Add historical versions from migrations
      SCHEMA_MIGRATIONS.forEach(migration => {
        const existingVersion = versions.find(v => v.version === migration.fromVersion);

        if (!existingVersion) {
          versions.push({
            version: migration.fromVersion,
            releaseDate: migration.date,
            current: false,
            changes: [],
            breaking: false,
          });
        }

        versions.push({
          version: migration.toVersion,
          releaseDate: migration.date,
          current: migration.toVersion === AI_OUTPUT_SCHEMA_VERSION,
          changes: migration.changes,
          breaking: migration.breaking,
          migrationGuide: migration.migrationGuide,
          deprecations: SCHEMA_DEPRECATIONS.filter(d => d.deprecatedIn === migration.toVersion),
        });
      });

      // Sort by version (newest first)
      versions.sort((a, b) => b.version.localeCompare(a.version));

      logger.info('AI schema history retrieved', {
        userId: authReq.user?.userId,
        totalVersions: versions.length,
      });

      res.json({
        success: true,
        data: {
          versions,
          currentVersion: AI_OUTPUT_SCHEMA_VERSION,
          totalMigrations: SCHEMA_MIGRATIONS.length,
          totalDeprecations: SCHEMA_DEPRECATIONS.length,
        }
      });

    } catch (error: any) {
      logger.error('AI schema history error', {
        userId: authReq.user?.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch schema history',
      });
    }
  }
);

export default router;
