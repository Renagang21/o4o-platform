import { 
  AstraCustomizerSettings, 
  ModuleConfig, 
  HeaderModuleType,
  FooterDashboardWidgetConfig,
  FooterWidgetType 
} from '../types/customizer-types';

export interface TemplatePartData {
  name: string;
  slug: string;
  description: string;
  area: 'header' | 'footer' | 'sidebar' | 'general';
  content: any[];
  settings: {
    containerWidth?: 'full' | 'wide' | 'narrow';
    backgroundColor?: string;
    textColor?: string;
    padding?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
    customCss?: string;
  };
}

/**
 * Convert module config to block format
 */
function convertModuleToBlock(module: ModuleConfig): any {
  const blockMap: Record<HeaderModuleType, any> = {
    'logo': {
      type: 'o4o/site-logo',
      data: {
        width: 120,
        isLink: true,
        ...module.settings
      }
    },
    'site-title': {
      type: 'core/site-title',
      data: {
        level: 1,
        isLink: true,
        ...module.settings
      }
    },
    'primary-menu': {
      type: 'o4o/navigation',
      data: {
        menuRef: 'primary',
        orientation: 'horizontal',
        ...module.settings
      }
    },
    'secondary-menu': {
      type: 'o4o/navigation',
      data: {
        menuRef: 'secondary',
        orientation: 'horizontal',
        ...module.settings
      }
    },
    'search': {
      type: 'core/search',
      data: {
        showLabel: false,
        placeholder: 'Search...',
        buttonPosition: 'button-inside',
        ...module.settings
      }
    },
    'account': {
      type: 'o4o/account-menu',
      data: {
        showAvatar: true,
        showName: false,
        ...module.settings
      }
    },
    'role-switcher': {
      type: 'o4o/role-switcher',
      data: {
        showLabel: true,
        ...module.settings
      }
    },
    'cart': {
      type: 'o4o/cart-icon',
      data: {
        showCount: true,
        showTotal: false,
        ...module.settings
      }
    },
    'button': {
      type: 'o4o/button',
      data: {
        text: module.settings.text || 'Click Here',
        url: module.settings.url || '#',
        ...module.settings
      }
    },
    'html': {
      type: 'o4o/html',
      data: {
        content: module.settings.content || '',
        ...module.settings
      }
    },
    'widget': {
      type: 'core/widget-area',
      data: {
        widgetAreaId: module.settings.widgetAreaId || 'header-widget',
        ...module.settings
      }
    },
    'social': {
      type: 'core/social-links',
      data: {
        iconColor: 'foreground',
        iconColorValue: '#333',
        size: 'has-normal-icon-size',
        ...module.settings
      }
    }
  };

  const block = blockMap[module.type];
  if (!block) return null;

  // Add visibility information to block data for responsive CSS handling
  const visibility = module.settings?.visibility || { desktop: true, tablet: true, mobile: true };

  return {
    id: module.id,
    ...block,
    data: {
      ...block.data,
      visibility
    }
  };
}

/**
 * Convert Astra Customizer settings to Header Template Part format
 */
