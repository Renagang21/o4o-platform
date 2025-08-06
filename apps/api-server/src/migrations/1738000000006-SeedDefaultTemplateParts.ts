import { MigrationInterface, QueryRunner } from 'typeorm'
import { TemplatePart } from '../entities/TemplatePart'

export class SeedDefaultTemplateParts1738000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const templatePartRepository = queryRunner.manager.getRepository(TemplatePart)

    // Default Header
    const defaultHeader = templatePartRepository.create({
      name: 'Default Header',
      slug: 'default-header',
      description: 'Default site header with logo, navigation menu, and search',
      area: 'header',
      isActive: true,
      isDefault: true,
      priority: 0,
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
                width: 120,
                isLink: true,
                linkTarget: '_self'
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
                    ref: 'primary-menu', // References menu system
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
        backgroundColor: '#ffffff',
        textColor: '#333333',
        padding: {
          top: '0',
          bottom: '0'
        }
      }
    })

    // Default Footer
    const defaultFooter = templatePartRepository.create({
      name: 'Default Footer',
      slug: 'default-footer',
      description: 'Default site footer with company info, links, and social media',
      area: 'footer',
      isActive: true,
      isDefault: true,
      priority: 0,
      content: [
        {
          id: 'footer-container',
          type: 'o4o/group',
          data: {
            layout: 'default',
            backgroundColor: '#1a1a1a',
            textColor: '#ffffff',
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
              id: 'footer-columns',
              type: 'o4o/columns',
              data: {
                columns: 4,
                gap: '32px'
              },
              innerBlocks: [
                {
                  id: 'footer-col-1',
                  type: 'o4o/column',
                  data: { width: '25%' },
                  innerBlocks: [
                    {
                      id: 'site-title',
                      type: 'core/site-title',
                      data: {
                        level: 3,
                        isLink: false
                      }
                    },
                    {
                      id: 'site-tagline',
                      type: 'core/site-tagline',
                      data: {
                        textColor: '#cccccc'
                      }
                    }
                  ]
                },
                {
                  id: 'footer-col-2',
                  type: 'o4o/column',
                  data: { width: '25%' },
                  innerBlocks: [
                    {
                      id: 'footer-heading-1',
                      type: 'core/heading',
                      data: {
                        content: '회사',
                        level: 4
                      }
                    },
                    {
                      id: 'footer-menu-1',
                      type: 'core/navigation',
                      data: {
                        ref: 'footer-company-menu',
                        orientation: 'vertical',
                        showSubmenuIcon: false
                      }
                    }
                  ]
                },
                {
                  id: 'footer-col-3',
                  type: 'o4o/column',
                  data: { width: '25%' },
                  innerBlocks: [
                    {
                      id: 'footer-heading-2',
                      type: 'core/heading',
                      data: {
                        content: '고객지원',
                        level: 4
                      }
                    },
                    {
                      id: 'footer-menu-2',
                      type: 'core/navigation',
                      data: {
                        ref: 'footer-support-menu',
                        orientation: 'vertical',
                        showSubmenuIcon: false
                      }
                    }
                  ]
                },
                {
                  id: 'footer-col-4',
                  type: 'o4o/column',
                  data: { width: '25%' },
                  innerBlocks: [
                    {
                      id: 'footer-heading-3',
                      type: 'core/heading',
                      data: {
                        content: '법적 고지',
                        level: 4
                      }
                    },
                    {
                      id: 'footer-menu-3',
                      type: 'core/navigation',
                      data: {
                        ref: 'footer-legal-menu',
                        orientation: 'vertical',
                        showSubmenuIcon: false
                      }
                    }
                  ]
                }
              ]
            },
            {
              id: 'footer-bottom',
              type: 'o4o/group',
              data: {
                layout: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                marginTop: '48px',
                paddingTop: '32px',
                borderTop: '1px solid #333333'
              },
              innerBlocks: [
                {
                  id: 'social-links',
                  type: 'core/social-links',
                  data: {
                    iconColor: '#cccccc',
                    iconColorValue: '#cccccc',
                    size: 'has-normal-icon-size'
                  }
                },
                {
                  id: 'copyright',
                  type: 'core/paragraph',
                  data: {
                    content: `© ${new Date().getFullYear()} O4O Platform. All rights reserved.`,
                    align: 'center',
                    textColor: '#999999'
                  }
                }
              ]
            }
          ]
        }
      ],
      settings: {
        containerWidth: 'wide',
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff'
      }
    })

    // Simple Header Alternative
    const simpleHeader = templatePartRepository.create({
      name: 'Simple Header',
      slug: 'simple-header',
      description: 'Minimalist header with centered logo and menu',
      area: 'header',
      isActive: true,
      isDefault: false,
      priority: 1,
      content: [
        {
          id: 'header-container',
          type: 'o4o/group',
          data: {
            layout: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: {
              top: '24px',
              bottom: '24px'
            }
          },
          innerBlocks: [
            {
              id: 'site-logo',
              type: 'core/site-logo',
              data: {
                width: 150,
                isLink: true
              }
            },
            {
              id: 'primary-menu',
              type: 'core/navigation',
              data: {
                ref: 'primary-menu',
                orientation: 'horizontal'
              }
            }
          ]
        }
      ],
      settings: {
        containerWidth: 'narrow',
        backgroundColor: '#ffffff'
      }
    })

    // Save all template parts
    await templatePartRepository.save([defaultHeader, defaultFooter, simpleHeader])
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM template_parts WHERE slug IN ('default-header', 'default-footer', 'simple-header')`)
  }
}