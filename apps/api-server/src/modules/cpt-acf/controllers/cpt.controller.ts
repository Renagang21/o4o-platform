import { Request, Response } from 'express';
import { cptService } from '../../../services/cpt/cpt.service.js';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { CPT_PAGINATION, CPT_QUERY_DEFAULTS } from '../../../config/cpt.constants.js';
import { toPostListResponse, toPostSingleResponse } from '../../../dto/post.dto.js';

/**
 * CPT Controller - HTTP layer only, delegates business logic to service
 * Refactored to follow clean architecture pattern
 */
export class CPTController {
  /**
   * Get all CPTs
   */
  static async getAllCPTs(req: Request, res: Response) {
    try {
      const { active, includeInactive } = req.query;
      
      // If includeInactive is true, get all CPTs regardless of active status
      // Otherwise, use the active parameter (default to true for backward compatibility)
      let filterActive = active === 'true' || active === undefined;
      if (includeInactive === 'true') {
        filterActive = undefined; // Don't filter by active status
      }
      
      const result = await cptService.getAllCPTs(filterActive);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - getAllCPTs:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get CPT by slug
   */
  static async getCPTBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const result = await cptService.getCPTBySlug(slug);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - getCPTBySlug:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Create CPT
   */
  static async createCPT(req: AuthRequest, res: Response) {
    try {
      const result = await cptService.createCPT(req.body);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Controller error - createCPT:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Update CPT
   */
  static async updateCPT(req: AuthRequest, res: Response) {
    try {
      const { slug } = req.params;
      const result = await cptService.updateCPT(slug, req.body);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - updateCPT:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Delete CPT
   */
  static async deleteCPT(req: AuthRequest, res: Response) {
    try {
      const { slug } = req.params;
      const result = await cptService.deleteCPT(slug);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - deleteCPT:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get posts by CPT
   * Returns standardized response format: { data: Post[], meta: { total, page, ... } }
   */
  static async getPostsByCPT(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const {
        page = String(CPT_PAGINATION.DEFAULT_PAGE),
        limit = String(CPT_PAGINATION.DEFAULT_LIMIT),
        status,
        search,
        orderBy = CPT_QUERY_DEFAULTS.ORDER_BY,
        order = CPT_QUERY_DEFAULTS.ORDER
      } = req.query;

      const result = await cptService.getPostsByCPT(slug, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as any,
        search: search as string,
        orderBy: orderBy as string,
        order: order as 'ASC' | 'DESC'
      });

      if (!result.success) {
        return res.status(404).json(result);
      }

      // Transform to standard DTO format
      const response = toPostListResponse(
        result.data || [],
        result.pagination
      );

      res.json(response);
    } catch (error: any) {
      logger.error('Controller error - getPostsByCPT:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get post by ID
   */
  static async getPostById(req: Request, res: Response) {
    try {
      const { slug, postId } = req.params;

      // This can be implemented in the service
      res.json({
        success: true,
        message: 'Get post by ID - to be implemented'
      });
    } catch (error: any) {
      logger.error('Controller error - getPostById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Create post
   */
  static async createPost(req: AuthRequest, res: Response) {
    try {
      const { slug } = req.params;
      const userId = req.user?.id || '';

      const result = await cptService.createPost(slug, req.body, userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Controller error - createPost:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Update post
   */
  static async updatePost(req: AuthRequest, res: Response) {
    try {
      const { postId } = req.params;

      const result = await cptService.updatePost(postId, req.body);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - updatePost:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Delete post
   */
  static async deletePost(req: AuthRequest, res: Response) {
    try {
      const { postId } = req.params;

      const result = await cptService.deletePost(postId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - deletePost:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Initialize defaults
   */
  static async initializeDefaults(req: Request, res: Response) {
    try {
      const result = await cptService.initializeDefaults();
      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - initializeDefaults:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Aliases for backward compatibility
  static async getCPT(req: Request, res: Response) {
    return CPTController.getCPTBySlug(req, res);
  }

  static async getCPTPosts(req: Request, res: Response) {
    return CPTController.getPostsByCPT(req, res);
  }
}