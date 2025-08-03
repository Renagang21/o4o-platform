import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField';
import { In } from 'typeorm';

export class CustomFieldsController {
  private fieldGroupRepository = AppDataSource.getRepository(FieldGroup);
  private customFieldRepository = AppDataSource.getRepository(CustomField);
  private customFieldValueRepository = AppDataSource.getRepository(CustomFieldValue);

  // GET /api/admin/custom-field-groups
  async getFieldGroups(req: Request, res: Response) {
    try {
      const { location, active } = req.query;

      const queryBuilder = this.fieldGroupRepository
        .createQueryBuilder('fieldGroup')
        .leftJoinAndSelect('fieldGroup.fields', 'fields')
        .orderBy('fieldGroup.order', 'ASC')
        .addOrderBy('fields.order', 'ASC');

      // Apply filters
      if (location) {
        queryBuilder.andWhere('fieldGroup.location @> :location', { 
          location: JSON.stringify([{ param: 'post_type', operator: '==', value: location }])
        });
      }

      if (active !== undefined) {
        queryBuilder.andWhere('fieldGroup.active = :active', { active: active === 'true' });
      }

      const fieldGroups = await queryBuilder.getMany();

      res.json({
        success: true,
        data: fieldGroups
      });
    } catch (error) {
      console.error('Error fetching field groups:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch field groups',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/admin/custom-field-groups/:id
  async getFieldGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const fieldGroup = await this.fieldGroupRepository.findOne({
        where: { id },
        relations: ['fields']
      });

      if (!fieldGroup) {
        return res.status(404).json({
          success: false,
          message: 'Field group not found'
        });
      }

      res.json({
        success: true,
        data: fieldGroup
      });
    } catch (error) {
      console.error('Error fetching field group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch field group',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/custom-field-groups
  async createFieldGroup(req: Request, res: Response) {
    try {
      const {
        title,
        description,
        location,
        rules,
        options,
        active = true,
        order = 0,
        placement = 'normal',
        fields = []
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Field group title is required'
        });
      }

      if (!location || !Array.isArray(location) || location.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one location rule is required'
        });
      }

      // Create field group
      const fieldGroup = this.fieldGroupRepository.create({
        title: title.trim(),
        description,
        location,
        rules,
        options,
        active,
        order,
        placement,
        fields: [] // We'll add fields separately
      });

      const savedFieldGroup = await this.fieldGroupRepository.save(fieldGroup);

      // Create fields if provided
      if (fields.length > 0) {
        const fieldEntities = fields.map((field: Partial<CustomField>, index: number) => 
          this.customFieldRepository.create({
            ...field,
            groupId: savedFieldGroup.id,
            order: field.order !== undefined ? field.order : index
          })
        );

        for (const fieldEntity of fieldEntities) {
          await this.customFieldRepository.save(fieldEntity);
        }
      }

      // Get complete field group with fields
      const completeFieldGroup = await this.fieldGroupRepository.findOne({
        where: { id: savedFieldGroup.id },
        relations: ['fields']
      });

      res.status(201).json({
        success: true,
        data: completeFieldGroup,
        message: 'Field group created successfully'
      });
    } catch (error) {
      console.error('Error creating field group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create field group',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/admin/custom-field-groups/:id
  async updateFieldGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        location,
        rules,
        options,
        active,
        order,
        placement,
        fields
      } = req.body;

      const fieldGroup = await this.fieldGroupRepository.findOne({
        where: { id },
        relations: ['fields']
      });

      if (!fieldGroup) {
        return res.status(404).json({
          success: false,
          message: 'Field group not found'
        });
      }

      // Update field group
      await this.fieldGroupRepository.update(id, {
        title,
        description,
        location,
        rules,
        options,
        active,
        order,
        placement
      });

      // Update fields if provided
      if (fields && Array.isArray(fields)) {
        // Delete existing fields
        await this.customFieldRepository.delete({ groupId: id });

        // Create new fields
        if (fields.length > 0) {
          const fieldEntities = fields.map((field: Partial<CustomField>, index: number) => 
            this.customFieldRepository.create({
              ...field,
              groupId: id,
              order: field.order !== undefined ? field.order : index
            })
          );

          // Save each field individually
          for (const fieldEntity of fieldEntities) {
            await this.customFieldRepository.save(fieldEntity);
          }
        }
      }

      // Get updated field group
      const updatedFieldGroup = await this.fieldGroupRepository.findOne({
        where: { id },
        relations: ['fields']
      });

      res.json({
        success: true,
        data: updatedFieldGroup,
        message: 'Field group updated successfully'
      });
    } catch (error) {
      console.error('Error updating field group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update field group',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/admin/custom-field-groups/:id
  async deleteFieldGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const fieldGroup = await this.fieldGroupRepository.findOne({ where: { id } });
      if (!fieldGroup) {
        return res.status(404).json({
          success: false,
          message: 'Field group not found'
        });
      }

      // Delete field values first (cascade should handle this, but being explicit)
      const fields = await this.customFieldRepository.find({ where: { groupId: id } });
      const fieldIds = fields.map((f: any) => f.id);
      
      if (fieldIds.length > 0) {
        await this.customFieldValueRepository.delete({ fieldId: In(fieldIds) });
      }

      // Delete field group (cascade will delete fields)
      await this.fieldGroupRepository.delete(id);

      res.json({
        success: true,
        message: 'Field group deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting field group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete field group',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/admin/custom-fields
  async getCustomFields(req: Request, res: Response) {
    try {
      const { groupId } = req.query;

      const queryBuilder = this.customFieldRepository
        .createQueryBuilder('field')
        .leftJoinAndSelect('field.group', 'group')
        .orderBy('field.order', 'ASC');

      if (groupId) {
        queryBuilder.andWhere('field.groupId = :groupId', { groupId });
      }

      const fields = await queryBuilder.getMany();

      res.json({
        success: true,
        data: fields
      });
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch custom fields',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/admin/custom-fields/:id
  async getCustomField(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const field = await this.customFieldRepository.findOne({
        where: { id },
        relations: ['group']
      });

      if (!field) {
        return res.status(404).json({
          success: false,
          message: 'Custom field not found'
        });
      }

      res.json({
        success: true,
        data: field
      });
    } catch (error) {
      console.error('Error fetching custom field:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch custom field',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/custom-fields
  async createCustomField(req: Request, res: Response) {
    try {
      const {
        name,
        label,
        type,
        description,
        required = false,
        defaultValue,
        placeholder,
        validation,
        conditionalLogic,
        options,
        min,
        max,
        step,
        maxLength,
        minLength,
        pattern,
        multiple = false,
        order = 0,
        groupId
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Field name is required'
        });
      }

      if (!label || !label.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Field label is required'
        });
      }

      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: 'Group ID is required'
        });
      }

      // Check if group exists
      const group = await this.fieldGroupRepository.findOne({ where: { id: groupId } });
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Field group not found'
        });
      }

      const field = this.customFieldRepository.create({
        name: name.trim(),
        label: label.trim(),
        type,
        description,
        required,
        defaultValue,
        placeholder,
        validation,
        conditionalLogic,
        options,
        min,
        max,
        step,
        maxLength,
        minLength,
        pattern,
        multiple,
        order,
        groupId
      });

      const savedField = await this.customFieldRepository.save(field);

      const completeField = await this.customFieldRepository.findOne({
        where: { id: savedField.id },
        relations: ['group']
      });

      res.status(201).json({
        success: true,
        data: completeField,
        message: 'Custom field created successfully'
      });
    } catch (error) {
      console.error('Error creating custom field:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create custom field',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/admin/custom-fields/:id
  async updateCustomField(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const field = await this.customFieldRepository.findOne({ where: { id } });
      if (!field) {
        return res.status(404).json({
          success: false,
          message: 'Custom field not found'
        });
      }

      await this.customFieldRepository.update(id, updateData);

      const updatedField = await this.customFieldRepository.findOne({
        where: { id },
        relations: ['group']
      });

      res.json({
        success: true,
        data: updatedField,
        message: 'Custom field updated successfully'
      });
    } catch (error) {
      console.error('Error updating custom field:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update custom field',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/admin/custom-fields/:id
  async deleteCustomField(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const field = await this.customFieldRepository.findOne({ where: { id } });
      if (!field) {
        return res.status(404).json({
          success: false,
          message: 'Custom field not found'
        });
      }

      // Delete field values
      await this.customFieldValueRepository.delete({ fieldId: id });

      // Delete field
      await this.customFieldRepository.delete(id);

      res.json({
        success: true,
        message: 'Custom field deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting custom field:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete custom field',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/admin/custom-fields/values/:entityType/:entityId
  async getCustomFieldValues(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params;

      const values = await this.customFieldValueRepository.find({
        where: { entityType, entityId },
        relations: ['field', 'field.group']
      });

      // Group values by field group
      interface GroupedFieldValue {
        groupId: string;
        groupTitle: string;
        fields: Record<string, {
          fieldId: string;
          fieldLabel: string;
          fieldType: string;
          value: unknown;
        }>;
      }
      const groupedValues: Record<string, GroupedFieldValue> = {};
      
      values.forEach((value: any) => {
        const groupId = value.field.group.id;
        const groupTitle = value.field.group.title;
        
        if (!groupedValues[groupId]) {
          groupedValues[groupId] = {
            groupId,
            groupTitle,
            fields: {}
          };
        }
        
        groupedValues[groupId].fields[value.field.name] = {
          fieldId: value.field.id,
          fieldLabel: value.field.label,
          fieldType: value.field.type,
          value: value.value
        };
      });

      res.json({
        success: true,
        data: {
          entityType,
          entityId,
          groups: Object.values(groupedValues)
        }
      });
    } catch (error) {
      console.error('Error fetching custom field values:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch custom field values',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/custom-fields/values
  async saveCustomFieldValues(req: Request, res: Response) {
    try {
      const { entityType, entityId, values } = req.body;

      if (!entityType || !entityId) {
        return res.status(400).json({
          success: false,
          message: 'Entity type and ID are required'
        });
      }

      if (!values || typeof values !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Values object is required'
        });
      }

      // Delete existing values for this entity
      await this.customFieldValueRepository.delete({
        entityType,
        entityId
      });

      // Create new values
      const valuesToSave = [];
      
      for (const [fieldName, value] of Object.entries(values)) {
        // Find field by name (you might want to optimize this with a single query)
        const field = await this.customFieldRepository.findOne({
          where: { name: fieldName }
        });

        if (field && value !== null && value !== undefined && value !== '') {
          valuesToSave.push({
            fieldId: field.id,
            entityType,
            entityId,
            value
          });
        }
      }

      if (valuesToSave.length > 0) {
        await this.customFieldValueRepository.save(valuesToSave);
      }

      res.json({
        success: true,
        message: 'Custom field values saved successfully',
        savedCount: valuesToSave.length
      });
    } catch (error) {
      console.error('Error saving custom field values:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save custom field values',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/custom-field-groups/export
  async exportFieldGroups(req: Request, res: Response) {
    try {
      const { ids } = req.body;

      const queryBuilder = this.fieldGroupRepository
        .createQueryBuilder('fieldGroup')
        .leftJoinAndSelect('fieldGroup.fields', 'fields')
        .orderBy('fieldGroup.order', 'ASC')
        .addOrderBy('fields.order', 'ASC');

      if (ids && Array.isArray(ids) && ids.length > 0) {
        queryBuilder.andWhere('fieldGroup.id IN (:...ids)', { ids });
      }

      const fieldGroups = await queryBuilder.getMany();

      // Create export data (exclude IDs and timestamps for portability)
      const exportData = fieldGroups.map((group: any) => ({
        title: group.title,
        description: group.description,
        location: group.location,
        rules: group.rules,
        options: group.options,
        placement: group.placement,
        fields: group.fields.map((field: any) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          description: field.description,
          required: field.required,
          defaultValue: field.defaultValue,
          placeholder: field.placeholder,
          validation: field.validation,
          conditionalLogic: field.conditionalLogic,
          options: field.options,
          min: field.min,
          max: field.max,
          step: field.step,
          maxLength: field.maxLength,
          minLength: field.minLength,
          pattern: field.pattern,
          multiple: field.multiple,
          order: field.order
        }))
      }));

      res.json({
        success: true,
        data: {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          fieldGroups: exportData
        }
      });
    } catch (error) {
      console.error('Error exporting field groups:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export field groups',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/custom-field-groups/import
  async importFieldGroups(req: Request, res: Response) {
    try {
      const { data } = req.body;

      if (!data || !data.fieldGroups || !Array.isArray(data.fieldGroups)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid import data format'
        });
      }

      const results = [];

      for (const groupData of data.fieldGroups) {
        try {
          // Create field group
          const fieldGroup = this.fieldGroupRepository.create({
            title: `${groupData.title} (Imported)`,
            description: groupData.description,
            location: groupData.location,
            rules: groupData.rules,
            options: groupData.options,
            placement: groupData.placement || 'normal',
            active: true,
            order: 0
          });

          const savedFieldGroup = await this.fieldGroupRepository.save(fieldGroup);

          // Create fields
          if (groupData.fields && Array.isArray(groupData.fields)) {
            const fieldEntities = groupData.fields.map((fieldData: Partial<CustomField>) => 
              this.customFieldRepository.create({
                ...fieldData,
                groupId: savedFieldGroup.id
              })
            );

            for (const fieldEntity of fieldEntities) {
            await this.customFieldRepository.save(fieldEntity);
          }
          }

          results.push({
            title: groupData.title,
            success: true,
            id: savedFieldGroup.id
          });

        } catch (error) {
          console.error(`Error importing field group ${groupData.title}:`, error);
          results.push({
            title: groupData.title,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successCount = results.filter((r: any) => r.success).length;
      const failureCount = results.filter((r: any) => !r.success).length;

      res.status(201).json({
        success: true,
        message: `${successCount} field groups imported successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        data: results
      });
    } catch (error) {
      console.error('Error importing field groups:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to import field groups',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}