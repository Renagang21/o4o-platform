"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuWidgetController = void 0;
const connection_1 = require("../../database/connection");
const Menu_1 = require("../../entities/Menu");
const logger_1 = __importDefault(require("../../utils/logger"));
class MenuWidgetController {
    constructor() {
        // In production, store in database
        this.widgets = new Map();
        this.widgetIdCounter = 1;
        this.menuRepository = connection_1.AppDataSource.getRepository(Menu_1.Menu);
        // Initialize default widgets
        this.initializeDefaultWidgets();
    }
    /**
     * GET /api/v1/menu-widgets
     * Get all menu widgets
     */
    async getMenuWidgets(req, res) {
        try {
            const { type, area, isActive } = req.query;
            let widgets = Array.from(this.widgets.values());
            // Apply filters
            if (type) {
                widgets = widgets.filter(w => w.type === type);
            }
            if (area) {
                widgets = widgets.filter(w => { var _a; return ((_a = w.placement) === null || _a === void 0 ? void 0 : _a.area) === area; });
            }
            if (isActive !== undefined) {
                widgets = widgets.filter(w => w.isActive === (isActive === 'true'));
            }
            // Sort by placement order
            widgets.sort((a, b) => {
                var _a, _b;
                const orderA = ((_a = a.placement) === null || _a === void 0 ? void 0 : _a.order) || 999;
                const orderB = ((_b = b.placement) === null || _b === void 0 ? void 0 : _b.order) || 999;
                return orderA - orderB;
            });
            res.json({
                success: true,
                data: widgets,
                meta: {
                    total: widgets.length
                }
            });
        }
        catch (error) {
            logger_1.default.error('Error getting menu widgets:', error);
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
    async createMenuWidget(req, res) {
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
            const widget = {
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
        }
        catch (error) {
            logger_1.default.error('Error creating menu widget:', error);
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
    async getMenuWidget(req, res) {
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
        }
        catch (error) {
            logger_1.default.error('Error getting menu widget:', error);
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
    async updateMenuWidget(req, res) {
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
            const updatedWidget = {
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
        }
        catch (error) {
            logger_1.default.error('Error updating menu widget:', error);
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
    async deleteMenuWidget(req, res) {
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
        }
        catch (error) {
            logger_1.default.error('Error deleting menu widget:', error);
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
    async renderMenuWidget(req, res) {
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
        }
        catch (error) {
            logger_1.default.error('Error rendering menu widget:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to render menu widget'
            });
        }
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    initializeDefaultWidgets() {
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
    checkWidgetConditions(widget, context) {
        var _a;
        const conditions = (_a = widget.placement) === null || _a === void 0 ? void 0 : _a.conditions;
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
    async renderWidget(widget, context) {
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
    renderNavigationWidget(widget) {
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
    renderBreadcrumbWidget(widget, context) {
        var _a;
        return `
      <nav aria-label="Breadcrumb" class="menu-widget breadcrumb">
        <ol class="breadcrumb-list">
          <li><a href="/">Home</a></li>
          ${((_a = context.breadcrumbs) === null || _a === void 0 ? void 0 : _a.map((crumb) => `<li><a href="${crumb.url}">${crumb.title}</a></li>`).join('')) || ''}
        </ol>
      </nav>
    `;
    }
    renderSitemapWidget(widget) {
        return `
      <div class="menu-widget sitemap">
        <h3>Sitemap</h3>
        <ul class="sitemap-list">
          <!-- Sitemap items would be rendered here -->
        </ul>
      </div>
    `;
    }
    renderFooterWidget(widget) {
        return `
      <div class="menu-widget footer-menu">
        <ul class="footer-menu-list">
          <!-- Footer menu items would be rendered here -->
        </ul>
      </div>
    `;
    }
    renderMobileWidget(widget) {
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
    processTemplate(template, widget, context) {
        // Simple template processing - in production use a proper template engine
        return template
            .replace(/\{\{widget\.id\}\}/g, widget.id)
            .replace(/\{\{widget\.name\}\}/g, widget.name)
            .replace(/\{\{widget\.type\}\}/g, widget.type);
    }
}
exports.MenuWidgetController = MenuWidgetController;
//# sourceMappingURL=MenuWidgetController.js.map