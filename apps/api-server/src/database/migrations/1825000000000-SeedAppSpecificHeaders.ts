import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplatePart } from '../../entities/TemplatePart';

export class SeedAppSpecificHeaders1825000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const templatePartRepository = queryRunner.manager.getRepository(TemplatePart);

    // ============================================
    // 1. header-main: Main Site Header (Default)
    // ============================================
    const headerMain = templatePartRepository.create({
      name: 'Main Site Header',
      slug: 'header-main',
      description: 'Main site header with logo, primary navigation, and account menu',
      area: 'header',
      isActive: true,
      isDefault: true,
      priority: 0, // Fallback (lowest priority)
      conditions: {}, // No conditions = matches everywhere
      content: [
        {
          id: 'main-header-container',
          type: 'o4o/group',
          data: {
            layout: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            className: 'main-site-header',
            padding: {
              top: '16px',
              bottom: '16px',
              left: '24px',
              right: '24px'
            }
          },
          innerBlocks: [
            {
              id: 'main-site-logo',
              type: 'core/site-logo',
              data: {
                width: 120,
                isLink: true,
                linkTarget: '_self'
              }
            },
            {
              id: 'main-nav-group',
              type: 'o4o/group',
              data: {
                layout: 'flex',
                flexDirection: 'row',
                gap: '32px',
                alignItems: 'center'
              },
              innerBlocks: [
                {
                  id: 'main-navigation',
                  type: 'core/navigation',
                  data: {
                    menuLocation: 'primary',
                    orientation: 'horizontal',
                    showSubmenuIcon: true
                  }
                },
                {
                  id: 'main-account-menu',
                  type: 'o4o/account-menu',
                  data: {}
                }
              ]
            }
          ]
        }
      ],
      settings: {
        containerWidth: 'wide',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        padding: {
          top: '0',
          bottom: '0'
        }
      }
    });

    // ============================================
    // 2. header-shop: Shopping Mall Header
    // ============================================
    const headerShop = templatePartRepository.create({
      name: 'Shop Header',
      slug: 'header-shop',
      description: 'Shopping mall header with categories, search, cart, and account',
      area: 'header',
      isActive: true,
      isDefault: false,
      priority: 100, // High priority
      conditions: {
        path_prefix: '/shop/'
      },
      content: [
        {
          id: 'shop-header-container',
          type: 'o4o/group',
          data: {
            layout: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            className: 'shop-header',
            padding: {
              top: '16px',
              bottom: '16px',
              left: '24px',
              right: '24px'
            }
          },
          innerBlocks: [
            {
              id: 'shop-logo',
              type: 'core/site-logo',
              data: {
                width: 120,
                isLink: true,
                linkTarget: '_self'
              }
            },
            {
              id: 'shop-nav-group',
              type: 'o4o/group',
              data: {
                layout: 'flex',
                flexDirection: 'row',
                gap: '24px',
                alignItems: 'center'
              },
              innerBlocks: [
                {
                  id: 'shop-categories',
                  type: 'core/navigation',
                  data: {
                    menuLocation: 'shop-categories',
                    orientation: 'horizontal',
                    showSubmenuIcon: true
                  }
                },
                {
                  id: 'shop-search',
                  type: 'core/search',
                  data: {
                    label: 'Search',
                    showLabel: false,
                    placeholder: 'Search products...',
                    buttonPosition: 'button-inside'
                  }
                },
                {
                  id: 'shop-cart',
                  type: 'o4o/cart-icon',
                  data: {}
                },
                {
                  id: 'shop-account',
                  type: 'o4o/account-menu',
                  data: {}
                }
              ]
            }
          ]
        }
      ],
      settings: {
        containerWidth: 'wide',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        padding: {
          top: '0',
          bottom: '0'
        }
      }
    });

    // ============================================
    // 3. header-funding: Crowdfunding Header
    // ============================================
    const headerFunding = templatePartRepository.create({
      name: 'Funding Header',
      slug: 'header-funding',
      description: 'Crowdfunding header with categories, my funding button, and account',
      area: 'header',
      isActive: true,
      isDefault: false,
      priority: 90,
      conditions: {
        path_prefix: '/funding/'
      },
      content: [
        {
          id: 'funding-header-container',
          type: 'o4o/group',
          data: {
            layout: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            className: 'funding-header',
            padding: {
              top: '16px',
              bottom: '16px',
              left: '24px',
              right: '24px'
            }
          },
          innerBlocks: [
            {
              id: 'funding-logo',
              type: 'core/site-logo',
              data: {
                width: 120,
                isLink: true,
                linkTarget: '_self'
              }
            },
            {
              id: 'funding-nav-group',
              type: 'o4o/group',
              data: {
                layout: 'flex',
                flexDirection: 'row',
                gap: '24px',
                alignItems: 'center'
              },
              innerBlocks: [
                {
                  id: 'funding-categories',
                  type: 'core/navigation',
                  data: {
                    menuLocation: 'funding-categories',
                    orientation: 'horizontal',
                    showSubmenuIcon: true
                  }
                },
                {
                  id: 'my-funding-button',
                  type: 'o4o/button',
                  data: {
                    text: '내 펀딩',
                    href: '/funding/my',
                    variant: 'outline',
                    size: 'medium'
                  }
                },
                {
                  id: 'funding-account',
                  type: 'o4o/account-menu',
                  data: {}
                }
              ]
            }
          ]
        }
      ],
      settings: {
        containerWidth: 'wide',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        padding: {
          top: '0',
          bottom: '0'
        }
      }
    });

    // Save all template parts
    await templatePartRepository.save([headerMain, headerShop, headerFunding]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM template_parts WHERE slug IN ('header-main', 'header-shop', 'header-funding')`
    );
  }
}