export function convertSettingsToHeaderTemplatePart(
  settings: AstraCustomizerSettings
): TemplatePartData {
  // Use new builder layout if available
  if (settings.header.builder) {
    const builder = settings.header.builder;
    const sections = [];

    // Above Header Section
    if (builder.above.settings.enabled) {
      const aboveModules = {
        left: builder.above.left.map(convertModuleToBlock).filter(Boolean),
        center: builder.above.center.map(convertModuleToBlock).filter(Boolean),
        right: builder.above.right.map(convertModuleToBlock).filter(Boolean)
      };

      sections.push({
        id: 'header-above',
        type: 'o4o/group',
        data: {
          layout: 'grid',  // Changed from flex to grid for consistency
          gridTemplateColumns: '1fr auto 1fr',  // 3-zone fixed layout
          gap: '16px',
          alignItems: 'center',
          className: 'header-above',
          backgroundColor: builder.above.settings.background,
          padding: builder.above.settings.padding?.desktop || {
            top: '12px',
            bottom: '12px',
            left: '24px',
            right: '24px'
          }
        },
        // Always render all 3 zones (even if empty) to maintain grid structure
        innerBlocks: [
          // Left zone
          {
            id: 'header-above-left',
            type: 'o4o/group',
            data: {
              layout: 'flex',
              gap: '16px',
              alignItems: 'center',
              justifySelf: 'start'
            },
            innerBlocks: aboveModules.left.length > 0 ? aboveModules.left : []
          },
          // Center zone
          {
            id: 'header-above-center',
            type: 'o4o/group',
            data: {
              layout: 'flex',
              gap: '16px',
              alignItems: 'center',
              justifySelf: 'center'
            },
            innerBlocks: aboveModules.center.length > 0 ? aboveModules.center : []
          },
          // Right zone
          {
            id: 'header-above-right',
            type: 'o4o/group',
            data: {
              layout: 'flex',
              gap: '16px',
              alignItems: 'center',
              justifySelf: 'end'
            },
            innerBlocks: aboveModules.right.length > 0 ? aboveModules.right : []
          }
        ]
      });
    }

    // Primary Header Section
    const primaryModules = {
      left: builder.primary.left.map(convertModuleToBlock).filter(Boolean),
      center: builder.primary.center.map(convertModuleToBlock).filter(Boolean),
      right: builder.primary.right.map(convertModuleToBlock).filter(Boolean)
    };

    sections.push({
      id: 'header-primary',
      type: 'o4o/group',
      data: {
        layout: 'grid',  // B-1: Changed from flex to grid
        gridTemplateColumns: '1fr auto 1fr',  // B-1: 3-zone fixed layout
        gap: '16px',
        alignItems: 'center',
        className: 'header-primary',
        backgroundColor: builder.primary.settings.background,
        padding: {
          top: '16px',
          bottom: '16px',
          left: '24px',
          right: '24px'
        }
      },
      // B-2: Always render all 3 zones (even if empty) to maintain grid structure
      innerBlocks: [
        // Left zone: always render (placeholder if empty)
        {
          id: 'header-primary-left',
          type: 'o4o/group',
          data: {
            layout: 'flex',
            gap: '16px',
            alignItems: 'center',
            justifySelf: 'start'  // Grid alignment
          },
          innerBlocks: primaryModules.left.length > 0 ? primaryModules.left : []
        },
        // Center zone: always render (placeholder if empty)
        {
          id: 'header-primary-center',
          type: 'o4o/group',
          data: {
            layout: 'flex',
            gap: '16px',
            alignItems: 'center',
            justifySelf: 'center'  // Grid alignment
          },
          innerBlocks: primaryModules.center.length > 0 ? primaryModules.center : []
        },
        // Right zone: always render (placeholder if empty)
        {
          id: 'header-primary-right',
          type: 'o4o/group',
          data: {
            layout: 'flex',
            gap: '16px',
            alignItems: 'center',
            justifySelf: 'end'  // Grid alignment
          },
          innerBlocks: primaryModules.right.length > 0 ? primaryModules.right : []
        }
      ]
    });

    // Below Header Section
    if (builder.below.settings.enabled) {
      const belowModules = {
        left: builder.below.left.map(convertModuleToBlock).filter(Boolean),
        center: builder.below.center.map(convertModuleToBlock).filter(Boolean),
        right: builder.below.right.map(convertModuleToBlock).filter(Boolean)
      };

      sections.push({
        id: 'header-below',
        type: 'o4o/group',
        data: {
          layout: 'grid',  // Changed from flex to grid for consistency
          gridTemplateColumns: '1fr auto 1fr',  // 3-zone fixed layout
          gap: '16px',
          alignItems: 'center',
          className: 'header-below',
          backgroundColor: builder.below.settings.background,
          padding: builder.below.settings.padding?.desktop || {
            top: '16px',
            bottom: '16px',
            left: '24px',
            right: '24px'
          }
        },
        // Always render all 3 zones (even if empty) to maintain grid structure
        innerBlocks: [
          // Left zone
          {
            id: 'header-below-left',
            type: 'o4o/group',
            data: {
              layout: 'flex',
              gap: '16px',
              alignItems: 'center',
              justifySelf: 'start'
            },
            innerBlocks: belowModules.left.length > 0 ? belowModules.left : []
          },
          // Center zone
          {
            id: 'header-below-center',
            type: 'o4o/group',
            data: {
              layout: 'flex',
              gap: '16px',
              alignItems: 'center',
              justifySelf: 'center'
            },
            innerBlocks: belowModules.center.length > 0 ? belowModules.center : []
          },
          // Right zone
          {
            id: 'header-below-right',
            type: 'o4o/group',
            data: {
              layout: 'flex',
              gap: '16px',
              alignItems: 'center',
              justifySelf: 'end'
            },
            innerBlocks: belowModules.right.length > 0 ? belowModules.right : []
          }
        ]
      });
    }

    return {
      name: 'Default Header',
      slug: 'default-header',
      description: 'Custom header built with Header Builder',
      area: 'header',
      content: sections,
      settings: {
        containerWidth: 'wide',
        backgroundColor: '#ffffff',
        textColor: settings.colors.textColor || '#333333'
      }
    };
  }

  // Fallback to legacy conversion
  return {
    name: 'Default Header',
    slug: 'default-header',
    description: 'Default site header with logo, navigation menu, and search',
    area: 'header',
    content: [
      {
        id: 'header-container',
        type: 'o4o/group',
        data: {
          layout: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          className: 'site-header',
          padding: {
            top: '16px',
            bottom: '16px',
            left: '24px',
            right: '24px'
          }
        },
        innerBlocks: [
          {
            id: 'site-logo',
            type: 'o4o/site-logo',
            data: {
              width: settings.siteIdentity.logo.width.desktop || 120,
              isLink: true,
              linkTarget: '_self',
              logoUrl: settings.siteIdentity.logo.desktop
            }
          },
          {
            id: 'navigation-container',
            type: 'o4o/group',
            data: {
              layout: 'flex',
              flexDirection: 'row',
              gap: '32px',
              alignItems: 'center'
            },
            innerBlocks: [
              {
                id: 'primary-menu',
                type: 'o4o/navigation',
                data: {
                  menuRef: 'primary',
                  orientation: 'horizontal',
                  showSubmenuIcon: true
                }
              },
              {
                id: 'header-search',
                type: 'core/search',
                data: {
                  label: 'Search',
                  showLabel: false,
                  placeholder: 'Search...',
                  buttonPosition: 'button-inside'
                }
              }
            ]
          }
        ]
      }
    ],
    settings: {
      containerWidth: 'wide',
      backgroundColor: settings.header.primary.background || '#ffffff',
      textColor: settings.colors.textColor || '#333333',
      padding: {
        top: '0',
        bottom: '0'
      }
    }
  };
}

