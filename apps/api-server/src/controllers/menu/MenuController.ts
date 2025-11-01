import { Request, Response } from 'express';
import { menuService } from '../../services/menu.service.js';
import logger from '../../utils/logger.js';
import { MenuItemType, MenuItemTarget, MenuItemDisplayMode } from '../../entities/MenuItem.js';
import { AuthRequest } from '../../types/auth.js';

export class MenuController {
  // GET /api/menus - Get all menus
  getMenus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { location, is_active } = req.query;
      
      const params: any = {};
      
      if (location) {
        params.location = location as string;
      }
      
      if (is_active !== undefined) {
        params.is_active = is_active === 'true';
      }

      const menus = await menuService.findAllMenus(params);
      
      res.json({
        success: true,
        data: menus
      });
    } catch (error) {
      logger.error('Error getting menus:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve menus'
      });
    }
  };

  // GET /api/menus/locations - Get all menu locations
  getMenuLocations = async (req: Request, res: Response): Promise<void> => {
    try {
      const locations = await menuService.findAllMenuLocations();
      
      res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      logger.error('Error getting menu locations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve menu locations'
      });
    }
  };

  // GET /api/menus/:id - Get menu by ID with tree structure
  getMenu = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // UUID validation regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = uuidRegex.test(id);

      let menu = null;

      // Try to find menu by ID first (only if it's a valid UUID)
      if (isUuid) {
        menu = await menuService.findMenuById(id);
      }

      // If not found by ID or not a UUID, try to find by slug
      if (!menu) {
        try {
          const menuData = await menuService.getMenuBySlug(id);
          if (menuData) {
            res.json({
              success: true,
              data: menuData
            });
            return;
          }
        } catch (dbError) {
          logger.error('Database error looking up menu by slug:', dbError);
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
    } catch (error) {
      logger.error('Error getting menu:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve menu'
      });
    }
  };

  // GET /api/menus/:id/filtered - Get menu with role-based filtering
  getFilteredMenu = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.authUser || req.user;
      
      // Determine user role and login status
      const userRole = user?.role;
      const isLoggedIn = !!user;

      // Get filtered menu items
      const filteredItems = await menuService.getFilteredMenuItems(id, userRole, isLoggedIn);
      
      // Get basic menu info
      const menu = await menuService.findMenuById(id);
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
          total_items: menu.items?.length || 0,
          visible_items: filteredItems.length
        }
      });
    } catch (error) {
      logger.error('Error getting filtered menu:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve filtered menu'
      });
    }
  };

  // POST /api/menus - Create new menu
  createMenu = async (req: Request, res: Response): Promise<void> => {
    try {
      const menu = await menuService.createMenu(req.body);
      
      res.status(201).json({
        success: true,
        data: menu,
        message: 'Menu created successfully'
      });
    } catch (error: any) {
      logger.error('Error creating menu:', error);
      
      if (error.message?.includes('already exists')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create menu'
        });
      }
    }
  };

  // PUT /api/menus/:id - Update menu
  updateMenu = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const menu = await menuService.updateMenu(id, req.body);
      
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
    } catch (error: any) {
      logger.error('Error updating menu:', error);
      logger.error('Error stack:', error.stack);
      logger.error('Request body:', JSON.stringify(req.body, null, 2));

      if (error.message?.includes('already exists')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update menu',
          details: error.message
        });
      }
    }
  };

  // DELETE /api/menus/:id - Delete menu
  deleteMenu = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await menuService.deleteMenu(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Menu not found'
        });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting menu:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete menu'
      });
    }
  };

  // PUT /api/menus/:id/reorder - Reorder menu items
  reorderMenuItems = async (req: Request, res: Response): Promise<void> => {
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
      
      const updatedItems = await menuService.reorderMenuItems(id, items);
      
      res.json({
        success: true,
        data: updatedItems,
        message: 'Menu items reordered successfully'
      });
    } catch (error: any) {
      logger.error('Error reordering menu items:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reorder menu items'
      });
    }
  };

  // POST /api/menus/:id/duplicate - Duplicate menu with all items
  duplicateMenu = async (req: Request, res: Response): Promise<void> => {
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
      
      const menu = await menuService.duplicateMenu(id, name, slug);
      
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
    } catch (error) {
      logger.error('Error duplicating menu:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to duplicate menu'
      });
    }
  };

  // POST /api/menu-items - Add menu item
  addMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const menuItem = await menuService.addMenuItem(req.body);
      
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
    } catch (error: any) {
      logger.error('Error adding menu item:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add menu item'
      });
    }
  };

  // PUT /api/menu-items/:id - Update menu item
  updateMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const menuItem = await menuService.updateMenuItem(id, req.body);
      
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
    } catch (error) {
      logger.error('Error updating menu item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update menu item'
      });
    }
  };

  // DELETE /api/menu-items/:id - Delete menu item
  deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await menuService.deleteMenuItem(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Menu item not found'
        });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting menu item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete menu item'
      });
    }
  };

  // GET /api/menus/location/:key - Get menu by location key
  getMenuByLocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      const { subdomain, path } = req.query;

      // Extract subdomain and path prefix
      const subdomainStr = subdomain ? String(subdomain) : null;
      const pathStr = path ? String(path) : null;

      // Extract path prefix from path (/seller1/products -> /seller1)
      let pathPrefix: string | null = null;
      if (pathStr && pathStr !== '/') {
        const segments = pathStr.split('/').filter(Boolean);
        if (segments.length > 0) {
          pathPrefix = `/${segments[0]}`;
        }
      }

      // Get menu with context filtering
      const menu = await menuService.getMenuByLocationWithContext(
        key,
        subdomainStr,
        pathPrefix
      );

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
    } catch (error) {
      logger.error('Error getting menu by location:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve menu by location'
      });
    }
  };

  // ============================================================================
  // ADVANCED FEATURES - Conditions, Styles, Mega Menu
  // ============================================================================

  // In-memory storage for advanced features (in production, use database)
  private conditions: Map<string, any[]> = new Map();
  private styles: Map<string, any> = new Map();
  private megaMenus: Map<string, any> = new Map();

  // POST /api/menus/:id/conditions - Create menu item conditions
  createMenuItemConditions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const conditions = req.body;

      const existingConditions = this.conditions.get(id) || [];
      existingConditions.push({ menu_item_id: id, ...conditions, is_active: true });
      this.conditions.set(id, existingConditions);

      res.status(201).json({
        success: true,
        data: existingConditions[existingConditions.length - 1],
        message: 'Menu item conditions created successfully'
      });
    } catch (error) {
      logger.error('Error creating menu item conditions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create menu item conditions'
      });
    }
  };

  // GET /api/menus/:id/conditions - Get menu item conditions
  getMenuItemConditions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const conditions = this.conditions.get(id) || [];

      res.json({
        success: true,
        data: conditions
      });
    } catch (error) {
      logger.error('Error getting menu item conditions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get menu item conditions'
      });
    }
  };

  // DELETE /api/menus/:id/conditions - Delete menu item conditions
  deleteMenuItemConditions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      this.conditions.delete(id);

      res.json({
        success: true,
        message: 'Menu item conditions deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting menu item conditions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete menu item conditions'
      });
    }
  };

  // POST /api/menus/:id/styles - Create menu styles
  createMenuStyles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const styles = req.body;

      const menu = await menuService.findMenuById(id);
      if (!menu) {
        res.status(404).json({
          success: false,
          error: 'Menu not found'
        });
        return;
      }

      this.styles.set(id, { menu_id: id, ...styles });

      res.status(201).json({
        success: true,
        data: this.styles.get(id),
        message: 'Menu styles created successfully'
      });
    } catch (error) {
      logger.error('Error creating menu styles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create menu styles'
      });
    }
  };

  // GET /api/menus/:id/styles - Get menu styles
  getMenuStyles = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
      logger.error('Error getting menu styles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get menu styles'
      });
    }
  };

  // PUT /api/menus/:id/styles - Update menu styles
  updateMenuStyles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const styles = req.body;

      const menu = await menuService.findMenuById(id);
      if (!menu) {
        res.status(404).json({
          success: false,
          error: 'Menu not found'
        });
        return;
      }

      const existingStyles = this.styles.get(id) || { menu_id: id };
      const updatedStyles = { ...existingStyles, ...styles, menu_id: id };
      this.styles.set(id, updatedStyles);

      res.json({
        success: true,
        data: updatedStyles,
        message: 'Menu styles updated successfully'
      });
    } catch (error) {
      logger.error('Error updating menu styles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update menu styles'
      });
    }
  };

  // POST /api/menus/:id/mega-menu - Create mega menu
  createMegaMenu = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const config = req.body;

      const menu = await menuService.findMenuById(id);
      if (!menu) {
        res.status(404).json({
          success: false,
          error: 'Menu not found'
        });
        return;
      }

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
    } catch (error) {
      logger.error('Error creating mega menu:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create mega menu'
      });
    }
  };

  // GET /api/menus/:id/mega-menu - Get mega menu
  getMegaMenu = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
      logger.error('Error getting mega menu:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get mega menu'
      });
    }
  };

  // PUT /api/menus/:id/mega-menu - Update mega menu
  updateMegaMenu = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const config = req.body;

      const menu = await menuService.findMenuById(id);
      if (!menu) {
        res.status(404).json({
          success: false,
          error: 'Menu not found'
        });
        return;
      }

      const existingConfig = this.megaMenus.get(id) || { menu_id: id };
      const updatedConfig = { ...existingConfig, ...config, menu_id: id };
      this.megaMenus.set(id, updatedConfig);

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Mega menu updated successfully'
      });
    } catch (error) {
      logger.error('Error updating mega menu:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update mega menu'
      });
    }
  };
}