"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CPTController = void 0;
const cpt_service_1 = require("../services/cpt.service");
const logger_1 = __importDefault(require("../../../utils/logger"));
const cpt_constants_1 = require("../../../config/cpt.constants");
/**
 * CPT Controller - HTTP layer only, delegates business logic to service
 * Refactored to follow clean architecture pattern
 */
class CPTController {
    /**
     * Get all CPTs
     */
    static async getAllCPTs(req, res) {
        try {
            const { active, includeInactive } = req.query;
            // If includeInactive is true, get all CPTs regardless of active status
            // Otherwise, use the active parameter (default to true for backward compatibility)
            let filterActive = active === 'true' || active === undefined;
            if (includeInactive === 'true') {
                filterActive = undefined; // Don't filter by active status
            }
            const result = await cpt_service_1.cptService.getAllCPTs(filterActive);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - getAllCPTs:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Get CPT by slug
     */
    static async getCPTBySlug(req, res) {
        try {
            const { slug } = req.params;
            const result = await cpt_service_1.cptService.getCPTBySlug(slug);
            if (!result.success) {
                return res.status(404).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - getCPTBySlug:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Create CPT
     */
    static async createCPT(req, res) {
        try {
            const result = await cpt_service_1.cptService.createCPT(req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(201).json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - createCPT:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Update CPT
     */
    static async updateCPT(req, res) {
        try {
            const { slug } = req.params;
            const result = await cpt_service_1.cptService.updateCPT(slug, req.body);
            if (!result.success) {
                return res.status(404).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - updateCPT:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Delete CPT
     */
    static async deleteCPT(req, res) {
        try {
            const { slug } = req.params;
            const result = await cpt_service_1.cptService.deleteCPT(slug);
            if (!result.success) {
                return res.status(404).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - deleteCPT:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Get posts by CPT
     */
    static async getPostsByCPT(req, res) {
        try {
            const { slug } = req.params;
            const { page = String(cpt_constants_1.CPT_PAGINATION.DEFAULT_PAGE), limit = String(cpt_constants_1.CPT_PAGINATION.DEFAULT_LIMIT), status, search, orderBy = cpt_constants_1.CPT_QUERY_DEFAULTS.ORDER_BY, order = cpt_constants_1.CPT_QUERY_DEFAULTS.ORDER } = req.query;
            const result = await cpt_service_1.cptService.getPostsByCPT(slug, {
                page: parseInt(page),
                limit: parseInt(limit),
                status: status,
                search: search,
                orderBy: orderBy,
                order: order
            });
            if (!result.success) {
                return res.status(404).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - getPostsByCPT:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Get post by ID
     */
    static async getPostById(req, res) {
        try {
            const { slug, postId } = req.params;
            // This can be implemented in the service
            res.json({
                success: true,
                message: 'Get post by ID - to be implemented'
            });
        }
        catch (error) {
            logger_1.default.error('Controller error - getPostById:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Create post
     */
    static async createPost(req, res) {
        var _a;
        try {
            const { slug } = req.params;
            const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '';
            const result = await cpt_service_1.cptService.createPost(slug, req.body, userId);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(201).json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - createPost:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Update post
     */
    static async updatePost(req, res) {
        try {
            const { postId } = req.params;
            const result = await cpt_service_1.cptService.updatePost(postId, req.body);
            if (!result.success) {
                return res.status(404).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - updatePost:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Delete post
     */
    static async deletePost(req, res) {
        try {
            const { postId } = req.params;
            const result = await cpt_service_1.cptService.deletePost(postId);
            if (!result.success) {
                return res.status(404).json(result);
            }
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - deletePost:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    /**
     * Initialize defaults
     */
    static async initializeDefaults(req, res) {
        try {
            const result = await cpt_service_1.cptService.initializeDefaults();
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Controller error - initializeDefaults:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    // Aliases for backward compatibility
    static async getCPT(req, res) {
        return CPTController.getCPTBySlug(req, res);
    }
    static async getCPTPosts(req, res) {
        return CPTController.getPostsByCPT(req, res);
    }
}
exports.CPTController = CPTController;
//# sourceMappingURL=cpt.controller.js.map