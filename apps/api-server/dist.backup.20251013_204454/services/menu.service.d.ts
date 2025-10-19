import { Menu } from '../entities/Menu';
import { MenuItem, MenuItemType } from '../entities/MenuItem';
import { MenuLocation } from '../entities/MenuLocation';
declare class MenuService {
    private menuRepository;
    private menuItemRepository;
    private menuLocationRepository;
    constructor();
    findAllMenus(params?: {
        location?: string;
        is_active?: boolean;
    }): Promise<Menu[]>;
    findMenuById(id: string): Promise<Menu | null>;
    getMenuBySlug(slug: string): Promise<any | null>;
    createMenu(data: {
        name: string;
        slug?: string;
        location?: string;
        description?: string;
        is_active?: boolean;
        metadata?: Record<string, any>;
    }): Promise<Menu>;
    updateMenu(id: string, data: Partial<{
        name: string;
        slug: string;
        location: string;
        description: string;
        is_active: boolean;
        metadata: Record<string, any>;
    }>): Promise<Menu | null>;
    deleteMenu(id: string): Promise<boolean>;
    addMenuItem(data: {
        menu_id: string;
        parent_id?: string;
        title: string;
        url?: string;
        type?: MenuItemType;
        target?: string;
        icon?: string;
        css_class?: string;
        order_num?: number;
        reference_id?: string;
        metadata?: Record<string, any>;
    }): Promise<MenuItem | null>;
    updateMenuItem(id: string, data: Partial<{
        title: string;
        url: string;
        type: MenuItemType;
        target: string;
        icon: string;
        css_class: string;
        order_num: number;
        reference_id: string;
        metadata: Record<string, any>;
    }>): Promise<MenuItem | null>;
    deleteMenuItem(id: string): Promise<boolean>;
    reorderMenuItems(menuId: string, items: Array<{
        id: string;
        parent_id?: string;
        order_num: number;
    }>): Promise<MenuItem[]>;
    findAllMenuLocations(): Promise<MenuLocation[]>;
    findMenuLocationByKey(key: string): Promise<MenuLocation | null>;
    createMenuLocation(data: {
        key: string;
        name: string;
        description?: string;
        is_active?: boolean;
        order_num?: number;
        metadata?: Record<string, any>;
    }): Promise<MenuLocation>;
    updateMenuLocation(id: string, data: Partial<{
        name: string;
        description: string;
        is_active: boolean;
        order_num: number;
        metadata: Record<string, any>;
    }>): Promise<MenuLocation | null>;
    getMenuByLocation(location: string): Promise<Menu | null>;
    /**
     * Get menu by location with subdomain and path filtering
     * @param location Menu location (primary, footer, etc.)
     * @param subdomain Current subdomain (shop, forum, etc.) or null
     * @param pathPrefix Current path prefix (/seller1, etc.) or null
     * @returns Matching menu or null
     */
    getMenuByLocationWithContext(location: string, subdomain?: string | null, pathPrefix?: string | null): Promise<Menu | null>;
    duplicateMenu(id: string, newName: string, newSlug?: string): Promise<Menu | null>;
    private duplicateMenuItems;
    getFilteredMenuItems(menuId: string, userRole?: string, isLoggedIn?: boolean): Promise<MenuItem[]>;
    private filterMenuItemsByRole;
    private shouldShowMenuItem;
}
export declare const menuService: MenuService;
export {};
//# sourceMappingURL=menu.service.d.ts.map