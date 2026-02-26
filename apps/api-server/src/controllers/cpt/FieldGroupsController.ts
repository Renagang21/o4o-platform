import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { FieldGroup, CustomField, CustomFieldValue } from '../../entities/CustomField.js';
import type { AuthRequest } from '../../types/auth.js';
import { User } from '../../entities/User.js';

export class FieldGroupsController {
  private fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
  private customFieldRepo = AppDataSource.getRepository(CustomField);
  private fieldValueRepo = AppDataSource.getRepository(CustomFieldValue);

  async getAllFieldGroups(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, search, active } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const queryBuilder = this.fieldGroupRepo
        .createQueryBuilder('fieldGroup')
        .leftJoinAndSelect('fieldGroup.fields', 'fields')
        .orderBy('fieldGroup.order', 'ASC')
        .addOrderBy('fields.order', 'ASC');

      if (search) {
        queryBuilder.andWhere(
          '(fieldGroup.title ILIKE :search OR fieldGroup.description ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      if (active !== undefined) {
        queryBuilder.andWhere('fieldGroup.active = :active', { active: active === 'true' });
      }

      const [fieldGroups, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      res.json({
        success: true,
        data: {
          fieldGroups,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching field groups:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch field groups' }
      });
    }
  }

  async getFieldGroupById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const fieldGroup = await this.fieldGroupRepo.findOne({
        where: { id },
        relations: ['fields']
      });

      if (!fieldGroup) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Field group not found' }
        });
      }

      res.json({ success: true, data: fieldGroup });
    } catch (error) {
      console.error('Error fetching field group:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch field group' }
      });
    }
  }

  async createFieldGroup(req: Request, res: Response) {
    try {
      const { title, description, location, rules, options, placement, fields = [] } = req.body;
      const user = (req as AuthRequest).user as User;

      if (!user || !user.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      // Create field group
      const fieldGroup = this.fieldGroupRepo.create({
        title,
        description,
        location: location || [],
        rules,
        options,
        placement: placement || 'normal',
        active: true,
        order: 0
      });

      const savedFieldGroup = await this.fieldGroupRepo.save(fieldGroup);

      // Create fields if provided
      if (fields && fields.length > 0) {
        const customFields = fields.map((field: any, index: number) =>
          this.customFieldRepo.create({
            ...field,
            groupId: savedFieldGroup.id,
            order: field.order || index
          })
        );

        await this.customFieldRepo.save(customFields);
      }

      // Fetch complete field group with relations
      const completeFieldGroup = await this.fieldGroupRepo.findOne({
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
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create field group' }
      });
    }
  }

  async updateFieldGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as User;

      if (!user || !user.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      const fieldGroup = await this.fieldGroupRepo.findOne({
        where: { id },
        relations: ['fields']
      });

      if (!fieldGroup) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Field group not found' }
        });
      }

      const { fields, ...updateData } = req.body;

      // Update field group
      await this.fieldGroupRepo.update(id, updateData);

      // Update fields if provided
      if (fields) {
        // Remove existing fields
        await this.customFieldRepo.delete({ groupId: id });

        // Create new fields
        if (fields.length > 0) {
          const customFields = fields.map((field: any, index: number) =>
            this.customFieldRepo.create({
              ...field,
              groupId: id,
              order: field.order || index
            })
          );

          await this.customFieldRepo.save(customFields);
        }
      }

      // Fetch updated field group
      const updatedFieldGroup = await this.fieldGroupRepo.findOne({
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
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update field group' }
      });
    }
  }

  async deleteFieldGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as User;

      if (!user || !user.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      const fieldGroup = await this.fieldGroupRepo.findOne({
        where: { id },
        relations: ['fields']
      });

      if (!fieldGroup) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Field group not found' }
        });
      }

      // Delete field values
      for (const field of fieldGroup.fields) {
        await this.fieldValueRepo.delete({ fieldId: field.id });
      }

      // Delete fields (cascade will handle this, but being explicit)
      await this.customFieldRepo.delete({ groupId: id });

      // Delete field group
      await this.fieldGroupRepo.remove(fieldGroup);

      res.json({
        success: true,
        message: 'Field group deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting field group:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete field group' }
      });
    }
  }

  async duplicateFieldGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const user = (req as AuthRequest).user as User;

      if (!user || !user.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      const originalFieldGroup = await this.fieldGroupRepo.findOne({
        where: { id },
        relations: ['fields']
      });

      if (!originalFieldGroup) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Field group not found' }
        });
      }

      // Create duplicate field group
      const duplicateFieldGroup = this.fieldGroupRepo.create({
        ...originalFieldGroup,
        id: undefined, // Let TypeORM generate new ID
        title: title || `${originalFieldGroup.title} (Copy)`,
        active: false // Start as inactive
      });

      const savedFieldGroup = await this.fieldGroupRepo.save(duplicateFieldGroup);

      // Duplicate fields
      if (originalFieldGroup.fields && originalFieldGroup.fields.length > 0) {
        const duplicateFields = originalFieldGroup.fields.map(field =>
          this.customFieldRepo.create({
            ...field,
            id: undefined, // Let TypeORM generate new ID
            groupId: savedFieldGroup.id
          })
        );

        await this.customFieldRepo.save(duplicateFields);
      }

      // Fetch complete duplicated field group
      const completeFieldGroup = await this.fieldGroupRepo.findOne({
        where: { id: savedFieldGroup.id },
        relations: ['fields']
      });

      res.status(201).json({
        success: true,
        data: completeFieldGroup,
        message: 'Field group duplicated successfully'
      });
    } catch (error) {
      console.error('Error duplicating field group:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to duplicate field group' }
      });
    }
  }

  async toggleFieldGroupStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as User;

      if (!user || !user.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      const fieldGroup = await this.fieldGroupRepo.findOne({ where: { id } });

      if (!fieldGroup) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Field group not found' }
        });
      }

      fieldGroup.active = !fieldGroup.active;
      await this.fieldGroupRepo.save(fieldGroup);

      res.json({
        success: true,
        data: { active: fieldGroup.active },
        message: `Field group ${fieldGroup.active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling field group status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle field group status' }
      });
    }
  }

  async reorderFieldGroups(req: Request, res: Response) {
    try {
      const { fieldGroups } = req.body; // Array of { id, order }
      const user = (req as AuthRequest).user as User;

      if (!user || !user.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      if (!Array.isArray(fieldGroups)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Field groups array is required' }
        });
      }

      // Update order for each field group
      for (const item of fieldGroups) {
        await this.fieldGroupRepo.update(item.id, { order: item.order });
      }

      res.json({
        success: true,
        message: 'Field groups reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering field groups:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder field groups' }
      });
    }
  }

  async getFieldGroupsByLocation(req: Request, res: Response) {
    try {
      const { postType, template, category } = req.query;

      if (!postType) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Post type is required' }
        });
      }

      const queryBuilder = this.fieldGroupRepo
        .createQueryBuilder('fieldGroup')
        .leftJoinAndSelect('fieldGroup.fields', 'fields')
        .where('fieldGroup.active = :active', { active: true })
        .orderBy('fieldGroup.order', 'ASC')
        .addOrderBy('fields.order', 'ASC');

      // Filter by location rules
      queryBuilder.andWhere(
        "fieldGroup.location::text LIKE :postType",
        { postType: `%"value":"${postType}"%` }
      );

      const fieldGroups = await queryBuilder.getMany();

      res.json({
        success: true,
        data: fieldGroups
      });
    } catch (error) {
      console.error('Error fetching field groups by location:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch field groups by location' }
      });
    }
  }
}