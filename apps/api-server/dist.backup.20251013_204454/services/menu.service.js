"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuService = void 0;
const connection_1 = require("../database/connection");
const Menu_1 = require("../entities/Menu");
const MenuItem_1 = require("../entities/MenuItem");
const MenuLocation_1 = require("../entities/MenuLocation");
class MenuService {
    constructor() {
        this.menuRepository = connection_1.AppDataSource.getRepository(Menu_1.Menu);
        this.menuItemRepository = connection_1.AppDataSource.getTreeRepository(MenuItem_1.MenuItem);
        this.menuLocationRepository = connection_1.AppDataSource.getRepository(MenuLocation_1.MenuLocation);
    }
    // Menu CRUD Operations
    async findAllMenus(params) {
        const query = this.menuRepository.createQueryBuilder('menu');
        if (params === null || params === void 0 ? void 0 : params.location) {
            query.andWhere('menu.location = :location', { location: params.location });
        }
        if ((params === null || params === void 0 ? void 0 : params.is_active) !== undefined) {
            query.andWhere('menu.is_active = :is_active', { is_active: params.is_active });
        }
        return query.orderBy('menu.created_at', 'DESC').getMany();
    }
    async findMenuById(id) {
        const menu = await this.menuRepository.findOne({
            where: { id },
            relations: ['items']
        });
        if (!menu) {
            return null;
        }
        // Get tree structure for menu items
        const rootItems = await this.menuItemRepository
            .createQueryBuilder('item')
            .where('item.menu_id = :menuId', { menuId: id })
            .andWhere('item.parent IS NULL')
            .orderBy('item.order_num', 'ASC')
            .getMany();
        // Load tree for each root item
        const itemsWithChildren = await Promise.all(rootItems.map(item => this.menuItemRepository.findDescendantsTree(item)));
        menu.items = itemsWithChildren;
        return menu;
    }
    async getMenuBySlug(slug) {
        // Check database connection first
        if (!this.menuRepository.manager.connection.isInitialized) {
            throw new Error('Database not initialized');
        }
        // Query database directly for menu with items
        const result = await this.menuRepository.manager.query(`
      SELECT m.id, m.name, m.slug, m.location, m.is_active,
             json_agg(
               json_build_object(
                 'id', mi.id,
                 'title', mi.title,
                 'url', mi.url,
                 'type', mi.type,
                 'target', mi.target,
                 'order_num', mi.order_num
               ) ORDER BY mi.order_num
             ) FILTER (WHERE mi.id IS NOT NULL) as items
      FROM menus m
      LEFT JOIN menu_items mi ON m.id = mi.menu_id
      WHERE m.slug = $1
      GROUP BY m.id, m.name, m.slug, m.location, m.is_active
    `, [slug]);
        if (result && result.length > 0) {
            const menu = result[0];
            return {
                id: menu.id,
                name: menu.name,
                slug: menu.slug,
                location: menu.location,
                is_active: menu.is_active,
                items: menu.items || []
            };
        }
        return null;
    }
    async createMenu(data) {
        // Check if slug already exists
        if (data.slug) {
            const existing = await this.menuRepository.findOne({
                where: { slug: data.slug }
            });
            if (existing) {
                throw new Error(`Menu with slug "${data.slug}" already exists`);
            }
        }
        const menu = this.menuRepository.create(data);
        return this.menuRepository.save(menu);
    }
    async updateMenu(id, data) {
        const menu = await this.findMenuById(id);
        if (!menu) {
            return null;
        }
        // Check if new slug already exists
        if (data.slug && data.slug !== menu.slug) {
            const existing = await this.menuRepository.findOne({
                where: { slug: data.slug }
            });
            if (existing) {
                throw new Error(`Menu with slug "${data.slug}" already exists`);
            }
        }
        Object.assign(menu, data);
        return this.menuRepository.save(menu);
    }
    async deleteMenu(id) {
        const menu = await this.findMenuById(id);
        if (!menu) {
            return false;
        }
        await this.menuRepository.remove(menu);
        return true;
    }
    // Menu Item Operations
    async addMenuItem(data) {
        const menu = await this.findMenuById(data.menu_id);
        if (!menu) {
            return null;
        }
        const menuItem = this.menuItemRepository.create({
            menu_id: data.menu_id,
            title: data.title,
            url: data.url,
            type: data.type,
            target: data.target,
            icon: data.icon,
            css_class: data.css_class,
            order_num: data.order_num,
            reference_id: data.reference_id,
            metadata: data.metadata,
            menu: menu
        });
        if (data.parent_id) {
            const parent = await this.menuItemRepository.findOne({
                where: { id: data.parent_id, menu_id: data.menu_id }
            });
            if (!parent) {
                throw new Error(`Parent menu item with ID ${data.parent_id} not found`);
            }
            menuItem.parent = parent;
        }
        return this.menuItemRepository.save(menuItem);
    }
    async updateMenuItem(id, data) {
        const menuItem = await this.menuItemRepository.findOne({
            where: { id }
        });
        if (!menuItem) {
            return null;
        }
        Object.assign(menuItem, data);
        return this.menuItemRepository.save(menuItem);
    }
    async deleteMenuItem(id) {
        const menuItem = await this.menuItemRepository.findOne({
            where: { id }
        });
        if (!menuItem) {
            return false;
        }
        await this.menuItemRepository.remove(menuItem);
        return true;
    }
    async reorderMenuItems(menuId, items) {
        const menu = await this.findMenuById(menuId);
        if (!menu) {
            throw new Error(`Menu with ID ${menuId} not found`);
        }
        const queryRunner = connection_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const updatedItems = [];
            for (const item of items) {
                const menuItem = await queryRunner.manager.findOne(MenuItem_1.MenuItem, {
                    where: { id: item.id, menu_id: menuId }
                });
                if (!menuItem) {
                    throw new Error(`Menu item with ID ${item.id} not found`);
                }
                menuItem.order_num = item.order_num;
                if (item.parent_id !== undefined) {
                    if (item.parent_id) {
                        const parent = await queryRunner.manager.findOne(MenuItem_1.MenuItem, {
                            where: { id: item.parent_id, menu_id: menuId }
                        });
                        if (!parent) {
                            throw new Error(`Parent menu item with ID ${item.parent_id} not found`);
                        }
                        menuItem.parent = parent;
                    }
                    else {
                        menuItem.parent = null;
                    }
                }
                const updated = await queryRunner.manager.save(menuItem);
                updatedItems.push(updated);
            }
            await queryRunner.commitTransaction();
            return updatedItems;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    // Menu Location Operations
    async findAllMenuLocations() {
        return this.menuLocationRepository.find({
            where: { is_active: true },
            order: { order_num: 'ASC' }
        });
    }
    async findMenuLocationByKey(key) {
        return this.menuLocationRepository.findOne({
            where: { key }
        });
    }
    async createMenuLocation(data) {
        const existing = await this.menuLocationRepository.findOne({
            where: { key: data.key }
        });
        if (existing) {
            throw new Error(`Menu location with key "${data.key}" already exists`);
        }
        const location = this.menuLocationRepository.create(data);
        return this.menuLocationRepository.save(location);
    }
    async updateMenuLocation(id, data) {
        const location = await this.menuLocationRepository.findOne({
            where: { id }
        });
        if (!location) {
            return null;
        }
        Object.assign(location, data);
        return this.menuLocationRepository.save(location);
    }
    // Helper method to get menu by location
    async getMenuByLocation(location) {
        const menu = await this.menuRepository.findOne({
            where: { location, is_active: true }
        });
        if (!menu) {
            return null;
        }
        return this.findMenuById(menu.id);
    }
    /**
     * Get menu by location with subdomain and path filtering
     * @param location Menu location (primary, footer, etc.)
     * @param subdomain Current subdomain (shop, forum, etc.) or null
     * @param pathPrefix Current path prefix (/seller1, etc.) or null
     * @returns Matching menu or null
     */
    async getMenuByLocationWithContext(location, subdomain, pathPrefix) {
        // Get all active menus for the location
        const menus = await this.menuRepository.find({
            where: { location, is_active: true }
        });
        if (menus.length === 0) {
            return null;
        }
        // Filter menus by subdomain and path_prefix in metadata
        const filteredMenus = menus.filter(menu => {
            if (!menu.metadata) {
                // No metadata means global menu (show everywhere)
                return true;
            }
            const menuSubdomain = menu.metadata.subdomain;
            const menuPathPrefix = menu.metadata.path_prefix;
            // Check subdomain match
            if (menuSubdomain) {
                if (!subdomain || menuSubdomain !== subdomain) {
                    return false;
                }
            }
            // Check path prefix match
            if (menuPathPrefix) {
                if (!pathPrefix || !pathPrefix.startsWith(menuPathPrefix)) {
                    return false;
                }
            }
            return true;
        });
        if (filteredMenus.length === 0) {
            return null;
        }
        // Priority order:
        // 1. subdomain + path_prefix match
        // 2. subdomain only match
        // 3. global menu (no subdomain/path_prefix)
        const sortedMenus = filteredMenus.sort((a, b) => {
            var _a, _b, _c, _d;
            const aHasSubdomain = !!((_a = a.metadata) === null || _a === void 0 ? void 0 : _a.subdomain);
            const aHasPath = !!((_b = a.metadata) === null || _b === void 0 ? void 0 : _b.path_prefix);
            const bHasSubdomain = !!((_c = b.metadata) === null || _c === void 0 ? void 0 : _c.subdomain);
            const bHasPath = !!((_d = b.metadata) === null || _d === void 0 ? void 0 : _d.path_prefix);
            // Both conditions > subdomain only > global
            const aScore = (aHasSubdomain ? 2 : 0) + (aHasPath ? 1 : 0);
            const bScore = (bHasSubdomain ? 2 : 0) + (bHasPath ? 1 : 0);
            return bScore - aScore; // Descending order
        });
        // Return the most specific matching menu
        return this.findMenuById(sortedMenus[0].id);
    }
    // Bulk operations
    async duplicateMenu(id, newName, newSlug) {
        const sourceMenu = await this.findMenuById(id);
        if (!sourceMenu) {
            return null;
        }
        // Create new menu
        const newMenu = await this.createMenu({
            name: newName,
            slug: newSlug,
            location: null,
            description: sourceMenu.description,
            is_active: false,
            metadata: { ...sourceMenu.metadata, duplicated_from: id }
        });
        // Duplicate menu items
        if (sourceMenu.items && sourceMenu.items.length > 0) {
            await this.duplicateMenuItems(sourceMenu.items, newMenu.id);
        }
        return this.findMenuById(newMenu.id);
    }
    async duplicateMenuItems(items, newMenuId, parentId) {
        for (const item of items) {
            const newItem = await this.addMenuItem({
                menu_id: newMenuId,
                parent_id: parentId,
                title: item.title,
                url: item.url,
                type: item.type,
                target: item.target,
                icon: item.icon,
                css_class: item.css_class,
                order_num: item.order_num,
                reference_id: item.reference_id,
                metadata: item.metadata
            });
            // Recursively duplicate children
            if (newItem && item.children && item.children.length > 0) {
                await this.duplicateMenuItems(item.children, newMenuId, newItem.id);
            }
        }
    }
    // Role-based menu filtering
    async getFilteredMenuItems(menuId, userRole, isLoggedIn = false) {
        const menu = await this.findMenuById(menuId);
        if (!menu || !menu.items) {
            return [];
        }
        return this.filterMenuItemsByRole(menu.items, userRole, isLoggedIn);
    }
    filterMenuItemsByRole(items, userRole, isLoggedIn = false) {
        return items
            .filter(item => this.shouldShowMenuItem(item, userRole, isLoggedIn))
            .map(item => ({
            ...item,
            children: item.children ? this.filterMenuItemsByRole(item.children, userRole, isLoggedIn) : []
        }));
    }
    shouldShowMenuItem(item, userRole, isLoggedIn = false) {
        // If display mode is hide, don't show
        if (item.display_mode === 'hide') {
            return false;
        }
        // If no target audience specified, show to everyone (backward compatibility)
        if (!item.target_audience || !item.target_audience.roles) {
            return true;
        }
        const targetRoles = item.target_audience.roles;
        // Check for special audience types
        if (targetRoles.includes('everyone')) {
            return true;
        }
        if (targetRoles.includes('logged_out') && !isLoggedIn) {
            return true;
        }
        // If user is logged in and has a role, check against target roles
        if (isLoggedIn && userRole && targetRoles.includes(userRole)) {
            return true;
        }
        // Hide by default if none of the conditions match
        return false;
    }
}
// Export singleton instance
exports.menuService = new MenuService();
//# sourceMappingURL=menu.service.js.map