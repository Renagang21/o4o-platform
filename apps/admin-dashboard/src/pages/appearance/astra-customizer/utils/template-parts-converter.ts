import { AstraCustomizerSettings } from '../types/customizer-types';

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
 * Convert Astra Customizer settings to Header Template Part format
 */
export function convertSettingsToHeaderTemplatePart(
  settings: AstraCustomizerSettings
): TemplatePartData {
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
            type: 'core/site-logo',
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
                type: 'core/navigation',
                data: {
                  menuRef: 'primary-menu',
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
 * Convert Astra Customizer settings to Footer Template Part format
 */
export function convertSettingsToFooterTemplatePart(
  settings: AstraCustomizerSettings
): TemplatePartData {
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
                type: 'core/paragraph',
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
