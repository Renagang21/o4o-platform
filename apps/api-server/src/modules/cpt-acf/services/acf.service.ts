import { AppDataSource } from '../../../database/connection';
import { FieldGroup, CustomField, CustomFieldValue } from '../../../entities/CustomField';
import { metaDataService } from '../../../services/MetaDataService';
import { validate } from 'class-validator';
import logger from '../../../utils/logger';

/**
 * ACF Service - Business logic layer for Advanced Custom Fields
 * Follows the pattern from affiliate module
 */
export class ACFService {
  private fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
  private fieldRepo = AppDataSource.getRepository(CustomField);
  private fieldValueRepo = AppDataSource.getRepository(CustomFieldValue);

  /**
   * Get all field groups
   */
  async getFieldGroups() {
    try {
      const fieldGroups = await this.fieldGroupRepo.find({
        relations: ['fields'],
        order: { order: 'ASC' }
      });

      return {
        success: true,
        data: fieldGroups,
        total: fieldGroups.length
      };
    } catch (error: any) {
      logger.error('Error fetching field groups:', error);
      throw new Error('Failed to fetch field groups');
    }
  }

  /**
   * Get field group by ID
   */
  async getFieldGroup(id: string) {
    try {
      const fieldGroup = await this.fieldGroupRepo.findOne({
        where: { id },
        relations: ['fields']
      });

      if (!fieldGroup) {
        return {
          success: false,
          error: 'Field group not found'
        };
      }

      return {
        success: true,
        data: fieldGroup
      };
    } catch (error: any) {
      logger.error('Error fetching field group:', error);
      throw new Error('Failed to fetch field group');
    }
  }

  /**
   * Create field group
   */
  async createFieldGroup(data: any) {
    try {
      const { fields, ...groupData } = data;

      // Create the field group first
      const fieldGroup = this.fieldGroupRepo.create(groupData);

      // Validate the entity
      const errors = await validate(fieldGroup);
      if (errors.length > 0) {
        return {
          success: false,
          error: 'Validation failed',
          details: errors
        };
      }

      const savedGroup = await this.fieldGroupRepo.save(fieldGroup);

      // Create fields if provided
      if (fields && Array.isArray(fields)) {
        for (const fieldData of fields) {
          const field = this.fieldRepo.create({
            ...fieldData,
            groupId: savedGroup.id
          });
          await this.fieldRepo.save(field);
        }
      }

      // Fetch the complete group with fields
      const completeGroup = await this.fieldGroupRepo.findOne({
        where: { id: savedGroup.id },
        relations: ['fields']
      });

      return {
        success: true,
        data: completeGroup
      };
    } catch (error: any) {
      logger.error('Error creating field group:', error);
      throw new Error('Failed to create field group');
    }
  }

  /**
   * Update field group
   */
  async updateFieldGroup(id: string, data: any) {
    try {
      const fieldGroup = await this.fieldGroupRepo.findOne({
        where: { id },
        relations: ['fields']
      });

      if (!fieldGroup) {
        return {
          success: false,
          error: 'Field group not found'
        };
      }

      const { fields, ...groupData } = data;

      // Update group data
      Object.assign(fieldGroup, groupData);

      // Validate before saving
      const errors = await validate(fieldGroup);
      if (errors.length > 0) {
        return {
          success: false,
          error: 'Validation failed',
          details: errors
        };
      }

      await this.fieldGroupRepo.save(fieldGroup);

      // Update fields if provided
      if (fields && Array.isArray(fields)) {
        // Delete existing fields
        await this.fieldRepo.delete({ groupId: id });

        // Create new fields
        for (const fieldData of fields) {
          const field = this.fieldRepo.create({
            ...fieldData,
            groupId: id
          });
          await this.fieldRepo.save(field);
        }
      }

      // Fetch updated group
      const updatedGroup = await this.fieldGroupRepo.findOne({
        where: { id },
        relations: ['fields']
      });

      return {
        success: true,
        data: updatedGroup
      };
    } catch (error: any) {
      logger.error('Error updating field group:', error);
      throw new Error('Failed to update field group');
    }
  }

