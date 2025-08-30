import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField';
import { validate } from 'class-validator';

export class ACFController {
  // Field Groups
  static async getFieldGroups(req: Request, res: Response) {
    try {
      const fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
      const fieldGroups = await fieldGroupRepo.find({
        relations: ['fields'],
        order: { order: 'ASC' }
      });

      res.json({
        success: true,
        data: fieldGroups,
        total: fieldGroups.length
      });
    } catch (error: any) {
      console.error('Error fetching field groups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch field groups',
        message: error.message
      });
    }
  }

  static async getFieldGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
      
      const fieldGroup = await fieldGroupRepo.findOne({
        where: { id },
        relations: ['fields']
      });

      if (!fieldGroup) {
        return res.status(404).json({
          success: false,
          error: 'Field group not found'
        });
      }

      res.json({
        success: true,
        data: fieldGroup
      });
    } catch (error: any) {
      console.error('Error fetching field group:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch field group',
        message: error.message
      });
    }
  }

  static async createFieldGroup(req: Request, res: Response) {
    try {
      const fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
      const fieldRepo = AppDataSource.getRepository(CustomField);
      
      const { fields, ...groupData } = req.body;
      
      // Create field group
      const fieldGroup = fieldGroupRepo.create(groupData);
      const errors = await validate(fieldGroup);
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      }

      const savedGroup = await fieldGroupRepo.save(fieldGroup) as any;

      // Create fields if provided
      if (fields && Array.isArray(fields)) {
        for (const [index, fieldData] of fields.entries()) {
          const field = fieldRepo.create({
            ...fieldData,
            groupId: savedGroup.id,
            order: fieldData.order ?? index
          });
          await fieldRepo.save(field);
        }
        
        // Reload with fields
        const completeGroup = await fieldGroupRepo.findOne({
          where: { id: savedGroup.id },
          relations: ['fields']
        });
        
        return res.status(201).json({
          success: true,
          data: completeGroup,
          message: 'Field group created successfully'
        });
      }

      res.status(201).json({
        success: true,
        data: savedGroup,
        message: 'Field group created successfully'
      });
    } catch (error: any) {
      console.error('Error creating field group:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create field group',
        message: error.message
      });
    }
  }

  static async updateFieldGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
      const fieldRepo = AppDataSource.getRepository(CustomField);
      
      const fieldGroup = await fieldGroupRepo.findOne({
        where: { id },
        relations: ['fields']
      });

      if (!fieldGroup) {
        return res.status(404).json({
          success: false,
          error: 'Field group not found'
        });
      }

      const { fields, ...groupData } = req.body;
      
      // Update field group
      Object.assign(fieldGroup, groupData);
      await fieldGroupRepo.save(fieldGroup);

      // Update fields if provided
      if (fields && Array.isArray(fields)) {
        // Delete existing fields
        await fieldRepo.delete({ groupId: id });
        
        // Create new fields
        for (const [index, fieldData] of fields.entries()) {
          const field = fieldRepo.create({
            ...fieldData,
            groupId: id,
            order: fieldData.order ?? index
          });
          await fieldRepo.save(field);
        }
      }

      // Reload with updated fields
      const updatedGroup = await fieldGroupRepo.findOne({
        where: { id },
        relations: ['fields']
      });

      res.json({
        success: true,
        data: updatedGroup,
        message: 'Field group updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating field group:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update field group',
        message: error.message
      });
    }
  }

  static async deleteFieldGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
      
      const fieldGroup = await fieldGroupRepo.findOne({ where: { id } });
      
      if (!fieldGroup) {
        return res.status(404).json({
          success: false,
          error: 'Field group not found'
        });
      }

      await fieldGroupRepo.remove(fieldGroup);

      res.json({
        success: true,
        message: 'Field group deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting field group:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete field group',
        message: error.message
      });
    }
  }

  // Field Values
  static async getFieldValues(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params;
      const fieldValueRepo = AppDataSource.getRepository(CustomFieldValue);
      
      const values = await fieldValueRepo.find({
        where: { entityType, entityId },
        relations: ['field']
      });

      // Transform to key-value pairs
      const result = values.reduce((acc: any, val: any) => {
        acc[val.field.name] = val.value;
        return acc;
      }, {});

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error fetching field values:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch field values',
        message: error.message
      });
    }
  }

  static async saveFieldValues(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params;
      const values = req.body;
      
      const fieldValueRepo = AppDataSource.getRepository(CustomFieldValue);
      const fieldRepo = AppDataSource.getRepository(CustomField);

      // Delete existing values
      await fieldValueRepo.delete({ entityType, entityId });

      // Save new values
      const valueEntities = [];
      for (const [fieldName, value] of Object.entries(values)) {
        const field = await fieldRepo.findOne({ where: { name: fieldName } });
        
        if (field) {
          const fieldValue = fieldValueRepo.create({
            fieldId: field.id,
            entityType,
            entityId,
            value
          });
          valueEntities.push(fieldValue);
        }
      }

      await fieldValueRepo.save(valueEntities);

      res.json({
        success: true,
        message: 'Field values saved successfully'
      });
    } catch (error: any) {
      console.error('Error saving field values:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save field values',
        message: error.message
      });
    }
  }

  // Export/Import
  static async exportFieldGroups(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      const fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
      
      let query = fieldGroupRepo.createQueryBuilder('fieldGroup')
        .leftJoinAndSelect('fieldGroup.fields', 'fields');
      
      if (ids && Array.isArray(ids) && ids.length > 0) {
        query = query.where('fieldGroup.id IN (:...ids)', { ids });
      }
      
      const fieldGroups = await query.getMany();

      res.json({
        success: true,
        data: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          fieldGroups
        }
      });
    } catch (error: any) {
      console.error('Error exporting field groups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export field groups',
        message: error.message
      });
    }
  }

  static async importFieldGroups(req: Request, res: Response) {
    try {
      const { fieldGroups } = req.body;
      
      if (!fieldGroups || !Array.isArray(fieldGroups)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid import data'
        });
      }

      const fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
      const fieldRepo = AppDataSource.getRepository(CustomField);
      
      const importedGroups = [];
      
      for (const groupData of fieldGroups) {
        const { fields, id, ...groupProps } = groupData;
        
        // Create new field group
        const fieldGroup = fieldGroupRepo.create(groupProps);
        const savedGroup = await fieldGroupRepo.save(fieldGroup) as any;
        
        // Create fields
        if (fields && Array.isArray(fields)) {
          for (const fieldData of fields) {
            const { id, ...fieldProps } = fieldData;
            const field = fieldRepo.create({
              ...fieldProps,
              groupId: savedGroup.id
            });
            await fieldRepo.save(field);
          }
        }
        
        importedGroups.push(savedGroup);
      }

      res.json({
        success: true,
        data: importedGroups,
        message: `Successfully imported ${importedGroups.length} field groups`
      });
    } catch (error: any) {
      console.error('Error importing field groups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import field groups',
        message: error.message
      });
    }
  }
}