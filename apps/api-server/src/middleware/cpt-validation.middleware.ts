/**
 * CPT Validation Middleware
 * Phase 6: Runtime validation of CPT input and meta keys
 */

import { Request, Response, NextFunction } from 'express';
import { registry, validateCPTInput, validateMetaKey } from '@o4o/cpt-registry';
import logger from '../utils/logger.js';

/**
 * Middleware to validate CPT input against registered schema
 * Use on POST /api/v1/posts and PUT /api/v1/posts/:id
 */
export function validateCPTPayload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const { post_type, postType } = req.body;
    const cptSlug = post_type || postType;

    if (!cptSlug) {
      // No CPT specified, skip validation (standard post/page)
      return next();
    }

    // Get schema from registry
    const schema = registry.get(cptSlug);

    if (!schema) {
      logger.warn(`[CPT Validation] Unknown CPT: ${cptSlug}`);
      res.status(403).json({
        success: false,
        error: 'UNKNOWN_CPT',
        message: `CPT "${cptSlug}" is not registered. Available CPTs: ${registry.listNames().join(', ')}`,
      });
      return;
    }

    // Validate payload against schema
    const validation = validateCPTInput(schema, req.body);

    if (!validation.valid) {
      logger.warn(`[CPT Validation] Invalid payload for ${cptSlug}:`, validation.errors);
      res.status(400).json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'CPT validation failed',
        errors: validation.errors.map(err => ({
          field: err.field,
          message: err.message,
        })),
      });
      return;
    }

    logger.debug(`[CPT Validation] ✓ Validated ${cptSlug} payload`);
    next();
  } catch (error) {
    logger.error('[CPT Validation] Middleware error:', error);
    next(error); // Pass to error handler
  }
}

/**
 * Middleware to validate meta key against CPT schema whitelist
 * Use on PUT/PATCH/DELETE /api/v1/posts/:id/meta[...]
 */
export function validateMetaKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const { meta_key } = req.body || {};
    const metaKeyParam = req.params.key;
    const keyToValidate = meta_key || metaKeyParam;

    if (!keyToValidate) {
      res.status(400).json({
        success: false,
        error: 'MISSING_META_KEY',
        message: 'meta_key is required',
      });
      return;
    }

    // Get post_type from request (could be in body, query, or we need to fetch post)
    const { post_type, postType } = req.body || req.query;
    const cptSlug = (post_type || postType) as string;

    if (!cptSlug) {
      // If no CPT specified, we'll need to fetch the post to get its type
      // For now, skip validation if we can't determine CPT
      logger.debug(`[Meta Validation] No CPT specified, skipping validation for key: ${keyToValidate}`);
      return next();
    }

    const schema = registry.get(cptSlug);

    if (!schema) {
      logger.warn(`[Meta Validation] Unknown CPT: ${cptSlug}`);
      res.status(403).json({
        success: false,
        error: 'UNKNOWN_CPT',
        message: `CPT "${cptSlug}" is not registered`,
      });
      return;
    }

    // Validate meta key against schema
    const isValid = validateMetaKey(schema, keyToValidate);

    if (!isValid) {
      const allowed = schema.meta?.allowed || [];
      const forbidden = schema.meta?.forbidden || [];

      logger.warn(`[Meta Validation] Invalid meta key "${keyToValidate}" for CPT "${cptSlug}"`);
      res.status(400).json({
        success: false,
        error: 'INVALID_META_KEY',
        message: `Meta key "${keyToValidate}" is not allowed for CPT "${cptSlug}"`,
        hint: allowed.length > 0
          ? `Allowed keys: ${allowed.join(', ')}`
          : forbidden.length > 0
            ? `Forbidden keys: ${forbidden.join(', ')}`
            : 'Check CPT schema for meta key rules',
      });
      return;
    }

    logger.debug(`[Meta Validation] ✓ Validated meta key "${keyToValidate}" for ${cptSlug}`);
    next();
  } catch (error) {
    logger.error('[Meta Validation] Middleware error:', error);
    next(error); // Pass to error handler
  }
}

/**
 * Helper to extract CPT slug from post ID (if needed)
 * This would query the database to get the post's type
 */
export async function getCPTSlugFromPostId(postId: string): Promise<string | null> {
  // TODO: Implement if needed
  // const post = await postRepository.findOne({ where: { id: postId }, select: ['post_type'] });
  // return post?.post_type || null;
  return null;
}
