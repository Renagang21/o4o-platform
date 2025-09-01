import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection';
import { Menu } from '../../entities/Menu';
import logger from '../../utils/logger';
import { AuthRequest } from '../../types/auth';

interface MenuWidget {
  id: string;
  name: string;
  type: 'navigation' | 'breadcrumb' | 'sitemap' | 'footer' | 'sidebar' | 'mega' | 'mobile' | 'custom';
  menuId?: string;
  config: {
    displayMode?: 'horizontal' | 'vertical' | 'dropdown' | 'accordion';
    showIcons?: boolean;
    showDescriptions?: boolean;
    maxDepth?: number;
    expandOnHover?: boolean;
    mobileBreakpoint?: number;
    animation?: 'none' | 'fade' | 'slide' | 'zoom';
    animationDuration?: number;
    customClass?: string;
    customStyles?: Record<string, any>;
    responsiveSettings?: {
      mobile?: any;
      tablet?: any;
      desktop?: any;
    };
  };
  placement?: {
    area: string; // e.g., 'header', 'footer', 'sidebar-left', 'sidebar-right'
    order?: number;
    conditions?: {
      pages?: string[];
      userRoles?: string[];
      devices?: string[];
    };
  };
  template?: string; // Custom HTML template
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MenuWidgetController {
  private menuRepository: Repository<Menu>;
  
  // In production, store in database
  private widgets: Map<string, MenuWidget> = new Map();
  private widgetIdCounter = 1;

  constructor() {
    this.menuRepository = AppDataSource.getRepository(Menu);
    
    // Initialize default widgets
    this.initializeDefaultWidgets();
  }

  /**
   * GET /api/v1/menu-widgets
   * Get all menu widgets
   */
  async getMenuWidgets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, area, isActive } = req.query;

      let widgets = Array.from(this.widgets.values());

      // Apply filters
      if (type) {
        widgets = widgets.filter(w => w.type === type);
      }

      if (area) {
        widgets = widgets.filter(w => w.placement?.area === area);
      }

      if (isActive !== undefined) {
        widgets = widgets.filter(w => w.isActive === (isActive === 'true'));
      }

      // Sort by placement order
      widgets.sort((a, b) => {
        const orderA = a.placement?.order || 999;
        const orderB = b.placement?.order || 999;
        return orderA - orderB;
      });

