import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Seed App-Specific Headers
 *
 * Seeds template parts for main site, shop, and funding headers.
 * Uses raw SQL to avoid entity import dependencies in production Docker build.
 */
export class SeedAppSpecificHeaders1825000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. header-main: Main Site Header (Default)
    // ============================================
    const headerMainContent = JSON.stringify([
      {
        id: 'main-header-container',
        type: 'o4o/group',
        data: {
          layout: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          className: 'main-site-header',
          padding: { top: '16px', bottom: '16px', left: '24px', right: '24px' }
        },
        innerBlocks: [
          { id: 'main-site-logo', type: 'core/site-logo', data: { width: 120, isLink: true, linkTarget: '_self' } },
          {
            id: 'main-nav-group',
            type: 'o4o/group',
            data: { layout: 'flex', flexDirection: 'row', gap: '32px', alignItems: 'center' },
            innerBlocks: [
              { id: 'main-navigation', type: 'core/navigation', data: { menuLocation: 'primary', orientation: 'horizontal', showSubmenuIcon: true } },
              { id: 'main-account-menu', type: 'o4o/account-menu', data: {} }
            ]
          }
        ]
      }
    ]);
    const headerMainSettings = JSON.stringify({ containerWidth: 'wide', backgroundColor: '#ffffff', textColor: '#333333', padding: { top: '0', bottom: '0' } });

    // ============================================
    // 2. header-shop: Shopping Mall Header
    // ============================================
    const headerShopContent = JSON.stringify([
      {
        id: 'shop-header-container',
        type: 'o4o/group',
        data: {
          layout: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          className: 'shop-header',
          padding: { top: '16px', bottom: '16px', left: '24px', right: '24px' }
        },
        innerBlocks: [
          { id: 'shop-logo', type: 'core/site-logo', data: { width: 120, isLink: true, linkTarget: '_self' } },
          {
            id: 'shop-nav-group',
            type: 'o4o/group',
            data: { layout: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'center' },
            innerBlocks: [
              { id: 'shop-categories', type: 'core/navigation', data: { menuLocation: 'shop-categories', orientation: 'horizontal', showSubmenuIcon: true } },
              { id: 'shop-search', type: 'core/search', data: { label: 'Search', showLabel: false, placeholder: 'Search products...', buttonPosition: 'button-inside' } },
              { id: 'shop-cart', type: 'o4o/cart-icon', data: {} },
              { id: 'shop-account', type: 'o4o/account-menu', data: {} }
            ]
          }
        ]
      }
    ]);
    const headerShopSettings = JSON.stringify({ containerWidth: 'wide', backgroundColor: '#ffffff', textColor: '#333333', padding: { top: '0', bottom: '0' } });
    const headerShopConditions = JSON.stringify({ path_prefix: '/shop/' });

    // ============================================
    // 3. header-funding: Crowdfunding Header
    // ============================================
    const headerFundingContent = JSON.stringify([
      {
        id: 'funding-header-container',
        type: 'o4o/group',
        data: {
          layout: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          className: 'funding-header',
          padding: { top: '16px', bottom: '16px', left: '24px', right: '24px' }
        },
        innerBlocks: [
          { id: 'funding-logo', type: 'core/site-logo', data: { width: 120, isLink: true, linkTarget: '_self' } },
          {
            id: 'funding-nav-group',
            type: 'o4o/group',
            data: { layout: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'center' },
            innerBlocks: [
              { id: 'funding-categories', type: 'core/navigation', data: { menuLocation: 'funding-categories', orientation: 'horizontal', showSubmenuIcon: true } },
              { id: 'my-funding-button', type: 'o4o/button', data: { text: '내 펀딩', href: '/funding/my', variant: 'outline', size: 'medium' } },
              { id: 'funding-account', type: 'o4o/account-menu', data: {} }
            ]
          }
        ]
      }
    ]);
    const headerFundingSettings = JSON.stringify({ containerWidth: 'wide', backgroundColor: '#ffffff', textColor: '#333333', padding: { top: '0', bottom: '0' } });
    const headerFundingConditions = JSON.stringify({ path_prefix: '/funding/' });

    // Insert all template parts using raw SQL
    await queryRunner.query(`
      INSERT INTO template_parts (name, slug, description, area, "isActive", "isDefault", priority, conditions, content, settings, "createdAt", "updatedAt")
      VALUES
        ('Main Site Header', 'header-main', 'Main site header with logo, primary navigation, and account menu', 'header', true, true, 0, '{}', $1, $2, NOW(), NOW()),
        ('Shop Header', 'header-shop', 'Shopping mall header with categories, search, cart, and account', 'header', true, false, 100, $3, $4, $5, NOW(), NOW()),
        ('Funding Header', 'header-funding', 'Crowdfunding header with categories, my funding button, and account', 'header', true, false, 90, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (slug) DO NOTHING
    `, [headerMainContent, headerMainSettings, headerShopConditions, headerShopContent, headerShopSettings, headerFundingConditions, headerFundingContent, headerFundingSettings]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM template_parts WHERE slug IN ('header-main', 'header-shop', 'header-funding')`
    );
  }
}