/**
 * Convert footer widget to block format
 */
function convertFooterWidgetToBlock(widget: FooterDashboardWidgetConfig): any {
  const widgetMap: Record<FooterWidgetType, any> = {
    'text': {
      type: 'o4o/paragraph',
      data: {
        content: widget.settings.content || '',
        className: widget.settings.customClass
      }
    },
    'menu': {
      type: 'o4o/navigation',
      data: {
        menuRef: widget.settings.menuId || 'footer-menu',
        orientation: 'vertical',
        showSubmenuIcon: false
      }
    },
    'social': {
      type: 'core/social-links',
      data: {
        iconColor: 'foreground',
        iconColorValue: '#ffffff',
        size: 'has-normal-icon-size',
        links: widget.settings.socialLinks || []
      }
    },
    'contact': {
      type: 'o4o/group',
      data: {
        layout: 'flex',
        flexDirection: 'column',
        gap: '8px'
      },
      innerBlocks: [
        widget.settings.address && {
          type: 'o4o/paragraph',
          data: { content: `📍 ${widget.settings.address}` }
        },
        widget.settings.phone && {
          type: 'o4o/paragraph',
          data: { content: `📞 ${widget.settings.phone}` }
        },
        widget.settings.email && {
          type: 'o4o/paragraph',
          data: { content: `✉️ ${widget.settings.email}` }
        }
      ].filter(Boolean)
    },
    'copyright': {
      type: 'o4o/paragraph',
      data: {
        content: widget.settings.copyrightText || '© 2025 Your Company',
        className: 'copyright-text'
      }
    },
    'html': {
      type: 'o4o/html',
      data: {
        content: widget.settings.htmlContent || ''
      }
    },
    'recent-posts': {
      type: 'core/latest-posts',
      data: {
        postsToShow: widget.settings.postCount || 5,
        displayPostDate: widget.settings.showDate || false,
        displayPostExcerpt: widget.settings.showExcerpt || false
      }
    },
    'newsletter': {
      type: 'o4o/group',
      data: {
        layout: 'flex',
        flexDirection: 'row',
        gap: '8px'
      },
      innerBlocks: [
        {
          type: 'core/search',
          data: {
            placeholder: widget.settings.placeholder || 'Enter your email',
            buttonText: widget.settings.buttonText || 'Subscribe'
          }
        }
      ]
    }
  };

  const block = widgetMap[widget.type];
  if (!block) return null;

  // Add title if provided
  if (widget.settings.title && widget.type !== 'copyright') {
    return {
      id: widget.id,
      type: 'o4o/group',
      data: {
        layout: 'flex',
        flexDirection: 'column',
        gap: '16px'
      },
      innerBlocks: [
        {
          type: 'o4o/heading',
          data: {
            level: 3,
            content: widget.settings.title
          }
        },
        block
      ]
    };
  }

  return {
    id: widget.id,
    ...block
  };
}

