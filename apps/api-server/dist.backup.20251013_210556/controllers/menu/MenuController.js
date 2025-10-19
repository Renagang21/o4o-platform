"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuController = void 0;
const menu_service_1 = require("../../services/menu.service");
const logger_1 = __importDefault(require("../../utils/logger"));
class MenuController {
    constructor() {
        // GET /api/menus - Get all menus
        this.getMenus = async (req, res) => {
            try {
                const { location, is_active } = req.query;
                const params = {};
                if (location) {
                    params.location = location;
                }
                if (is_active !== undefined) {
                    params.is_active = is_active === 'true';
                }
                const menus = await menu_service_1.menuService.findAllMenus(params);
                res.json({
                    success: true,
                    data: menus
                });
            }
            catch (error) {
                logger_1.default.error('Error getting menus:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve menus'
                });
            }
        };
        // GET /api/menus/locations - Get all menu locations
        this.getMenuLocations = async (req, res) => {
            try {
                const locations = await menu_service_1.menuService.findAllMenuLocations();
                res.json({
                    success: true,
                    data: locations
                });
            }
            catch (error) {
                logger_1.default.error('Error getting menu locations:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve menu locations'
                });
            }
        };
        // GET /api/menus/:id - Get menu by ID with tree structure
        this.getMenu = async (req, res) => {
            try {
                const { id } = req.params;
                // UUID validation regex
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const isUuid = uuidRegex.test(id);
                let menu = null;
                // Try to find menu by ID first (only if it's a valid UUID)
                if (isUuid) {
                    menu = await menu_service_1.menuService.findMenuById(id);
                }
                // If not found by ID or not a UUID, try to find by slug
                if (!menu) {
                    try {
                        const menuData = await menu_service_1.menuService.getMenuBySlug(id);
                        if (menuData) {
                            res.json({
                                success: true,
                                data: menuData
                            });
                            return;
                        }
                    }
                    catch (dbError) {
                        logger_1.default.error('Database error looking up menu by slug:', dbError);
                    }
                }
                if (!menu) {
                    res.status(404).json({
                        success: false,
                        error: 'Menu not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    data: menu
                });
            }
            catch (error) {
                logger_1.default.error('Error getting menu:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve menu'
                });
            }
        };
        // GET /api/menus/:id/filtered - Get menu with role-based filtering
        this.getFilteredMenu = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const user = req.authUser || req.user;
                // Determine user role and login status
                const userRole = user === null || user === void 0 ? void 0 : user.role;
                const isLoggedIn = !!user;
                // Get filtered menu items
                const filteredItems = await menu_service_1.menuService.getFilteredMenuItems(id, userRole, isLoggedIn);
                // Get basic menu info
                const menu = await menu_service_1.menuService.findMenuById(id);
                if (!menu) {
                    res.status(404).json({
                        success: false,
                        error: 'Menu not found'
                    });
                    return;
                }
                // Return menu with filtered items
                const filteredMenu = {
                    ...menu,
                    items: filteredItems
                };
                res.json({
                    success: true,
                    data: filteredMenu,
                    meta: {
                        filtered_for_role: userRole || 'anonymous',
                        is_logged_in: isLoggedIn,
                        total_items: ((_a = menu.items) === null || _a === void 0 ? void 0 : _a.length) || 0,
                        visible_items: filteredItems.length
                    }
                });
            }
            catch (error) {
                logger_1.default.error('Error getting filtered menu:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve filtered menu'
                });
            }
        };
        // POST /api/menus - Create new menu
        this.createMenu = async (req, res) => {
            var _a;
            try {
                const menu = await menu_service_1.menuService.createMenu(req.body);
                res.status(201).json({
                    success: true,
                    data: menu,
                    message: 'Menu created successfully'
                });
            }
            catch (error) {
                logger_1.default.error('Error creating menu:', error);
                if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('already exists')) {
                    res.status(400).json({
                        success: false,
                        error: error.message
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to create menu'
                    });
                }
            }
        };
        // PUT /api/menus/:id - Update menu
        this.updateMenu = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const menu = await menu_service_1.menuService.updateMenu(id, req.body);
                if (!menu) {
                    res.status(404).json({
                        success: false,
                        error: 'Menu not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    data: menu,
                    message: 'Menu updated successfully'
                });
            }
            catch (error) {
                logger_1.default.error('Error updating menu:', error);
                if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('already exists')) {
                    res.status(400).json({
                        success: false,
                        error: error.message
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to update menu'
                    });
                }
            }
        };
        // DELETE /api/menus/:id - Delete menu
        this.deleteMenu = async (req, res) => {
            try {
                const { id } = req.params;
                const deleted = await menu_service_1.menuService.deleteMenu(id);
                if (!deleted) {
                    res.status(404).json({
                        success: false,
                        error: 'Menu not found'
                    });
                    return;
                }
                res.status(204).send();
            }
            catch (error) {
                logger_1.default.error('Error deleting menu:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete menu'
                });
            }
        };
        // PUT /api/menus/:id/reorder - Reorder menu items
        this.reorderMenuItems = async (req, res) => {
            try {
                const { id } = req.params;
                const items = req.body;
                if (!Array.isArray(items)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid request body. Expected array of items'
                    });
                    return;
                }
                const updatedItems = await menu_service_1.menuService.reorderMenuItems(id, items);
                res.json({
                    success: true,
                    data: updatedItems,
                    message: 'Menu items reordered successfully'
                });
            }
            catch (error) {
                logger_1.default.error('Error reordering menu items:', error);
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to reorder menu items'
                });
            }
        };
        // POST /api/menus/:id/duplicate - Duplicate menu with all items
        this.duplicateMenu = async (req, res) => {
            try {
                const { id } = req.params;
                const { name, slug } = req.body;
                if (!name) {
                    res.status(400).json({
                        success: false,
                        error: 'Name is required'
                    });
                    return;
                }
                const menu = await menu_service_1.menuService.duplicateMenu(id, name, slug);
                if (!menu) {
                    res.status(404).json({
                        success: false,
                        error: 'Source menu not found'
                    });
                    return;
                }
                res.status(201).json({
                    success: true,
                    data: menu,
                    message: 'Menu duplicated successfully'
                });
            }
            catch (error) {
                logger_1.default.error('Error duplicating menu:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to duplicate menu'
                });
            }
        };
        // POST /api/menu-items - Add menu item
        this.addMenuItem = async (req, res) => {
            try {
                const menuItem = await menu_service_1.menuService.addMenuItem(req.body);
                if (!menuItem) {
                    res.status(404).json({
                        success: false,
                        error: 'Menu not found'
                    });
                    return;
                }
                res.status(201).json({
                    success: true,
                    data: menuItem,
                    message: 'Menu item added successfully'
                });
            }
            catch (error) {
                logger_1.default.error('Error adding menu item:', error);
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to add menu item'
                });
            }
        };
        // PUT /api/menu-items/:id - Update menu item
        this.updateMenuItem = async (req, res) => {
            try {
                const { id } = req.params;
                const menuItem = await menu_service_1.menuService.updateMenuItem(id, req.body);
                if (!menuItem) {
                    res.status(404).json({
                        success: false,
                        error: 'Menu item not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    data: menuItem,
                    message: 'Menu item updated successfully'
                });
            }
            catch (error) {
                logger_1.default.error('Error updating menu item:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update menu item'
                });
            }
        };
        // DELETE /api/menu-items/:id - Delete menu item
        this.deleteMenuItem = async (req, res) => {
            try {
                const { id } = req.params;
                const deleted = await menu_service_1.menuService.deleteMenuItem(id);
                if (!deleted) {
                    res.status(404).json({
                        success: false,
                        error: 'Menu item not found'
                    });
                    return;
                }
                res.status(204).send();
            }
            catch (error) {
                logger_1.default.error('Error deleting menu item:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete menu item'
                });
            }
        };
        // GET /api/menus/location/:key - Get menu by location key
        this.getMenuByLocation = async (req, res) => {
            try {
                const { key } = req.params;
                const { subdomain, path } = req.query;
                // Extract subdomain and path prefix
                const subdomainStr = subdomain ? String(subdomain) : null;
                const pathStr = path ? String(path) : null;
                // Extract path prefix from path (/seller1/products -> /seller1)
                let pathPrefix = null;
                if (pathStr && pathStr !== '/') {
                    const segments = pathStr.split('/').filter(Boolean);
                    if (segments.length > 0) {
                        pathPrefix = `/${segments[0]}`;
                    }
                }
                // Get menu with context filtering
                const menu = await menu_service_1.menuService.getMenuByLocationWithContext(key, subdomainStr, pathPrefix);
                if (!menu) {
                    res.json({
                        success: false,
                        data: null,
                        message: `No active menu found for location: ${key}`,
                        context: {
                            subdomain: subdomainStr,
                            path: pathStr,
                            pathPrefix
                        }
                    });
                    return;
                }
                res.json({
                    success: true,
                    data: menu,
                    context: {
                        subdomain: subdomainStr,
                        path: pathStr,
                        pathPrefix
                    }
                });
            }
            catch (error) {
                logger_1.default.error('Error getting menu by location:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve menu by location'
                });
            }
        };
    }
}
exports.MenuController = MenuController;
//# sourceMappingURL=MenuController.js.map