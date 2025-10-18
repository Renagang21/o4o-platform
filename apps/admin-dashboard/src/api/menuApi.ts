import { unifiedApi } from './unified-client';

export interface MenuLocation {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_active: boolean;
  order_num: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  parent?: MenuItem | null;
  title: string;
  url?: string;
  target?: '_self' | '_blank' | '_parent' | '_top';
  type: 'custom' | 'page' | 'post' | 'category' | 'tag' | 'archive';
  object_id?: string;
  object_type?: string;
  description?: string;
  css_classes?: string;
  xfn?: string;
  order_num: number;
  is_active: boolean;
  metadata?: Record<string, any>;
  children?: MenuItem[];
  created_at?: string;
  updated_at?: string;
}

export interface Menu {
  id: string;
  name: string;
  slug: string;
  description?: string;
  location?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  items?: MenuItem[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateMenuDto {
  name: string;
  slug?: string;
  description?: string;
  location?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateMenuDto extends Partial<CreateMenuDto> {}

export interface CreateMenuItemDto {
  menu_id: string;
  parent_id?: string;
  title: string;
  url?: string;
  target?: '_self' | '_blank' | '_parent' | '_top';
  type?: 'custom' | 'page' | 'post' | 'category' | 'tag' | 'archive' | 'cpt' | 'cpt_archive';
  object_id?: string;
  object_type?: string;
  description?: string;
  css_classes?: string;
  xfn?: string;
  order_num?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateMenuItemDto extends Partial<CreateMenuItemDto> {}

export interface ReorderMenuItem {
  id: string;
  parent_id?: string;
  order_num: number;
}

export class MenuApi {
  // Menu operations
  static async getMenus(params?: { location?: string; is_active?: boolean }) {
    const response = await unifiedApi.raw.get('/v1/menus', { params });
    return response.data;
  }

  static async getMenu(id: string) {
    const response = await unifiedApi.raw.get(`/v1/menus/${id}`);
    return response.data;
  }

  static async getMenuByLocation(location: string) {
    const response = await unifiedApi.raw.get(`/v1/menus/location/${location}`);
    return response.data;
  }

  static async createMenu(data: CreateMenuDto) {
    const response = await unifiedApi.raw.post('/v1/menus', data);
    return response.data;
  }

  static async updateMenu(id: string, data: UpdateMenuDto) {
    const response = await unifiedApi.raw.put(`/v1/menus/${id}`, data);
    return response.data;
  }

  static async deleteMenu(id: string) {
    const response = await unifiedApi.raw.delete(`/v1/menus/${id}`);
    return response.data;
  }

  static async duplicateMenu(id: string, name: string, slug?: string) {
    const response = await unifiedApi.raw.post(`/v1/menus/${id}/duplicate`, { name, slug });
    return response.data;
  }

  static async reorderMenuItems(menuId: string, items: ReorderMenuItem[]) {
    const response = await unifiedApi.raw.put(`/v1/menus/${menuId}/reorder`, items);
    return response.data;
  }

  // Menu item operations
  static async createMenuItem(data: CreateMenuItemDto) {
    const response = await unifiedApi.raw.post('/v1/menu-items', data);
    return response.data;
  }

  static async updateMenuItem(id: string, data: UpdateMenuItemDto) {
    const response = await unifiedApi.raw.put(`/v1/menu-items/${id}`, data);
    return response.data;
  }

  static async deleteMenuItem(id: string) {
    const response = await unifiedApi.raw.delete(`/v1/menu-items/${id}`);
    return response.data;
  }

  // Menu location operations
  static async getMenuLocations() {
    const response = await unifiedApi.raw.get('/v1/menus/locations');
    return response.data;
  }

  // Phase 2 APIs (to be implemented)
  
  // Conditional display
  static async createMenuItemConditions(itemId: string, conditions: any) {
    const response = await unifiedApi.raw.post(`/v1/menu-items/${itemId}/conditions`, conditions);
    return response.data;
  }

  static async getMenuItemConditions(itemId: string) {
    const response = await unifiedApi.raw.get(`/v1/menu-items/${itemId}/conditions`);
    return response.data;
  }

  static async deleteMenuItemConditions(itemId: string) {
    const response = await unifiedApi.raw.delete(`/v1/menu-items/${itemId}/conditions`);
    return response.data;
  }

  // Menu styles
  static async createMenuStyles(menuId: string, styles: any) {
    const response = await unifiedApi.raw.post(`/v1/menus/${menuId}/styles`, styles);
    return response.data;
  }

  static async getMenuStyles(menuId: string) {
    const response = await unifiedApi.raw.get(`/v1/menus/${menuId}/styles`);
    return response.data;
  }

  static async updateMenuStyles(menuId: string, styles: any) {
    const response = await unifiedApi.raw.put(`/v1/menus/${menuId}/styles`, styles);
    return response.data;
  }

  // Mega menu
  static async createMegaMenu(menuId: string, config: any) {
    const response = await unifiedApi.raw.post(`/v1/menus/${menuId}/mega-menu`, config);
    return response.data;
  }

  static async getMegaMenu(menuId: string) {
    const response = await unifiedApi.raw.get(`/v1/menus/${menuId}/mega-menu`);
    return response.data;
  }

  static async updateMegaMenu(menuId: string, config: any) {
    const response = await unifiedApi.raw.put(`/v1/menus/${menuId}/mega-menu`, config);
    return response.data;
  }

  // Helper methods
  static buildMenuTree(items: MenuItem[]): MenuItem[] {
    const itemMap = new Map<string, MenuItem>();
    const rootItems: MenuItem[] = [];

    // First pass: create map
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Second pass: build tree
    items.forEach(item => {
      const mappedItem = itemMap.get(item.id)!;
      if (item.parent?.id) {
        const parent = itemMap.get(item.parent.id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(mappedItem);
        }
      } else {
        rootItems.push(mappedItem);
      }
    });

    // Sort by order_num
    const sortItems = (items: MenuItem[]) => {
      items.sort((a, b) => a.order_num - b.order_num);
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortItems(item.children);
        }
      });
    };

    sortItems(rootItems);
    return rootItems;
  }

  static flattenMenuTree(items: MenuItem[], parentId?: string): ReorderMenuItem[] {
    const result: ReorderMenuItem[] = [];
    let orderNum = 0;

    const processItems = (items: MenuItem[], parentId?: string) => {
      items.forEach(item => {
        result.push({
          id: item.id,
          parent_id: parentId,
          order_num: orderNum++
        });

        if (item.children && item.children.length > 0) {
          processItems(item.children, item.id);
        }
      });
    };

    processItems(items, parentId);
    return result;
  }
}

export default MenuApi;