      res.json({
        success: true,
        data: widgets,
        meta: {
          total: widgets.length
        }
      });
    } catch (error) {
      logger.error('Error getting menu widgets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get menu widgets'
      });
    }
  }

  /**
   * POST /api/v1/menu-widgets
   * Create a new menu widget
   */
  async createMenuWidget(req: AuthRequest, res: Response): Promise<void> {
    try {
      const widgetData = req.body;

      // Validate menu if specified
      if (widgetData.menuId) {
        const menu = await this.menuRepository.findOne({
          where: { id: widgetData.menuId }
        });

        if (!menu) {
          res.status(400).json({
            success: false,
            error: 'Invalid menu ID'
          });
          return;
        }
      }

      // Create widget
      const widget: MenuWidget = {
        id: `widget-${this.widgetIdCounter++}`,
        name: widgetData.name || 'Untitled Widget',
        type: widgetData.type || 'navigation',
        menuId: widgetData.menuId,
        config: {
          displayMode: 'horizontal',
          showIcons: false,
          showDescriptions: false,
          maxDepth: 3,
          expandOnHover: true,
          mobileBreakpoint: 768,
          animation: 'fade',
          animationDuration: 300,
          ...widgetData.config
        },
        placement: widgetData.placement,
        template: widgetData.template,
        isActive: widgetData.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.widgets.set(widget.id, widget);

      res.status(201).json({
        success: true,
        data: widget,
        message: 'Menu widget created successfully'
      });
    } catch (error) {
      logger.error('Error creating menu widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create menu widget'
      });
    }
  }

  /**
   * GET /api/v1/menu-widgets/:id
   * Get a specific menu widget
   */
  async getMenuWidget(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const widget = this.widgets.get(id);

      if (!widget) {
        res.status(404).json({
          success: false,
          error: 'Menu widget not found'
        });
        return;
      }

      res.json({
        success: true,
        data: widget
      });
    } catch (error) {
      logger.error('Error getting menu widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get menu widget'
      });
    }
  }

  /**
   * PUT /api/v1/menu-widgets/:id
   * Update a menu widget
   */
  async updateMenuWidget(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const widget = this.widgets.get(id);

      if (!widget) {
        res.status(404).json({
          success: false,
          error: 'Menu widget not found'
        });
        return;
      }

      // Validate menu if changed
      if (updates.menuId && updates.menuId !== widget.menuId) {
        const menu = await this.menuRepository.findOne({
          where: { id: updates.menuId }
        });

        if (!menu) {
          res.status(400).json({
            success: false,
            error: 'Invalid menu ID'
          });
          return;
        }
      }

      // Update widget
      const updatedWidget: MenuWidget = {
        ...widget,
        ...updates,
        config: {
          ...widget.config,
          ...updates.config
        },
        updatedAt: new Date()
      };

      this.widgets.set(id, updatedWidget);

      res.json({
        success: true,
        data: updatedWidget,
        message: 'Menu widget updated successfully'
      });
    } catch (error) {
      logger.error('Error updating menu widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update menu widget'
      });
    }
  }

  /**
   * DELETE /api/v1/menu-widgets/:id
   * Delete a menu widget
   */
  async deleteMenuWidget(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!this.widgets.has(id)) {
        res.status(404).json({
          success: false,
          error: 'Menu widget not found'
        });
        return;
      }

      this.widgets.delete(id);

      res.json({
        success: true,
        message: 'Menu widget deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting menu widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete menu widget'
      });
    }
  }

  /**
   * POST /api/v1/menu-widgets/:id/render
   * Render a menu widget (get HTML)
   */
  async renderMenuWidget(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { context = {} } = req.body;

      const widget = this.widgets.get(id);

      if (!widget) {
        res.status(404).json({
          success: false,
          error: 'Menu widget not found'
        });
        return;
      }

      // Check conditions
      if (!this.checkWidgetConditions(widget, context)) {
        res.json({
          success: true,
          data: {
            html: '',
            message: 'Widget hidden due to conditions'
          }
        });
        return;
      }

      // Render widget HTML
      const html = await this.renderWidget(widget, context);

      res.json({
        success: true,
        data: {
          html,
          widget: {
            id: widget.id,
            type: widget.type,
            config: widget.config
          }
        }
      });
    } catch (error) {
      logger.error('Error rendering menu widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to render menu widget'
      });
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private initializeDefaultWidgets(): void {
    // Primary Navigation Widget
    this.widgets.set('default-primary', {
      id: 'default-primary',
      name: 'Primary Navigation',
      type: 'navigation',
      config: {
        displayMode: 'horizontal',
        showIcons: true,
        maxDepth: 2,
        expandOnHover: true,
        mobileBreakpoint: 768,
        animation: 'fade',
        animationDuration: 300
      },
      placement: {
        area: 'header',
        order: 1
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Footer Widget
    this.widgets.set('default-footer', {
      id: 'default-footer',
      name: 'Footer Menu',
      type: 'footer',
      config: {
        displayMode: 'vertical',
        showIcons: false,
        maxDepth: 1
      },
      placement: {
        area: 'footer',
        order: 1
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Breadcrumb Widget
    this.widgets.set('default-breadcrumb', {
      id: 'default-breadcrumb',
      name: 'Breadcrumb Navigation',
      type: 'breadcrumb',
      config: {
        displayMode: 'horizontal',
        showIcons: false,
        customClass: 'breadcrumb'
      },
      placement: {
        area: 'content-top',
        order: 1
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private checkWidgetConditions(widget: MenuWidget, context: any): boolean {
    const conditions = widget.placement?.conditions;
    
    if (!conditions) {
      return true;
    }

    // Check page conditions
    if (conditions.pages && conditions.pages.length > 0) {
      if (!conditions.pages.includes(context.pageId)) {
        return false;
      }
    }

    // Check user role conditions
    if (conditions.userRoles && conditions.userRoles.length > 0) {
      if (!context.userRole || !conditions.userRoles.includes(context.userRole)) {
        return false;
      }
    }

    // Check device conditions
    if (conditions.devices && conditions.devices.length > 0) {
      if (!context.device || !conditions.devices.includes(context.device)) {
        return false;
      }
    }

    return true;
  }

  private async renderWidget(widget: MenuWidget, context: any): Promise<string> {
    // Use custom template if provided
    if (widget.template) {
      return this.processTemplate(widget.template, widget, context);
    }

    // Generate HTML based on widget type
    switch (widget.type) {
      case 'navigation':
        return this.renderNavigationWidget(widget);
      case 'breadcrumb':
        return this.renderBreadcrumbWidget(widget, context);
      case 'sitemap':
        return this.renderSitemapWidget(widget);
      case 'footer':
        return this.renderFooterWidget(widget);
      case 'mobile':
        return this.renderMobileWidget(widget);
      default:
        return `<div class="menu-widget ${widget.type}">Widget: ${widget.name}</div>`;
    }
  }

  private renderNavigationWidget(widget: MenuWidget): string {
    const classes = ['menu-widget', 'menu-navigation'];
    
    if (widget.config.customClass) {
      classes.push(widget.config.customClass);
    }
    
    if (widget.config.displayMode) {
      classes.push(`menu-${widget.config.displayMode}`);
    }

    return `
      <nav class="${classes.join(' ')}" data-widget-id="${widget.id}">
        <ul class="menu-list">
          <!-- Menu items would be rendered here -->
        </ul>
      </nav>
    `;
  }

  private renderBreadcrumbWidget(widget: MenuWidget, context: any): string {
    return `
      <nav aria-label="Breadcrumb" class="menu-widget breadcrumb">
        <ol class="breadcrumb-list">
          <li><a href="/">Home</a></li>
          ${context.breadcrumbs?.map((crumb: any) => 
            `<li><a href="${crumb.url}">${crumb.title}</a></li>`
          ).join('') || ''}
        </ol>
      </nav>
    `;
  }

  private renderSitemapWidget(widget: MenuWidget): string {
    return `
      <div class="menu-widget sitemap">
        <h3>Sitemap</h3>
        <ul class="sitemap-list">
          <!-- Sitemap items would be rendered here -->
        </ul>
      </div>
    `;
  }

  private renderFooterWidget(widget: MenuWidget): string {
    return `
      <div class="menu-widget footer-menu">
        <ul class="footer-menu-list">
          <!-- Footer menu items would be rendered here -->
        </ul>
      </div>
    `;
  }

  private renderMobileWidget(widget: MenuWidget): string {
    return `
      <div class="menu-widget mobile-menu" data-breakpoint="${widget.config.mobileBreakpoint}">
        <button class="mobile-menu-toggle" aria-label="Toggle menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav class="mobile-menu-nav">
          <ul class="mobile-menu-list">
            <!-- Mobile menu items would be rendered here -->
          </ul>
        </nav>
      </div>
    `;
  }

  private processTemplate(template: string, widget: MenuWidget, context: any): string {
    // Simple template processing - in production use a proper template engine
    return template
      .replace(/\{\{widget\.id\}\}/g, widget.id)
      .replace(/\{\{widget\.name\}\}/g, widget.name)
      .replace(/\{\{widget\.type\}\}/g, widget.type);
  }
}