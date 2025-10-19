"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuAdvancedController = void 0;
const connection_1 = require("../../database/connection");
const MenuItem_1 = require("../../entities/MenuItem");
const Menu_1 = require("../../entities/Menu");
const logger_1 = __importDefault(require("../../utils/logger"));
class MenuAdvancedController {
    constructor() {
        // In production, these would be separate entities
        this.conditions = new Map();
        this.styles = new Map();
        this.megaMenus = new Map();
        this.menuRepository = connection_1.AppDataSource.getRepository(Menu_1.Menu);
        this.menuItemRepository = connection_1.AppDataSource.getRepository(MenuItem_1.MenuItem);
    }
    // ============================================================================
    // CONDITIONAL DISPLAY APIs
    // ============================================================================
    /**
     * POST /api/v1/menu-items/:id/conditions
     * Create conditions for menu item display
     */
    async createMenuItemConditions(req, res) {
        try {
            const { id } = req.params;
            const conditions = req.body;
            // Verify menu item exists
            const menuItem = await this.menuItemRepository.findOne({ where: { id } });
            if (!menuItem) {
                res.status(404).json({
                    success: false,
                    error: 'Menu item not found'
                });
                return;
            }
            // Store conditions (in production, save to database)
            const conditionData = {
                menu_item_id: id,
                ...conditions,
                is_active: true
            };
            const existingConditions = this.conditions.get(id) || [];
            existingConditions.push(conditionData);
            this.conditions.set(id, existingConditions);
            res.status(201).json({
                success: true,
                data: conditionData,
                message: 'Menu item conditions created successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Error creating menu item conditions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create menu item conditions'
            });
        }
    }
    /**
     * GET /api/v1/menu-items/:id/conditions
     * Get conditions for menu item
     */
    async getMenuItemConditions(req, res) {
        try {
            const { id } = req.params;
            const conditions = this.conditions.get(id) || [];
            res.json({
                success: true,
                data: conditions
            });
        }
        catch (error) {
            logger_1.default.error('Error getting menu item conditions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get menu item conditions'
            });
        }
    }
    /**
     * DELETE /api/v1/menu-items/:id/conditions
     * Delete all conditions for menu item
     */
    async deleteMenuItemConditions(req, res) {
        try {
            const { id } = req.params;
            this.conditions.delete(id);
            res.json({
                success: true,
                message: 'Menu item conditions deleted successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Error deleting menu item conditions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete menu item conditions'
            });
        }
    }
    // ============================================================================
    // MENU STYLES APIs
    // ============================================================================
    /**
     * POST /api/v1/menus/:id/styles
     * Create styles for menu
     */
    async createMenuStyles(req, res) {
        try {
            const { id } = req.params;
            const styles = req.body;
            // Verify menu exists
            const menu = await this.menuRepository.findOne({ where: { id } });
            if (!menu) {
                res.status(404).json({
                    success: false,
                    error: 'Menu not found'
                });
                return;
            }
            // Store styles (in production, save to database)
            const styleData = {
                menu_id: id,
                ...styles
            };
            this.styles.set(id, styleData);
            res.status(201).json({
                success: true,
                data: styleData,
                message: 'Menu styles created successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Error creating menu styles:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create menu styles'
            });
        }
    }
    /**
     * GET /api/v1/menus/:id/styles
     * Get styles for menu
     */
    async getMenuStyles(req, res) {
        try {
            const { id } = req.params;
            const styles = this.styles.get(id);
            if (!styles) {
                res.status(404).json({
                    success: false,
                    error: 'Menu styles not found'
                });
                return;
            }
            res.json({
                success: true,
                data: styles
            });
        }
        catch (error) {
            logger_1.default.error('Error getting menu styles:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get menu styles'
            });
        }
    }
    /**
     * PUT /api/v1/menus/:id/styles
     * Update styles for menu
     */
    async updateMenuStyles(req, res) {
        try {
            const { id } = req.params;
            const styles = req.body;
            // Verify menu exists
            const menu = await this.menuRepository.findOne({ where: { id } });
            if (!menu) {
                res.status(404).json({
                    success: false,
                    error: 'Menu not found'
                });
                return;
            }
            // Update styles
            const existingStyles = this.styles.get(id) || { menu_id: id };
            const updatedStyles = {
                ...existingStyles,
                ...styles,
                menu_id: id
            };
            this.styles.set(id, updatedStyles);
            res.json({
                success: true,
                data: updatedStyles,
                message: 'Menu styles updated successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Error updating menu styles:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update menu styles'
            });
        }
    }
    // ============================================================================
    // MEGA MENU APIs
    // ============================================================================
    /**
     * POST /api/v1/menus/:id/mega-menu
     * Create mega menu configuration
     */
    async createMegaMenu(req, res) {
        try {
            const { id } = req.params;
            const config = req.body;
            // Verify menu exists
            const menu = await this.menuRepository.findOne({ where: { id } });
            if (!menu) {
                res.status(404).json({
                    success: false,
                    error: 'Menu not found'
                });
                return;
            }
            // Store mega menu config
            const megaMenuData = {
                menu_id: id,
                enabled: true,
                columns: 4,
                width: 'container',
                layout: 'grid',
                content_type: 'menu_items',
                ...config
            };
            this.megaMenus.set(id, megaMenuData);
            res.status(201).json({
                success: true,
                data: megaMenuData,
                message: 'Mega menu created successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Error creating mega menu:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create mega menu'
            });
        }
    }
    /**
     * GET /api/v1/menus/:id/mega-menu
     * Get mega menu configuration
     */
    async getMegaMenu(req, res) {
        try {
            const { id } = req.params;
            const megaMenu = this.megaMenus.get(id);
            if (!megaMenu) {
                res.status(404).json({
                    success: false,
                    error: 'Mega menu configuration not found'
                });
                return;
            }
            res.json({
                success: true,
                data: megaMenu
            });
        }
        catch (error) {
            logger_1.default.error('Error getting mega menu:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get mega menu'
            });
        }
    }
    /**
     * PUT /api/v1/menus/:id/mega-menu
     * Update mega menu configuration
     */
    async updateMegaMenu(req, res) {
        try {
            const { id } = req.params;
            const config = req.body;
            // Verify menu exists
            const menu = await this.menuRepository.findOne({ where: { id } });
            if (!menu) {
                res.status(404).json({
                    success: false,
                    error: 'Menu not found'
                });
                return;
            }
            // Update mega menu config
            const existingConfig = this.megaMenus.get(id) || { menu_id: id };
            const updatedConfig = {
                ...existingConfig,
                ...config,
                menu_id: id
            };
            this.megaMenus.set(id, updatedConfig);
            res.json({
                success: true,
                data: updatedConfig,
                message: 'Mega menu updated successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Error updating mega menu:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update mega menu'
            });
        }
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    /**
     * Evaluate conditions for menu item visibility
     */
    evaluateConditions(menuItemId, context) {
        const conditions = this.conditions.get(menuItemId);
        if (!conditions || conditions.length === 0) {
            return true; // No conditions means always visible
        }
        for (const condition of conditions) {
            if (!condition.is_active)
                continue;
            switch (condition.condition_type) {
                case 'user_role':
                    if (context.userRole !== condition.condition_value) {
                        return false;
                    }
                    break;
                case 'user_logged_in':
                    if (context.isLoggedIn !== condition.condition_value) {
                        return false;
                    }
                    break;
                case 'page_type':
                    if (context.pageType !== condition.condition_value) {
                        return false;
                    }
                    break;
                case 'device_type':
                    if (context.deviceType !== condition.condition_value) {
                        return false;
                    }
                    break;
                default:
                    // Custom condition evaluation
                    break;
            }
        }
        return true;
    }
    /**
     * Generate CSS from menu styles
     */
    generateCSS(menuId) {
        const styles = this.styles.get(menuId);
        if (!styles)
            return '';
        let css = '';
        const s = styles.styles;
        // Generate base styles
        css += `.menu-${menuId} {\n`;
        if (s.background_color)
            css += `  background-color: ${s.background_color};\n`;
        if (s.text_color)
            css += `  color: ${s.text_color};\n`;
        if (s.font_size)
            css += `  font-size: ${s.font_size};\n`;
        if (s.font_weight)
            css += `  font-weight: ${s.font_weight};\n`;
        if (s.padding)
            css += `  padding: ${s.padding};\n`;
        if (s.margin)
            css += `  margin: ${s.margin};\n`;
        if (s.border)
            css += `  border: ${s.border};\n`;
        if (s.border_radius)
            css += `  border-radius: ${s.border_radius};\n`;
        css += '}\n';
        // Generate hover styles
        if (s.hover_background || s.hover_text_color) {
            css += `.menu-${menuId} a:hover {\n`;
            if (s.hover_background)
                css += `  background-color: ${s.hover_background};\n`;
            if (s.hover_text_color)
                css += `  color: ${s.hover_text_color};\n`;
            css += '}\n';
        }
        // Add custom CSS
        if (s.custom_css) {
            css += s.custom_css;
        }
        // Generate responsive styles
        if (styles.breakpoints) {
            if (styles.breakpoints.mobile) {
                css += `@media (max-width: 768px) {\n`;
                css += `  .menu-${menuId} {\n`;
                // Add mobile-specific styles
                css += '  }\n}\n';
            }
        }
        return css;
    }
}
exports.MenuAdvancedController = MenuAdvancedController;
//# sourceMappingURL=MenuAdvancedController.js.map