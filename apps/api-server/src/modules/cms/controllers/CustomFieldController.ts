import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CustomFieldService } from '../services/CustomFieldService.js';
import logger from '../../../utils/logger.js';

/**
 * CustomFieldController
 * NextGen V2 - CMS Module
 * Handles CustomField (ACF) CRUD operations
 */
export class CustomFieldController extends BaseController {
  static async createField(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const service = CustomFieldService.getInstance();

      const field = await service.createField(data);

      return BaseController.created(res, { field });
    } catch (error: any) {
      logger.error('[CustomFieldController.createField] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getField(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CustomFieldService.getInstance();

      const field = await service.getField(id);

      if (!field) {
        return BaseController.notFound(res, 'Custom Field not found');
      }

      return BaseController.ok(res, { field });
    } catch (error: any) {
      logger.error('[CustomFieldController.getField] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listFields(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = CustomFieldService.getInstance();

      const fields = await service.listFields(filters as any);

      return BaseController.ok(res, { fields, total: fields.length });
    } catch (error: any) {
      logger.error('[CustomFieldController.listFields] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getFieldsForCPT(req: Request, res: Response): Promise<any> {
    try {
      const { postTypeId } = req.params;
      const service = CustomFieldService.getInstance();

      const fields = await service.getFieldsForCPT(postTypeId);

      return BaseController.ok(res, { fields, total: fields.length });
    } catch (error: any) {
      logger.error('[CustomFieldController.getFieldsForCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getFieldsByGroup(req: Request, res: Response): Promise<any> {
    try {
      const { postTypeId } = req.params;
      const service = CustomFieldService.getInstance();

      const groupedFields = await service.getFieldsByGroup(postTypeId);

      // Convert Map to object for JSON response
      const groups: Record<string, any[]> = {};
      groupedFields.forEach((fields, groupName) => {
        groups[groupName] = fields;
      });

      return BaseController.ok(res, { groups });
    } catch (error: any) {
      logger.error('[CustomFieldController.getFieldsByGroup] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateField(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = CustomFieldService.getInstance();

      const field = await service.updateField(id, data);

      return BaseController.ok(res, { field });
    } catch (error: any) {
      logger.error('[CustomFieldController.updateField] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteField(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CustomFieldService.getInstance();

      const deleted = await service.deleteField(id);

      if (!deleted) {
        return BaseController.notFound(res, 'Custom Field not found');
      }

      return BaseController.ok(res, {});
    } catch (error: any) {
      logger.error('[CustomFieldController.deleteField] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async reorderFields(req: Request, res: Response): Promise<any> {
    try {
      const { postTypeId } = req.params;
      const { fieldIds } = req.body;

      if (!Array.isArray(fieldIds)) {
        return BaseController.error(res, 'fieldIds must be an array');
      }

      const service = CustomFieldService.getInstance();
      const success = await service.reorderFields(postTypeId, fieldIds);

      if (!success) {
        return BaseController.error(res, new Error('Failed to reorder fields'));
      }

      return BaseController.ok(res, {});
    } catch (error: any) {
      logger.error('[CustomFieldController.reorderFields] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async validateFieldValue(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { value } = req.body;
      const service = CustomFieldService.getInstance();

      const result = await service.validateFieldValue(id, value);

      return BaseController.ok(res, { validation: result });
    } catch (error: any) {
      logger.error('[CustomFieldController.validateFieldValue] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
