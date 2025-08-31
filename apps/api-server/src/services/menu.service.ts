// @ts-nocheck
import { AppDataSource } from '../database/connection';
import { Repository, TreeRepository } from 'typeorm';
import { Menu } from '../entities/Menu';
import { MenuItem, MenuItemType } from '../entities/MenuItem';
import { MenuLocation } from '../entities/MenuLocation';

class MenuService {
  private menuRepository: Repository<Menu>;
  private menuItemRepository: TreeRepository<MenuItem>;
  private menuLocationRepository: Repository<MenuLocation>;

  constructor() {
    this.menuRepository = AppDataSource.getRepository(Menu);
    this.menuItemRepository = AppDataSource.getTreeRepository(MenuItem);
    this.menuLocationRepository = AppDataSource.getRepository(MenuLocation);
  }

  // Menu CRUD Operations
  async findAllMenus(params?: {
    location?: string;
    is_active?: boolean;
  }): Promise<Menu[]> {
    const query = this.menuRepository.createQueryBuilder('menu');

    if (params?.location) {
      query.andWhere('menu.location = :location', { location: params.location });
    }

    if (params?.is_active !== undefined) {
      query.andWhere('menu.is_active = :is_active', { is_active: params.is_active });
    }

    return query.orderBy('menu.created_at', 'DESC').getMany();
  }

  async findMenuById(id: string): Promise<Menu | null> {
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
      .andWhere('item.parentId IS NULL')
      .orderBy('item.order_num', 'ASC')
      .getMany();

    // Load tree for each root item
    const itemsWithChildren = await Promise.all(
      rootItems.map(item => this.menuItemRepository.findDescendantsTree(item))
    );

    menu.items = itemsWithChildren;
    return menu;
  }

  async createMenu(data: {
    name: string;
    slug?: string;
    location?: string;
    description?: string;
    is_active?: boolean;
    metadata?: Record<string, any>;
  }): Promise<Menu> {
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

  async updateMenu(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      location: string;
      description: string;
      is_active: boolean;
      metadata: Record<string, any>;
    }>
  ): Promise<Menu | null> {
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

  async deleteMenu(id: string): Promise<boolean> {
    const menu = await this.findMenuById(id);
    
    if (!menu) {
      return false;
    }
    
    await this.menuRepository.remove(menu);
    return true;
  }

  // Menu Item Operations
  async addMenuItem(data: {
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
  }): Promise<MenuItem | null> {
    const menu = await this.findMenuById(data.menu_id);
    
    if (!menu) {
      return null;
    }

    const menuItem = this.menuItemRepository.create({
      ...data,
      menu
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

  async updateMenuItem(
    id: string,
    data: Partial<{
      title: string;
      url: string;
      type: MenuItemType;
      target: string;
      icon: string;
      css_class: string;
      order_num: number;
      reference_id: string;
      metadata: Record<string, any>;
    }>
  ): Promise<MenuItem | null> {
    const menuItem = await this.menuItemRepository.findOne({
      where: { id }
    });

    if (!menuItem) {
      return null;
    }

    Object.assign(menuItem, data);
    return this.menuItemRepository.save(menuItem);
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    const menuItem = await this.menuItemRepository.findOne({
      where: { id }
    });

    if (!menuItem) {
      return false;
    }

    await this.menuItemRepository.remove(menuItem);
    return true;
  }

  async reorderMenuItems(
    menuId: string,
    items: Array<{
      id: string;
      parent_id?: string;
      order_num: number;
    }>
  ): Promise<MenuItem[]> {
    const menu = await this.findMenuById(menuId);
    
    if (!menu) {
      throw new Error(`Menu with ID ${menuId} not found`);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const updatedItems: MenuItem[] = [];

      for (const item of items) {
        const menuItem = await queryRunner.manager.findOne(MenuItem, {
          where: { id: item.id, menu_id: menuId }
        });

        if (!menuItem) {
          throw new Error(`Menu item with ID ${item.id} not found`);
        }

        menuItem.order_num = item.order_num;

        if (item.parent_id !== undefined) {
          if (item.parent_id) {
            const parent = await queryRunner.manager.findOne(MenuItem, {
              where: { id: item.parent_id, menu_id: menuId }
            });
            if (!parent) {
              throw new Error(`Parent menu item with ID ${item.parent_id} not found`);
            }
            menuItem.parent = parent;
          } else {
            menuItem.parent = null;
          }
        }

        const updated = await queryRunner.manager.save(menuItem);
        updatedItems.push(updated);
      }

      await queryRunner.commitTransaction();
      return updatedItems;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Menu Location Operations
  async findAllMenuLocations(): Promise<MenuLocation[]> {
    return this.menuLocationRepository.find({
      where: { is_active: true },
      order: { order_num: 'ASC' }
    });
  }

  async findMenuLocationByKey(key: string): Promise<MenuLocation | null> {
    return this.menuLocationRepository.findOne({
      where: { key }
    });
  }

  async createMenuLocation(data: {
    key: string;
    name: string;
    description?: string;
    is_active?: boolean;
    order_num?: number;
    metadata?: Record<string, any>;
  }): Promise<MenuLocation> {
    const existing = await this.menuLocationRepository.findOne({
      where: { key: data.key }
    });

    if (existing) {
      throw new Error(`Menu location with key "${data.key}" already exists`);
    }

    const location = this.menuLocationRepository.create(data);
    return this.menuLocationRepository.save(location);
  }

  async updateMenuLocation(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      is_active: boolean;
      order_num: number;
      metadata: Record<string, any>;
    }>
  ): Promise<MenuLocation | null> {
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
  async getMenuByLocation(location: string): Promise<Menu | null> {
    const menu = await this.menuRepository.findOne({
      where: { location, is_active: true }
    });

    if (!menu) {
      return null;
    }

    return this.findMenuById(menu.id);
  }

  // Bulk operations
  async duplicateMenu(id: string, newName: string, newSlug?: string): Promise<Menu | null> {
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

  private async duplicateMenuItems(
    items: MenuItem[],
    newMenuId: string,
    parentId?: string
  ): Promise<void> {
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
}

// Export singleton instance
export const menuService = new MenuService();