/**
 * Convert Astra Customizer settings to Footer Template Part format
 */
export function convertSettingsToFooterTemplatePart(
  settings: AstraCustomizerSettings
): TemplatePartData {
  // Use new builder layout if available
  if (settings.footer.builder) {
    const builder = settings.footer.builder;
    const sections = [];

    // Footer Widgets Section
    if (builder.widgets.enabled && builder.widgets.layout.length > 0) {
      const widgetColumns = builder.widgets.layout.map((column, index) => ({
        id: `footer-column-${index}`,
        type: 'o4o/column',
        data: {
          width: `${100 / builder.widgets.columns}%`
        },
        innerBlocks: column.map(convertFooterWidgetToBlock).filter(Boolean)
      }));

      sections.push({
        id: 'footer-widgets',
        type: 'o4o/group',
        data: {
          layout: 'grid',
          gridColumns: builder.widgets.columns,
          gap: builder.widgets.settings.gap || 30,
          className: 'footer-widgets',
          backgroundColor: builder.widgets.settings.background,
          color: builder.widgets.settings.textColor,
          padding: {
            top: `${builder.widgets.settings.padding?.desktop?.top || 40}px`,
            bottom: `${builder.widgets.settings.padding?.desktop?.bottom || 40}px`,
            left: '24px',
            right: '24px'
          }
        },
        innerBlocks: widgetColumns
      });
    }

    // Footer Bar Section
    if (builder.bar.enabled) {
      sections.push({
        id: 'footer-bar',
        type: 'o4o/group',
        data: {
          layout: 'flex',
          flexDirection: 'row',
          justifyContent: builder.bar.settings.alignment || 'space-between',
          alignItems: 'center',
          className: 'footer-bar',
          backgroundColor: builder.bar.settings.background,
          color: builder.bar.settings.textColor,
          padding: {
            top: `${builder.bar.settings.padding?.desktop?.top || 20}px`,
            bottom: `${builder.bar.settings.padding?.desktop?.bottom || 20}px`,
            left: '24px',
            right: '24px'
          }
        },
        innerBlocks: [
          builder.bar.left.length > 0 && {
            id: 'footer-bar-left',
            type: 'o4o/group',
            data: { layout: 'flex', gap: '16px', alignItems: 'center' },
            innerBlocks: builder.bar.left.map(convertFooterWidgetToBlock).filter(Boolean)
          },
          builder.bar.right.length > 0 && {
            id: 'footer-bar-right',
            type: 'o4o/group',
            data: { layout: 'flex', gap: '16px', alignItems: 'center' },
            innerBlocks: builder.bar.right.map(convertFooterWidgetToBlock).filter(Boolean)
          }
        ].filter(Boolean)
      });
    }

    return {
      name: 'Default Footer',
      slug: 'default-footer',
      description: 'Custom footer built with Footer Builder',
      area: 'footer',
      content: sections,
      settings: {
        containerWidth: 'wide',
        backgroundColor: builder.widgets.settings.background || '#333333',
        textColor: builder.widgets.settings.textColor || '#ffffff'
      }
    };
  }

  // Fallback to legacy conversion
  return {
    name: 'Default Footer',
    slug: 'default-footer',
    description: 'Default site footer with company info, links, and social media',
    area: 'footer',
    content: [
      {
        id: 'footer-container',
        type: 'o4o/group',
        data: {
          layout: 'flex',
          flexDirection: 'column',
          gap: '32px',
          className: 'site-footer',
          padding: {
            top: '48px',
            bottom: '48px',
            left: '24px',
            right: '24px'
          }
        },
        innerBlocks: [
          {
            id: 'footer-content',
            type: 'o4o/group',
            data: {
              layout: 'grid',
              gap: '32px',
              gridColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
            },
            innerBlocks: []
          },
          {
            id: 'footer-bottom',
            type: 'o4o/group',
            data: {
              layout: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e5e5e5',
              paddingTop: '24px'
            },
            innerBlocks: [
              {
                id: 'copyright',
                type: 'o4o/paragraph',
                data: {
                  content: settings.footer.bottomBar.section1 || '© 2025 O4O Platform. All rights reserved.'
                }
              }
            ]
          }
        ]
      }
    ],
    settings: {
      containerWidth: 'wide',
      backgroundColor: settings.footer.widgets.background || '#333333',
      textColor: settings.footer.widgets.textColor || '#ffffff'
    }
  };
}
