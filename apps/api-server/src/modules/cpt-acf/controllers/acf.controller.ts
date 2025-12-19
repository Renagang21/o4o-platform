import { Request, Response } from 'express';
import { cptService } from '../../../services/cpt/cpt.service.js';
import { metaDataService } from '../../../services/MetaDataService.js';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';

/**
 * ACF Controller - HTTP layer only, delegates business logic to service
 * Refactored to follow clean architecture pattern
 */
export class ACFController {
  /**
   * Get field groups
   */
  static async getFieldGroups(req: Request, res: Response) {
    try {
      const result = await cptService.getFieldGroups();

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - getFieldGroups:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get field group by ID
   */
  static async getFieldGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await cptService.getFieldGroup(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - getFieldGroup:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Create field group
   */
  static async createFieldGroup(req: AuthRequest, res: Response) {
    try {
      const result = await cptService.createFieldGroup(req.body);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Controller error - createFieldGroup:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Update field group
   */
  static async updateFieldGroup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await cptService.updateFieldGroup(id, req.body);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - updateFieldGroup:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Delete field group
   */
  static async deleteFieldGroup(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await cptService.deleteFieldGroup(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - deleteFieldGroup:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get field values for an entity
   * Phase P1-B: Uses metaDataService.getManyMeta directly
   */
  static async getFieldValues(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params;

      // Get all meta values for this entity
      const metaResult = await metaDataService.getManyMeta(entityType, [entityId]);
      const fieldValues = metaResult[entityId] || {};

      res.json({
        success: true,
        data: fieldValues
      });
    } catch (error: any) {
      logger.error('Controller error - getFieldValues:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Save field values for an entity
   * Phase P1-B: Uses metaDataService.setManyMeta directly (transactional)
   */
  static async saveFieldValues(req: AuthRequest, res: Response) {
    try {
      const { entityType, entityId } = req.params;
      const fieldValues = req.body;

      // Use setManyMeta for transactional batch update
      const success = await metaDataService.setManyMeta(entityType, entityId, fieldValues);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Failed to save field values'
        });
      }

      res.json({
        success: true,
        message: 'Field values saved successfully',
        data: {
          entityType,
          entityId,
          fieldsUpdated: Object.keys(fieldValues).length
        }
      });
    } catch (error: any) {
      logger.error('Controller error - saveFieldValues:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Export field groups
   */
  static async exportFieldGroups(req: AuthRequest, res: Response) {
    try {
      const { groupIds } = req.body;
      const result = await cptService.exportFieldGroups(groupIds);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - exportFieldGroups:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Import field groups
   */
  static async importFieldGroups(req: AuthRequest, res: Response) {
    try {
      const result = await cptService.importFieldGroups(req.body);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Controller error - importFieldGroups:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}