import { AppDataSource } from '../../../database/connection.js';
import { FormPreset } from '../../../entities/FormPreset.js';
import { ViewPreset } from '../../../entities/ViewPreset.js';
import { TemplatePreset } from '../../../entities/TemplatePreset.js';
import logger from '../../../utils/logger.js';
import type {
  CreateFormPresetRequest,
  CreateViewPresetRequest,
  CreateTemplatePresetRequest,
  UpdateFormPresetRequest,
  UpdateViewPresetRequest,
  UpdateTemplatePresetRequest,
  PresetQueryOptions
} from '@o4o/types';

/**
 * Preset Service - Business logic for managing presets
 * Handles FormPreset, ViewPreset, and TemplatePreset
 */
export class PresetService {
  // ==================== Form Presets ====================

  private get formPresetRepository() {
    return AppDataSource.getRepository(FormPreset);
  }

  async getAllFormPresets(options: PresetQueryOptions = {}) {
    try {
      const {
        cptSlug,
        isActive,
        page = 1,
        limit = 20,
        orderBy = 'createdAt',
        order = 'DESC'
      } = options;

      const queryBuilder = this.formPresetRepository.createQueryBuilder('preset');

      if (cptSlug) {
        queryBuilder.andWhere('preset.cptSlug = :cptSlug', { cptSlug });
      }

      if (isActive !== undefined) {
        queryBuilder.andWhere('preset.isActive = :isActive', { isActive });
      }

      queryBuilder
        .orderBy(`preset.${orderBy}`, order)
        .skip((page - 1) * limit)
        .take(limit);

      const [presets, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        data: presets.map(p => p.toJSON()),
        total,
        pagination: {
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      logger.error('Error fetching form presets:', error);
      throw new Error('Failed to fetch form presets');
    }
  }

  async getFormPresetById(id: string) {
    try {
      const preset = await this.formPresetRepository.findOne({ where: { id } });

      if (!preset) {
        return {
          success: false,
          error: 'Form preset not found'
        };
      }

      return {
        success: true,
        data: preset.toJSON()
      };
    } catch (error: any) {
      logger.error('Error fetching form preset:', error);
      throw new Error('Failed to fetch form preset');
    }
  }

  async createFormPreset(data: CreateFormPresetRequest, userId?: string) {
    try {
      const preset = this.formPresetRepository.create({
        ...data,
        createdBy: userId,
        version: 1
      });

      // Validate config
      if (!preset.validateConfig()) {
        return {
          success: false,
          error: 'Invalid preset configuration'
        };
      }

      const saved = await this.formPresetRepository.save(preset);

      return {
        success: true,
        data: saved.toJSON()
      };
    } catch (error: any) {
      logger.error('Error creating form preset:', error);
      throw new Error('Failed to create form preset');
    }
  }

  async updateFormPreset(id: string, data: UpdateFormPresetRequest) {
    try {
      const preset = await this.formPresetRepository.findOne({ where: { id } });

      if (!preset) {
        return {
          success: false,
          error: 'Form preset not found'
        };
      }

      Object.assign(preset, data);

      // Validate if config was updated
      if (data.config && !preset.validateConfig()) {
        return {
          success: false,
          error: 'Invalid preset configuration'
        };
      }

      const updated = await this.formPresetRepository.save(preset);

      return {
        success: true,
        data: updated.toJSON()
      };
    } catch (error: any) {
      logger.error('Error updating form preset:', error);
      throw new Error('Failed to update form preset');
    }
  }

  async deleteFormPreset(id: string) {
    try {
      const preset = await this.formPresetRepository.findOne({ where: { id } });

      if (!preset) {
        return {
          success: false,
          error: 'Form preset not found'
        };
      }

      await this.formPresetRepository.remove(preset);

      return {
        success: true,
        message: 'Form preset deleted successfully'
      };
    } catch (error: any) {
      logger.error('Error deleting form preset:', error);
      throw new Error('Failed to delete form preset');
    }
  }

  async cloneFormPreset(id: string, userId?: string) {
    try {
      const original = await this.formPresetRepository.findOne({ where: { id } });

      if (!original) {
        return {
          success: false,
          error: 'Form preset not found'
        };
      }

      const cloned = this.formPresetRepository.create({
        ...original.clone(),
        createdBy: userId
      });

      const saved = await this.formPresetRepository.save(cloned);

      return {
        success: true,
        data: saved.toJSON()
      };
    } catch (error: any) {
      logger.error('Error cloning form preset:', error);
      throw new Error('Failed to clone form preset');
    }
  }

  // ==================== View Presets ====================

  private get viewPresetRepository() {
    return AppDataSource.getRepository(ViewPreset);
  }

  async getAllViewPresets(options: PresetQueryOptions = {}) {
    try {
      const {
        cptSlug,
        isActive,
        page = 1,
        limit = 20,
        orderBy = 'createdAt',
        order = 'DESC'
      } = options;

      const queryBuilder = this.viewPresetRepository.createQueryBuilder('preset');

      if (cptSlug) {
        queryBuilder.andWhere('preset.cptSlug = :cptSlug', { cptSlug });
      }

      if (isActive !== undefined) {
        queryBuilder.andWhere('preset.isActive = :isActive', { isActive });
      }

      queryBuilder
        .orderBy(`preset.${orderBy}`, order)
        .skip((page - 1) * limit)
        .take(limit);

      const [presets, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        data: presets.map(p => p.toJSON()),
        total,
        pagination: {
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      logger.error('Error fetching view presets:', error);
      throw new Error('Failed to fetch view presets');
    }
  }

  async getViewPresetById(id: string) {
    try {
      const preset = await this.viewPresetRepository.findOne({ where: { id } });

      if (!preset) {
        return {
          success: false,
          error: 'View preset not found'
        };
      }

      return {
        success: true,
        data: preset.toJSON()
      };
    } catch (error: any) {
      logger.error('Error fetching view preset:', error);
      throw new Error('Failed to fetch view preset');
    }
  }

  async createViewPreset(data: CreateViewPresetRequest, userId?: string) {
    try {
      const preset = this.viewPresetRepository.create({
        ...data,
        createdBy: userId,
        version: 1
      });

      if (!preset.validateConfig()) {
        return {
          success: false,
          error: 'Invalid preset configuration'
        };
      }

      const saved = await this.viewPresetRepository.save(preset);

      return {
        success: true,
        data: saved.toJSON()
      };
    } catch (error: any) {
      logger.error('Error creating view preset:', error);
      throw new Error('Failed to create view preset');
    }
  }

  async updateViewPreset(id: string, data: UpdateViewPresetRequest) {
    try {
      const preset = await this.viewPresetRepository.findOne({ where: { id } });

      if (!preset) {
        return {
          success: false,
          error: 'View preset not found'
        };
      }

      Object.assign(preset, data);

      if (data.config && !preset.validateConfig()) {
        return {
          success: false,
          error: 'Invalid preset configuration'
        };
      }

      const updated = await this.viewPresetRepository.save(preset);

      return {
        success: true,
        data: updated.toJSON()
      };
    } catch (error: any) {
      logger.error('Error updating view preset:', error);
      throw new Error('Failed to update view preset');
    }
  }

  async deleteViewPreset(id: string) {
    try {
      const preset = await this.viewPresetRepository.findOne({ where: { id } });

      if (!preset) {
        return {
          success: false,
          error: 'View preset not found'
        };
      }

      await this.viewPresetRepository.remove(preset);

      return {
        success: true,
        message: 'View preset deleted successfully'
      };
    } catch (error: any) {
      logger.error('Error deleting view preset:', error);
      throw new Error('Failed to delete view preset');
    }
  }

  async cloneViewPreset(id: string, userId?: string) {
    try {
      const original = await this.viewPresetRepository.findOne({ where: { id } });

      if (!original) {
        return {
          success: false,
          error: 'View preset not found'
        };
      }

      const cloned = this.viewPresetRepository.create({
        ...original.clone(),
        createdBy: userId
      });

      const saved = await this.viewPresetRepository.save(cloned);

      return {
        success: true,
        data: saved.toJSON()
      };
    } catch (error: any) {
      logger.error('Error cloning view preset:', error);
      throw new Error('Failed to clone view preset');
    }
  }

  // ==================== Template Presets ====================

  private get templatePresetRepository() {
    return AppDataSource.getRepository(TemplatePreset);
  }

  async getAllTemplatePresets(options: PresetQueryOptions = {}) {
    try {
      const {
        cptSlug,
        isActive,
        page = 1,
        limit = 20,
        orderBy = 'createdAt',
        order = 'DESC'
      } = options;

      const queryBuilder = this.templatePresetRepository.createQueryBuilder('preset');

      if (cptSlug) {
        queryBuilder.andWhere('preset.cptSlug = :cptSlug', { cptSlug });
      }

      if (isActive !== undefined) {
        queryBuilder.andWhere('preset.isActive = :isActive', { isActive });
      }

      queryBuilder
        .orderBy(`preset.${orderBy}`, order)
        .skip((page - 1) * limit)
        .take(limit);

      const [presets, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        data: presets.map(p => p.toJSON()),
        total,
        pagination: {
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      logger.error('Error fetching template presets:', error);
      throw new Error('Failed to fetch template presets');
    }
  }

  async getTemplatePresetById(id: string) {
    try {
      const preset = await this.templatePresetRepository.findOne({ where: { id } });

      if (!preset) {
        return {
          success: false,
          error: 'Template preset not found'
        };
      }

      return {
        success: true,
        data: preset.toJSON()
      };
    } catch (error: any) {
      logger.error('Error fetching template preset:', error);
      throw new Error('Failed to fetch template preset');
    }
  }

  async createTemplatePreset(data: CreateTemplatePresetRequest, userId?: string) {
    try {
      const preset = this.templatePresetRepository.create({
        ...data,
        createdBy: userId,
        version: 1
      });

      if (!preset.validateConfig()) {
        return {
          success: false,
          error: 'Invalid preset configuration'
        };
      }

      const saved = await this.templatePresetRepository.save(preset);

      return {
        success: true,
        data: saved.toJSON()
      };
    } catch (error: any) {
      logger.error('Error creating template preset:', error);
      throw new Error('Failed to create template preset');
    }
  }

  async updateTemplatePreset(id: string, data: UpdateTemplatePresetRequest) {
    try {
      const preset = await this.templatePresetRepository.findOne({ where: { id } });

      if (!preset) {
        return {
          success: false,
          error: 'Template preset not found'
        };
      }

      Object.assign(preset, data);

      if (data.config && !preset.validateConfig()) {
        return {
          success: false,
          error: 'Invalid preset configuration'
        };
      }

      const updated = await this.templatePresetRepository.save(preset);

      return {
        success: true,
        data: updated.toJSON()
      };
    } catch (error: any) {
      logger.error('Error updating template preset:', error);
      throw new Error('Failed to update template preset');
    }
  }

  async deleteTemplatePreset(id: string) {
    try {
      const preset = await this.templatePresetRepository.findOne({ where: { id } });

      if (!preset) {
        return {
          success: false,
          error: 'Template preset not found'
        };
      }

      await this.templatePresetRepository.remove(preset);

      return {
        success: true,
        message: 'Template preset deleted successfully'
      };
    } catch (error: any) {
      logger.error('Error deleting template preset:', error);
      throw new Error('Failed to delete template preset');
    }
  }

  async cloneTemplatePreset(id: string, userId?: string) {
    try {
      const original = await this.templatePresetRepository.findOne({ where: { id } });

      if (!original) {
        return {
          success: false,
          error: 'Template preset not found'
        };
      }

      const cloned = this.templatePresetRepository.create({
        ...original.clone(),
        createdBy: userId
      });

      const saved = await this.templatePresetRepository.save(cloned);

      return {
        success: true,
        data: saved.toJSON()
      };
    } catch (error: any) {
      logger.error('Error cloning template preset:', error);
      throw new Error('Failed to clone template preset');
    }
  }
}

// Export singleton instance
export const presetService = new PresetService();
