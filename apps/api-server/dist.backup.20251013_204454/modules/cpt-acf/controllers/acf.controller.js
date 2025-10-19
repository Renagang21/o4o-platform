"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACFController = void 0;
const acf_service_1 = require("../services/acf.service");
const logger_1 = __importDefault(require("../../../utils/logger"));
/**
 * ACF Controller - HTTP layer only, delegates business logic to service
 * Refactored to follow clean architecture pattern
 */
class ACFController {
    /**
     * Get field groups
     */
    static async getFieldGroups(req, res) {
        try {
            const result = await acf_service_1.acfService.getFieldGroups();
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - getFieldGroups:', error);
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
    static async getFieldGroup(req, res) {
        try {
            const { id } = req.params;
            const result = await acf_service_1.acfService.getFieldGroup(id);
            if (!result.success) {
                return res.status(404).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - getFieldGroup:', error);
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
    static async createFieldGroup(req, res) {
        try {
            const result = await acf_service_1.acfService.createFieldGroup(req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(201).json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - createFieldGroup:', error);
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
    static async updateFieldGroup(req, res) {
        try {
            const { id } = req.params;
            const result = await acf_service_1.acfService.updateFieldGroup(id, req.body);
            if (!result.success) {
                return res.status(404).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - updateFieldGroup:', error);
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
    static async deleteFieldGroup(req, res) {
        try {
            const { id } = req.params;
            const result = await acf_service_1.acfService.deleteFieldGroup(id);
            if (!result.success) {
                return res.status(404).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - deleteFieldGroup:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Get field values for an entity
     */
    static async getFieldValues(req, res) {
        try {
            const { entityType, entityId } = req.params;
            const result = await acf_service_1.acfService.getFieldValues(entityType, entityId);
            if (!result.success) {
                return res.status(404).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - getFieldValues:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Save field values for an entity
     */
    static async saveFieldValues(req, res) {
        try {
            const { entityType, entityId } = req.params;
            const result = await acf_service_1.acfService.saveFieldValues(entityType, entityId, req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - saveFieldValues:', error);
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
    static async exportFieldGroups(req, res) {
        try {
            const { groupIds } = req.body;
            const result = await acf_service_1.acfService.exportFieldGroups(groupIds);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - exportFieldGroups:', error);
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
    static async importFieldGroups(req, res) {
        try {
            const result = await acf_service_1.acfService.importFieldGroups(req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - importFieldGroups:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
}
exports.ACFController = ACFController;
//# sourceMappingURL=acf.controller.js.map