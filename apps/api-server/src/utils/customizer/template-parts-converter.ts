/**
 * Convert Astra Customizer Settings to Template Parts
 * This module converts header/footer builder configurations into template parts
 * that can be rendered on the frontend.
 */

import logger from '../logger.js';

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
  isDefault?: boolean;
  isActive?: boolean;
  priority?: number;
}

/**
 * Convert module config to block format
 */
function convertModuleToBlock(module: any): any {
  logger.info(`[TP-Convert] Processing module: ${module.type} (id: ${module.id})`);

  const blockMap: Record<string, any> = {
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
      type: 'core/navigation',
      data: {
        ref: 'primary',
        orientation: 'horizontal',
        ...module.settings
      }
    },
    'secondary-menu': {
      type: 'core/navigation',
      data: {
        ref: 'secondary',
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
        text: module.settings?.text || 'Click Here',
        url: module.settings?.url || '#',
        ...module.settings
      }
    },
    'html': {
      type: 'o4o/html',
      data: {
        content: module.settings?.content || '',
        ...module.settings
      }
    },
    'widget': {
      type: 'core/widget-area',
      data: {
        widgetAreaId: module.settings?.widgetAreaId || 'header-widget',
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
  if (!block) {
    logger.warn(`[TP-Convert] Unknown module type: ${module.type} - skipping`);
    return null;
  }

  logger.info(`[TP-Convert] ✓ Converted ${module.type} -> ${block.type}`);

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
  settings: any
): TemplatePartData {
  logger.info('[TP-Convert] Starting header template part conversion...');

  // Use new builder layout if available
  if (settings.header?.builder) {
    const builder = settings.header.builder;
    const sections = [];

    logger.info('[TP-Convert] Header builder configuration found');

    // Above Header Section
    if (builder.above?.settings?.enabled) {
      const aboveModules = [
        ...(builder.above.left || []).map(convertModuleToBlock),
        ...(builder.above.center || []).map(convertModuleToBlock),
        ...(builder.above.right || []).map(convertModuleToBlock)
      ].filter(Boolean);

      if (aboveModules.length > 0) {
        sections.push({
          id: 'header-above',
          type: 'o4o/group',
          data: {
            layout: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            className: 'header-above',
            backgroundColor: builder.above.settings.background,
            padding: builder.above.settings.padding?.desktop
          },
          innerBlocks: aboveModules
        });
      }
    }

    // Primary Header Section
    logger.info(`[TP-Convert] Processing primary header section...`);
    logger.info(`[TP-Convert] Primary left modules: ${(builder.primary?.left || []).length}`);
    logger.info(`[TP-Convert] Primary center modules: ${(builder.primary?.center || []).length}`);
    logger.info(`[TP-Convert] Primary right modules: ${(builder.primary?.right || []).length}`);

    const primaryModules = {
      left: (builder.primary?.left || []).map(convertModuleToBlock).filter(Boolean),
      center: (builder.primary?.center || []).map(convertModuleToBlock).filter(Boolean),
      right: (builder.primary?.right || []).map(convertModuleToBlock).filter(Boolean)
    };

    sections.push({
      id: 'header-primary',
      type: 'o4o/group',
      data: {
        layout: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        className: 'header-primary',
        backgroundColor: builder.primary?.settings?.background,
        padding: {
          top: '16px',
          bottom: '16px',
          left: '24px',
          right: '24px'
        }
      },
      innerBlocks: [
        primaryModules.left.length > 0 && {
          id: 'header-primary-left',
          type: 'o4o/group',
          data: { layout: 'flex', gap: '16px', alignItems: 'center' },
          innerBlocks: primaryModules.left
        },
        primaryModules.center.length > 0 && {
          id: 'header-primary-center',
          type: 'o4o/group',
          data: { layout: 'flex', gap: '16px', alignItems: 'center' },
          innerBlocks: primaryModules.center
        },
        primaryModules.right.length > 0 && {
          id: 'header-primary-right',
          type: 'o4o/group',
          data: { layout: 'flex', gap: '16px', alignItems: 'center' },
          innerBlocks: primaryModules.right
        }
      ].filter(Boolean)
    });

    // Below Header Section
    if (builder.below?.settings?.enabled) {
      const belowModules = [
        ...(builder.below.left || []).map(convertModuleToBlock),
        ...(builder.below.center || []).map(convertModuleToBlock),
        ...(builder.below.right || []).map(convertModuleToBlock)
      ].filter(Boolean);

      if (belowModules.length > 0) {
        sections.push({
          id: 'header-below',
          type: 'o4o/group',
          data: {
            layout: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            className: 'header-below',
            backgroundColor: builder.below.settings.background,
            padding: builder.below.settings.padding?.desktop
          },
          innerBlocks: belowModules
        });
      }
    }

    // Count all converted blocks
    const allBlocks: string[] = [];
    sections.forEach((section: any) => {
      if (section.innerBlocks) {
        section.innerBlocks.forEach((group: any) => {
          if (group?.innerBlocks) {
            group.innerBlocks.forEach((block: any) => {
              if (block?.type) allBlocks.push(block.type);
            });
          }
        });
      }
    });

    logger.info(`[TP-Convert] ✅ Header conversion complete - ${sections.length} sections, ${allBlocks.length} blocks total`);
    logger.info(`[TP-Convert] Block types created: ${[...new Set(allBlocks)].join(', ')}`);

    return {
      name: 'Default Header',
      slug: 'default-header',
      description: 'Custom header built with Header Builder',
      area: 'header',
      content: sections,
      settings: {
        containerWidth: 'wide',
        backgroundColor: '#ffffff',
        textColor: settings.colors?.textColor || '#333333'
      },
      isDefault: true,
      isActive: true,
      priority: 10
    };
  }

  // Fallback if no builder configuration
  logger.warn('[TP-Convert] No header builder configuration found - using fallback');
  return {
    name: 'Default Header',
    slug: 'default-header',
    description: 'Default site header',
    area: 'header',
    content: [],
    settings: {
      containerWidth: 'wide',
      backgroundColor: '#ffffff',
      textColor: '#333333'
    },
    isDefault: true,
    isActive: true,
    priority: 10
  };
}

/**
 * Convert Astra Customizer settings to Footer Template Part format
 */
export function convertSettingsToFooterTemplatePart(
  settings: any
): TemplatePartData {
  // Similar logic for footer, can be expanded later
  return {
    name: 'Default Footer',
    slug: 'default-footer',
    description: 'Default site footer',
    area: 'footer',
    content: [],
    settings: {
      containerWidth: 'wide',
      backgroundColor: '#333333',
      textColor: '#ffffff'
    },
    isDefault: true,
    isActive: true,
    priority: 10
  };
}
