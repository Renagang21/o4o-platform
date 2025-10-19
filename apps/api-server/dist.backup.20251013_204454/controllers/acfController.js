"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACFController = void 0;
const connection_1 = require("../database/connection");
const CustomField_1 = require("../entities/CustomField");
const class_validator_1 = require("class-validator");
const MetaDataService_1 = require("../services/MetaDataService");
class ACFController {
    // Field Groups
    static async getFieldGroups(req, res) {
        try {
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
            const fieldGroups = await fieldGroupRepo.find({
                relations: ['fields'],
                order: { order: 'ASC' }
            });
            res.json({
                success: true,
                data: fieldGroups,
                total: fieldGroups.length
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to fetch field groups',
                message: error.message
            });
        }
    }
    static async getFieldGroup(req, res) {
        try {
            const { id } = req.params;
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
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
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to fetch field group',
                message: error.message
            });
        }
    }
    static async createFieldGroup(req, res) {
        var _a;
        try {
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
            const fieldRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomField);
            const { fields, ...groupData } = req.body;
            // Create field group
            const fieldGroup = fieldGroupRepo.create(groupData);
            const errors = await (0, class_validator_1.validate)(fieldGroup);
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors
                });
            }
            const savedGroup = await fieldGroupRepo.save(fieldGroup);
            // Create fields if provided
            if (fields && Array.isArray(fields)) {
                for (const [index, fieldData] of fields.entries()) {
                    const field = fieldRepo.create({
                        ...fieldData,
                        groupId: savedGroup.id,
                        order: (_a = fieldData.order) !== null && _a !== void 0 ? _a : index
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
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to create field group',
                message: error.message
            });
        }
    }
    static async updateFieldGroup(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
            const fieldRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomField);
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
                        order: (_a = fieldData.order) !== null && _a !== void 0 ? _a : index
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
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to update field group',
                message: error.message
            });
        }
    }
    static async deleteFieldGroup(req, res) {
        try {
            const { id } = req.params;
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
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
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to delete field group',
                message: error.message
            });
        }
    }
    // Field Values
    static async getFieldValues(req, res) {
        try {
            const { entityType, entityId } = req.params;
            // 새로운 통합 데이터 접근 레이어 사용
            const metaData = await MetaDataService_1.metaDataService.getManyMeta(entityType, [entityId]);
            const result = metaData[entityId] || {};
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to fetch field values',
                message: error.message
            });
        }
    }
    static async saveFieldValues(req, res) {
        try {
            const { entityType, entityId } = req.params;
            const values = req.body;
            // 새로운 통합 데이터 접근 레이어 사용 (트랜잭션 포함)
            const success = await MetaDataService_1.metaDataService.setManyMeta(entityType, entityId, values);
            if (success) {
                res.json({
                    success: true,
                    message: 'Field values saved successfully'
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to save field values'
                });
            }
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to save field values',
                message: error.message
            });
        }
    }
    // Export/Import
    static async exportFieldGroups(req, res) {
        try {
            const { ids } = req.body;
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
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
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to export field groups',
                message: error.message
            });
        }
    }
    static async importFieldGroups(req, res) {
        try {
            const { fieldGroups } = req.body;
            if (!fieldGroups || !Array.isArray(fieldGroups)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid import data'
                });
            }
            const fieldGroupRepo = connection_1.AppDataSource.getRepository(CustomField_1.FieldGroup);
            const fieldRepo = connection_1.AppDataSource.getRepository(CustomField_1.CustomField);
            const importedGroups = [];
            for (const groupData of fieldGroups) {
                const { fields, id, ...groupProps } = groupData;
                // Create new field group
                const fieldGroup = fieldGroupRepo.create(groupProps);
                const savedGroup = await fieldGroupRepo.save(fieldGroup);
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
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to import field groups',
                message: error.message
            });
        }
    }
}
exports.ACFController = ACFController;
//# sourceMappingURL=acfController.js.map