  /**
   * Delete field group
   */
  async deleteFieldGroup(id: string) {
    try {
      const fieldGroup = await this.fieldGroupRepo.findOne({
        where: { id }
      });

      if (!fieldGroup) {
        return {
          success: false,
          error: 'Field group not found'
        };
      }

      // Delete associated fields and values
      await this.fieldRepo.delete({ groupId: id });
      await this.fieldGroupRepo.remove(fieldGroup);

      return {
        success: true,
        message: 'Field group deleted successfully'
      };
    } catch (error: any) {
      logger.error('Error deleting field group:', error);
      throw new Error('Failed to delete field group');
    }
  }

  /**
   * Get field values for an entity
   */
  async getFieldValues(entityType: string, entityId: string) {
    try {
      const values = await metaDataService.getAllMeta(entityType, entityId);

      return {
        success: true,
        data: values
      };
    } catch (error: any) {
      logger.error('Error fetching field values:', error);
      throw new Error('Failed to fetch field values');
    }
  }

  /**
   * Save field values for an entity
   */
  async saveFieldValues(entityType: string, entityId: string, values: any) {
    try {
      const results = [];

      for (const [fieldName, value] of Object.entries(values)) {
        const saved = await metaDataService.setMeta(
          entityType,
          entityId,
          fieldName,
          value
        );
        results.push({ fieldName, success: true });
      }

      return {
        success: true,
        data: results,
        message: 'Field values saved successfully'
      };
    } catch (error: any) {
      logger.error('Error saving field values:', error);
      throw new Error('Failed to save field values');
    }
  }

  /**
   * Export field groups
   */
  async exportFieldGroups(groupIds?: string[]) {
    try {
      const queryBuilder = this.fieldGroupRepo.createQueryBuilder('group')
        .leftJoinAndSelect('group.fields', 'fields');

      if (groupIds && groupIds.length > 0) {
        queryBuilder.where('group.id IN (:...ids)', { ids: groupIds });
      }

      const groups = await queryBuilder.getMany();

      return {
        success: true,
        data: {
          version: '1.0.0',
          groups: groups,
          exportedAt: new Date()
        }
      };
    } catch (error: any) {
      logger.error('Error exporting field groups:', error);
      throw new Error('Failed to export field groups');
    }
  }

  /**
   * Import field groups
   */
  async importFieldGroups(data: any) {
    try {
      const { groups } = data;

      if (!groups || !Array.isArray(groups)) {
        return {
          success: false,
          error: 'Invalid import data'
        };
      }

      const imported = [];

      for (const groupData of groups) {
        const { fields, ...group } = groupData;

        // Check if group already exists
        const existingGroup = await this.fieldGroupRepo.findOne({
          where: { name: group.name }
        });

        let savedGroup;
        if (existingGroup) {
          // Update existing group
          Object.assign(existingGroup, group);
          savedGroup = await this.fieldGroupRepo.save(existingGroup);

          // Delete existing fields
          await this.fieldRepo.delete({ groupId: savedGroup.id });
        } else {
          // Create new group
          const newGroup = this.fieldGroupRepo.create(group);
          savedGroup = await this.fieldGroupRepo.save(newGroup);
        }

        // Create fields
        if (fields && Array.isArray(fields)) {
          for (const fieldData of fields) {
            const field = this.fieldRepo.create({
              ...fieldData,
              groupId: savedGroup.id
            });
            await this.fieldRepo.save(field);
          }
        }

        imported.push(savedGroup);
      }

      return {
        success: true,
        data: imported,
        message: `Imported ${imported.length} field groups successfully`
      };
    } catch (error: any) {
      logger.error('Error importing field groups:', error);
      throw new Error('Failed to import field groups');
    }
  }
}

// Export singleton instance
export const acfService = new ACFService();