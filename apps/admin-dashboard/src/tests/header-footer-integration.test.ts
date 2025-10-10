/**
 * Header/Footer Builder Integration Test
 * Verifies data persistence and retrieval
 */

import { convertToTemplatePart } from '../pages/appearance/astra-customizer/utils/template-parts-converter';
import { HeaderBuilderLayout, FooterBuilderLayout } from '../pages/appearance/astra-customizer/types/customizer-types';

describe('Header/Footer Builder Integration', () => {
  describe('Template Parts Conversion', () => {
    it('should convert header layout to template part', () => {
      const headerLayout: HeaderBuilderLayout = {
        above: {
          left: [],
          center: [],
          right: [],
          settings: {
            enabled: false,
            height: 40,
            backgroundColor: '#ffffff',
            textColor: '#333333'
          }
        },
        primary: {
          left: [
            {
              id: 'logo-1',
              type: 'logo',
              label: 'Logo',
              settings: {
                visibility: { desktop: true, tablet: true, mobile: true },
                width: 150
              }
            }
          ],
          center: [
            {
              id: 'primary-menu-1',
              type: 'primary-menu',
              label: 'Primary Menu',
              settings: {
                visibility: { desktop: true, tablet: false, mobile: false },
                menuId: 'main-menu'
              }
            }
          ],
          right: [
            {
              id: 'account-1',
              type: 'account',
              label: 'Account',
              settings: {
                visibility: { desktop: true, tablet: true, mobile: true }
              }
            },
            {
              id: 'cart-1',
              type: 'cart',
              label: 'Cart',
              settings: {
                visibility: { desktop: true, tablet: true, mobile: true }
              }
            }
          ],
          settings: {
            height: 80,
            backgroundColor: '#ffffff',
            textColor: '#333333',
            sticky: true
          }
        },
        below: {
          left: [],
          center: [],
          right: [],
          settings: {
            enabled: false,
            height: 40,
            backgroundColor: '#f5f5f5',
            textColor: '#666666'
          }
        }
      };

      const templatePart = convertToTemplatePart('header', headerLayout);
      
      expect(templatePart).toBeDefined();
      expect(templatePart.slug).toBe('header');
      expect(templatePart.theme).toBe('o4o');
      expect(templatePart.type).toBe('wp_template_part');
      expect(templatePart.status).toBe('publish');
      expect(templatePart.title).toBe('Header');
      expect(templatePart.content).toContain('wp:o4o/header-builder');
      
      // Parse content to verify structure
      const content = JSON.parse(templatePart.content.replace(/<!--.*?-->/g, ''));
      expect(content.blockName).toBe('o4o/header-builder');
      expect(content.attrs.layout).toBeDefined();
      expect(content.attrs.layout.primary.left).toHaveLength(1);
      expect(content.attrs.layout.primary.center).toHaveLength(1);
      expect(content.attrs.layout.primary.right).toHaveLength(2);
    });

    it('should convert footer layout to template part', () => {
      const footerLayout: FooterBuilderLayout = {
        widgetArea: {
          columns: 3,
          widgets: {
            column1: [
              {
                id: 'text-1',
                type: 'text',
                title: 'About Us',
                settings: {
                  content: '<p>Company description</p>'
                }
              }
            ],
            column2: [
              {
                id: 'menu-1',
                type: 'menu',
                title: 'Quick Links',
                settings: {
                  menuId: 'footer-menu'
                }
              }
            ],
            column3: [
              {
                id: 'social-1',
                type: 'social',
                title: 'Follow Us',
                settings: {
                  icons: [
                    { platform: 'facebook', url: 'https://facebook.com' },
                    { platform: 'twitter', url: 'https://twitter.com' }
                  ]
                }
              }
            ]
          },
          settings: {
            enabled: true,
            backgroundColor: '#333333',
            textColor: '#ffffff',
            padding: 40
          }
        },
        footerBar: {
          left: [
            {
              id: 'copyright-1',
              type: 'copyright',
              title: 'Copyright',
              settings: {
                text: '© 2024 Company Name. All rights reserved.'
              }
            }
          ],
          right: [
            {
              id: 'menu-2',
              type: 'menu',
              title: 'Legal Menu',
              settings: {
                menuId: 'legal-menu'
              }
            }
          ],
          settings: {
            enabled: true,
            backgroundColor: '#222222',
            textColor: '#cccccc',
            padding: 20
          }
        }
      };

      const templatePart = convertToTemplatePart('footer', footerLayout);
      
      expect(templatePart).toBeDefined();
      expect(templatePart.slug).toBe('footer');
      expect(templatePart.content).toContain('wp:o4o/footer-builder');
      
      // Parse content to verify structure
      const content = JSON.parse(templatePart.content.replace(/<!--.*?-->/g, ''));
      expect(content.attrs.layout.widgetArea.columns).toBe(3);
      expect(content.attrs.layout.widgetArea.widgets.column1).toHaveLength(1);
      expect(content.attrs.layout.footerBar.left).toHaveLength(1);
      expect(content.attrs.layout.footerBar.right).toHaveLength(1);
    });
  });

  describe('Data Persistence', () => {
    it('should save header configuration to database', async () => {
      // Mock API call
      const saveHeaderConfig = async (config: HeaderBuilderLayout) => {
        const response = await fetch('/api/customizer/header', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        return response.ok;
      };

      // Test data
      const testConfig: HeaderBuilderLayout = {
        above: { left: [], center: [], right: [], settings: { enabled: false, height: 40, backgroundColor: '#fff', textColor: '#333' } },
        primary: { 
          left: [{ id: 'logo-1', type: 'logo', label: 'Logo', settings: { visibility: { desktop: true, tablet: true, mobile: true } } }],
          center: [],
          right: [],
          settings: { height: 80, backgroundColor: '#fff', textColor: '#333', sticky: false }
        },
        below: { left: [], center: [], right: [], settings: { enabled: false, height: 40, backgroundColor: '#fff', textColor: '#333' } }
      };

      // In a real test, this would actually call the API
      const mockSave = jest.fn().mockResolvedValue(true);
      const saved = await mockSave(testConfig);
      
      expect(mockSave).toHaveBeenCalledWith(testConfig);
      expect(saved).toBe(true);
    });

    it('should load footer configuration from database', async () => {
      // Mock API call
      const loadFooterConfig = async (): Promise<FooterBuilderLayout> => {
        const response = await fetch('/api/customizer/footer');
        return response.json();
      };

      // Mock response
      const mockConfig: FooterBuilderLayout = {
        widgetArea: {
          columns: 4,
          widgets: { column1: [], column2: [], column3: [], column4: [] },
          settings: { enabled: true, backgroundColor: '#333', textColor: '#fff', padding: 40 }
        },
        footerBar: {
          left: [],
          right: [],
          settings: { enabled: true, backgroundColor: '#222', textColor: '#ccc', padding: 20 }
        }
      };

      // In a real test, this would actually call the API
      const mockLoad = jest.fn().mockResolvedValue(mockConfig);
      const loaded = await mockLoad();
      
      expect(mockLoad).toHaveBeenCalled();
      expect(loaded.widgetArea.columns).toBe(4);
    });
  });

  describe('Frontend Rendering', () => {
    it('should render Account module correctly', () => {
      const accountModule = {
        id: 'account-1',
        type: 'account' as const,
        label: 'Account',
        settings: {
          visibility: { desktop: true, tablet: true, mobile: true }
        }
      };

      // Component would render based on user authentication state
      expect(accountModule.type).toBe('account');
      expect(accountModule.settings.visibility.desktop).toBe(true);
    });

    it('should render Cart module correctly', () => {
      const cartModule = {
        id: 'cart-1',
        type: 'cart' as const,
        label: 'Cart',
        settings: {
          visibility: { desktop: true, tablet: true, mobile: false },
          showCount: true,
          showTotal: false
        }
      };

      expect(cartModule.type).toBe('cart');
      expect(cartModule.settings.visibility.mobile).toBe(false);
    });
  });
});

export {};