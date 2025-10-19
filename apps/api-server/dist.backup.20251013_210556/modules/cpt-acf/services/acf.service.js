"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acfService = exports.ACFService = void 0;
const connection_1 = require("../../../database/connection");
const CustomField_1 = require("../../../entities/CustomField");
const MetaDataService_1 = require("../../../services/MetaDataService");
const class_validator_1 = require("class-validator");
const logger_1 = __importDefault(require("../../../utils/logger"));
/**
 * ACF Service - Business logic layer for Advanced Custom Fields
 * Follows the pattern from affiliate module
 */
class ACFService {
    constructor() {
        this.fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
        this.fieldRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomField);
        this.fieldValueRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
    }
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
        }
        catch (error) {
            logger_1.default.error('Error fetching field groups:', error);
            throw new Error('Failed to fetch field groups');
        }
    }
    /**
     * Get field group by ID
     */
    async getFieldGroup(id) {
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
        }
        catch (error) {
            logger_1.default.error('Error fetching field group:', error);
            throw new Error('Failed to fetch field group');
        }
    }
    /**
     * Create field group
     */
    async createFieldGroup(data) {
        try {
            const { fields, ...groupData } = data;
            // Create the field group first
            const fieldGroup = this.fieldGroupRepo.create(groupData);
            // Validate the entity
            const errors = await (0, class_validator_1.validate)(fieldGroup);
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
        }
        catch (error) {
            logger_1.default.error('Error creating field group:', error);
            throw new Error('Failed to create field group');
        }
    }
    /**
     * Update field group
     */
    async updateFieldGroup(id, data) {
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
            const errors = await (0, class_validator_1.validate)(fieldGroup);
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
        }
        catch (error) {
            logger_1.default.error('Error updating field group:', error);
            throw new Error('Failed to update field group');
        }
    }
    /**
     * Delete field group
     */
    async deleteFieldGroup(id) {
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
        }
        catch (error) {
            logger_1.default.error('Error deleting field group:', error);
            throw new Error('Failed to delete field group');
        }
    }
    /**
     * Get field values for an entity
     */
    async getFieldValues(entityType, entityId) {
        try {
            const values = {}; // TODO: Implement getAllMeta method in MetaDataService
            return {
                success: true,
                data: values
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching field values:', error);
            throw new Error('Failed to fetch field values');
        }
    }
    /**
     * Save field values for an entity
     */
    async saveFieldValues(entityType, entityId, values) {
        try {
            const results = [];
            for (const [fieldName, value] of Object.entries(values)) {
                const saved = await MetaDataService_1.metaDataService.setMeta(entityType, entityId, fieldName, value);
                results.push({ fieldName, success: true });
            }
            return {
                success: true,
                data: results,
                message: 'Field values saved successfully'
            };
        }
        catch (error) {
            logger_1.default.error('Error saving field values:', error);
            throw new Error('Failed to save field values');
        }
    }
    /**
     * Export field groups
     */
    async exportFieldGroups(groupIds) {
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
        }
        catch (error) {
            logger_1.default.error('Error exporting field groups:', error);
            throw new Error('Failed to export field groups');
        }
    }
    /**
     * Import field groups
     */
    async importFieldGroups(data) {
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
                    where: { title: group.title }
                });
                let savedGroup;
                if (existingGroup) {
                    // Update existing group
                    Object.assign(existingGroup, group);
                    savedGroup = await this.fieldGroupRepo.save(existingGroup);
                    // Delete existing fields
                    await this.fieldRepo.delete({ groupId: savedGroup.id });
                }
                else {
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
        }
        catch (error) {
            logger_1.default.error('Error importing field groups:', error);
            throw new Error('Failed to import field groups');
        }
    }
}
exports.ACFService = ACFService;
// Export singleton instance
exports.acfService = new ACFService();
//# sourceMappingURL=acf.service.js.map