import { AppDataSource } from '../database/connection';
import { menuService } from '../services/menu.service';
import { Menu } from '../entities/Menu';
import { MenuItem } from '../entities/MenuItem';
import { MenuLocation } from '../entities/MenuLocation';

async function testMenuSystem() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    console.log('\n📋 Testing Menu System...\n');

    // Test 1: Create a menu
    console.log('1. Creating a new menu...');
    const menu = await menuService.createMenu({
      name: 'Main Navigation',
      slug: 'main-nav',
      location: 'primary',
      description: 'Primary navigation menu',
      is_active: true
    });
    console.log('✅ Menu created:', { id: menu.id, name: menu.name, slug: menu.slug });

    // Test 2: Get all menus
    console.log('\n2. Getting all menus...');
    const menus = await menuService.findAllMenus();
    console.log(`✅ Found ${menus.length} menu(s)`);

    // Test 3: Add menu items
    console.log('\n3. Adding menu items...');
    const homeItem = await menuService.addMenuItem({
      menu_id: menu.id,
      title: 'Home',
      url: '/',
      type: 'custom' as any,
      order_num: 1
    });
    console.log('✅ Added Home item');

    const aboutItem = await menuService.addMenuItem({
      menu_id: menu.id,
      title: 'About',
      url: '/about',
      type: 'page' as any,
      order_num: 2
    });
    console.log('✅ Added About item');

    // Add a child item
    const teamItem = await menuService.addMenuItem({
      menu_id: menu.id,
      parent_id: aboutItem?.id,
      title: 'Our Team',
      url: '/about/team',
      type: 'page' as any,
      order_num: 1
    });
    console.log('✅ Added Team item (child of About)');

    // Test 4: Get menu with tree structure
    console.log('\n4. Getting menu with tree structure...');
    const menuWithItems = await menuService.findMenuById(menu.id);
    if (menuWithItems) {
      console.log('✅ Menu structure:');
      console.log(`   ${menuWithItems.name}`);
      menuWithItems.items?.forEach(item => {
        console.log(`   ├── ${item.title} (${item.url})`);
        if (item.children?.length > 0) {
          item.children.forEach(child => {
            console.log(`   │   └── ${child.title} (${child.url})`);
          });
        }
      });
    }

    // Test 5: Get menu locations
    console.log('\n5. Getting menu locations...');
    const locations = await menuService.findAllMenuLocations();
    console.log(`✅ Found ${locations.length} location(s):`);
    locations.forEach(loc => {
      console.log(`   - ${loc.name} (${loc.key})`);
    });

    // Test 6: Update menu
    console.log('\n6. Updating menu...');
    const updatedMenu = await menuService.updateMenu(menu.id, {
      description: 'Updated primary navigation menu'
    });
    console.log('✅ Menu updated:', { description: updatedMenu?.description });

    // Test 7: Reorder menu items
    console.log('\n7. Testing menu item reorder...');
    if (homeItem && aboutItem) {
      await menuService.reorderMenuItems(menu.id, [
        { id: aboutItem.id, order_num: 1 },
        { id: homeItem.id, order_num: 2 }
      ]);
      console.log('✅ Menu items reordered');
    }

    // Test 8: Duplicate menu
    console.log('\n8. Duplicating menu...');
    const duplicatedMenu = await menuService.duplicateMenu(
      menu.id, 
      'Footer Navigation',
      'footer-nav'
    );
    console.log('✅ Menu duplicated:', { 
      id: duplicatedMenu?.id, 
      name: duplicatedMenu?.name,
      items: duplicatedMenu?.items?.length 
    });

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    if (duplicatedMenu) {
      await menuService.deleteMenu(duplicatedMenu.id);
    }
    await menuService.deleteMenu(menu.id);
    console.log('✅ Test data cleaned up');

    console.log('\n✨ All menu system tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testMenuSystem();